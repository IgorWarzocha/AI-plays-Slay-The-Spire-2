extends SceneTree

func _initialize() -> void:
	if OS.get_cmdline_user_args().size() < 3:
		push_error("Usage: godot --headless --script pack_mod.gd -- <output.pck> <manifest_path> <mount_path>")
		quit(1)
		return

	var args := OS.get_cmdline_user_args()
	var output_path := args[0]
	var source_path := args[1]
	var mount_path := args[2]

	var packer := PCKPacker.new()
	var start_error := packer.pck_start(output_path)
	if start_error != OK:
		push_error("pck_start failed: %s" % start_error)
		quit(2)
		return

	var add_error := packer.add_file(mount_path, source_path)
	if add_error != OK:
		push_error("add_file failed: %s" % add_error)
		quit(3)
		return

	var flush_error := packer.flush()
	if flush_error != OK:
		push_error("flush failed: %s" % flush_error)
		quit(4)
		return

	print("Packed %s into %s as %s" % [source_path, output_path, mount_path])
	quit(0)
