# Quick Goto

This plugin create several keyboard shortcuts to quickly jump to designated notes.

## Usage

The default setting has 4 shortcuts but you can increase them to 9 or reduce to just 1.

To use these shortcuts, you first need to assign note to a slot by open the designated note then choose `Tools > Quick Goto - Assign > [Slot]`.

To jump to the designated note you can choose `Tools > Quick Goto > [Slot]` or press the keyboard shortcut assigned to it (Default: `CmdOrCtrl+1`, `CmdOrCtrl+2`, and so on).

The alias of the slot can be changed in the plugin setting to suite your needs, while the keyboard shortcut can be customized in `Keyboard Shortcut`.

You can optionally enable keyboard shortcut for `Assign` action and silently `Assign` note without showing confirm dialog by changing the plugin setting.

## Advanced Usage

The latest version v1.1.0 support jump to a specific header of the note but there is no GUI for that feature at the moment. Alternatively, you can manual do that by open plugin setting and add header hash to Note ID. For example change ITEM 1 - Note ID from `<noteid>` to `<noteid>#<hash>`.

Header hash is a normalized id of a header, for example hash of "Welcome to Joplin!" is "welcome-to-joplin".

