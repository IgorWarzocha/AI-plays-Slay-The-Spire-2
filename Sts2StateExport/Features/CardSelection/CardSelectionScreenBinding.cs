using System.Reflection;
using Godot;

namespace Sts2StateExport;

// This binding is the normalized control surface for every deck-card picker we
// support. Feature code only needs this contract, not the underlying Godot
// subclass details.
public sealed class CardSelectionScreenBinding
{
    public required Control Screen { get; init; }
    public required string Kind { get; init; }
    public string? Prompt { get; init; }
    public required MethodInfo OnCardClickedMethod { get; init; }
    public MethodInfo? ConfirmSelectionMethod { get; init; }
    public MethodInfo? CloseSelectionMethod { get; init; }
    public bool CanConfirm { get; init; }
    public bool CanClose { get; init; }
}
