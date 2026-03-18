using System.Collections.Concurrent;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

namespace Sts2StateExport;

public sealed class AgentIpcServer : IDisposable
{
    private readonly MegaCrit.Sts2.Core.Logging.Logger _logger;
    private readonly object _clientsLock = new();
    private readonly object _snapshotLock = new();
    private readonly ConcurrentQueue<ExportCommand> _pendingCommands = new();
    private readonly List<ClientConnection> _clients = [];
    private int _pendingSnapshotRequests;

    private Socket? _listener;
    private CancellationTokenSource? _lifecycleCts;
    private ExportState? _latestState;
    private ExportCommandAck? _latestAck;

    public AgentIpcServer(MegaCrit.Sts2.Core.Logging.Logger logger)
    {
        _logger = logger;
    }

    public void Start()
    {
        Directory.CreateDirectory(AgentPaths.IpcDir);

        if (File.Exists(AgentPaths.SocketPath))
        {
            File.Delete(AgentPaths.SocketPath);
        }

        _lifecycleCts = new CancellationTokenSource();
        _listener = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
        _listener.Bind(new UnixDomainSocketEndPoint(AgentPaths.SocketPath));
        _listener.Listen(8);

        _ = AcceptLoopAsync(_lifecycleCts.Token);
    }

    public bool HasPendingCommands => !_pendingCommands.IsEmpty;

    public bool ConsumeSnapshotRequests()
    {
        return Interlocked.Exchange(ref _pendingSnapshotRequests, 0) > 0;
    }

    public void PublishSnapshot(ExportState? state, ExportCommandAck? ack)
    {
        AgentIpcResponse response;

        lock (_snapshotLock)
        {
            _latestState = state;
            _latestAck = ack;
            response = BuildSnapshotMessage();
        }

        Broadcast(response);
    }

    public bool TryDequeueCommand(out ExportCommand? command)
    {
        if (_pendingCommands.TryDequeue(out ExportCommand? queuedCommand))
        {
            command = queuedCommand;
            return true;
        }

        command = null;
        return false;
    }

    public void Dispose()
    {
        try
        {
            _lifecycleCts?.Cancel();
        }
        catch
        {
        }

        lock (_clientsLock)
        {
            foreach (ClientConnection client in _clients.ToArray())
            {
                client.Dispose();
            }

            _clients.Clear();
        }

        try
        {
            _listener?.Close();
            _listener?.Dispose();
        }
        catch
        {
        }

        try
        {
            if (File.Exists(AgentPaths.SocketPath))
            {
                File.Delete(AgentPaths.SocketPath);
            }
        }
        catch
        {
        }
    }

    private async Task AcceptLoopAsync(CancellationToken cancellationToken)
    {
        Socket listener = _listener ?? throw new InvalidOperationException("IPC listener has not been started.");

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                Socket socket = await listener.AcceptAsync(cancellationToken);
                ClientConnection client = new(this, socket, _logger, cancellationToken);

                lock (_clientsLock)
                {
                    _clients.Add(client);
                }

                _ = client.RunAsync();
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception exception)
            {
                _logger.Error($"IPC accept loop failed: {exception}", 0);
                await Task.Delay(200, cancellationToken);
            }
        }
    }

    private AgentIpcResponse BuildSnapshotMessage()
    {
        lock (_snapshotLock)
        {
            return new AgentIpcResponse
            {
                Type = "snapshot",
                State = _latestState,
                Ack = _latestAck
            };
        }
    }

    private void Broadcast(AgentIpcResponse response)
    {
        ClientConnection[] clients;
        lock (_clientsLock)
        {
            clients = _clients.ToArray();
        }

        foreach (ClientConnection client in clients)
        {
            _ = client.SendAsync(response, _lifecycleCts?.Token ?? CancellationToken.None);
        }
    }

    private void RemoveClient(ClientConnection client)
    {
        lock (_clientsLock)
        {
            _clients.Remove(client);
        }
    }

    private void EnqueueCommand(ExportCommand command)
    {
        _pendingCommands.Enqueue(command);
    }

    private void RequestSnapshot()
    {
        Interlocked.Increment(ref _pendingSnapshotRequests);
    }

    private sealed class ClientConnection : IDisposable
    {
        private readonly AgentIpcServer _server;
        private readonly Socket _socket;
        private readonly MegaCrit.Sts2.Core.Logging.Logger _logger;
        private readonly CancellationToken _serverCancellationToken;
        private readonly StreamReader _reader;
        private readonly StreamWriter _writer;
        private readonly SemaphoreSlim _writeLock = new(1, 1);

        private bool _disposed;

        public ClientConnection(
            AgentIpcServer server,
            Socket socket,
            MegaCrit.Sts2.Core.Logging.Logger logger,
            CancellationToken serverCancellationToken)
        {
            _server = server;
            _socket = socket;
            _logger = logger;
            _serverCancellationToken = serverCancellationToken;

            NetworkStream stream = new(socket, ownsSocket: true);
            _reader = new StreamReader(stream, Encoding.UTF8, leaveOpen: true);
            _writer = new StreamWriter(stream, new UTF8Encoding(false), leaveOpen: true)
            {
                AutoFlush = true
            };
        }

        public async Task RunAsync()
        {
            try
            {
                while (!_serverCancellationToken.IsCancellationRequested)
                {
                    string? line = await _reader.ReadLineAsync(_serverCancellationToken);
                    if (string.IsNullOrWhiteSpace(line))
                    {
                        if (line is null)
                        {
                            return;
                        }

                        continue;
                    }

                    AgentIpcRequestParseResult parseResult = AgentIpcRequestParser.Parse(line);
                    if (parseResult.Status != AgentIpcRequestParseStatus.Ok)
                    {
                        await SendAsync(
                            new AgentIpcResponse
                            {
                                Type = "error",
                                Message = parseResult.ErrorMessage
                            },
                            _serverCancellationToken);
                        continue;
                    }

                    if (parseResult.RequestType == AgentIpcRequestType.Snapshot)
                    {
                        _server.RequestSnapshot();
                        continue;
                    }

                    ExportCommand command = parseResult.Command
                        ?? throw new InvalidOperationException("IPC parse reported success without a command payload.");
                    _server.EnqueueCommand(command);
                }
            }
            catch (OperationCanceledException)
            {
            }
            catch (IOException)
            {
            }
            catch (ObjectDisposedException)
            {
            }
            catch (Exception exception)
            {
                _logger.Error($"IPC client loop failed: {exception}", 0);
            }
            finally
            {
                Dispose();
            }
        }

        public async Task SendAsync(AgentIpcResponse response, CancellationToken cancellationToken)
        {
            if (_disposed)
            {
                return;
            }

            string json = JsonSerializer.Serialize(response, AgentIpcJson.Options);

            await _writeLock.WaitAsync(cancellationToken);
            try
            {
                if (_disposed)
                {
                    return;
                }

                await _writer.WriteLineAsync(json.AsMemory(), cancellationToken);
                await _writer.FlushAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
            }
            catch (IOException)
            {
                Dispose();
            }
            catch (ObjectDisposedException)
            {
                Dispose();
            }
            finally
            {
                _writeLock.Release();
            }
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;

            try
            {
                _reader.Dispose();
            }
            catch
            {
            }

            try
            {
                _writer.Dispose();
            }
            catch
            {
            }

            try
            {
                _socket.Dispose();
            }
            catch
            {
            }

            _writeLock.Dispose();
            _server.RemoveClient(this);
        }
    }
}
