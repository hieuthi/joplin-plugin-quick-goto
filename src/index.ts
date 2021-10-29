import joplin from 'api';
import { MenuItemLocation } from 'api/types';
import { SettingItemType } from 'api/types';


joplin.plugins.register({
	onStart: async function() {
		await joplin.settings.registerSection('settings.quickGoto', {
			label: 'Quick Goto',
			iconName: 'fas fa-running'
		});

		await joplin.settings.registerSettings({
			'qgoto_slots': {
				value: 4,
				type: SettingItemType.Int,
				section: 'settings.quickGoto',
				public: true,
				label: 'Number of Items',
				minimum: 1,
				maximum: 9,
				description: 'Number of items (1~9) in the menu (Restart required)'
			},
		});
		await joplin.settings.registerSettings({
			'qgoto_assign_hotkey': {
				value: false,
				type: SettingItemType.Bool,
				section: 'settings.quickGoto',
				public: true,
				label: 'Assign Shortcuts',
				description: 'Enable keyboard shortcut for assign action (Restart required)'
			},
		});
		await joplin.settings.registerSettings({
			'qgoto_assign_silence': {
				value: false,
				type: SettingItemType.Bool,
				section: 'settings.quickGoto',
				public: true,
				label: 'Silent Assignment',
				description: 'Silently assign note to item without open confirmation dialog.'
			},
		});


		const slots = await joplin.settings.value('qgoto_slots') as number;
		const hotkeyA = await joplin.settings.value('qgoto_assign_hotkey') as boolean;

		let menuJItems = []    // Jump menu
		let menuAItems = []    // Assign menu
		for (let i = 1; i <= slots; i++) {
			let settId    = `qgoto_item${i}ID` ;
			let settAlias = `qgoto_item${i}Alias` ;

			await joplin.settings.registerSettings({
				[settId]: {
					value: "",
					type: SettingItemType.String,
					section: 'settings.quickGoto',
					public: true,
					advanced: true,
					label: `ITEM${i} - Note ID`,
					description: ''
				},
				[settAlias]: {
					value: `Item ${i}`,
					type: SettingItemType.String,
					section: 'settings.quickGoto',
					public: true,
					advanced: true,
					label: `ITEM${i} - Menu Alias`,
					description: `Set alias for ITEM${i} (Restart required)`
				},
			});

    		let cmdJName  = 'gotoJItem' + i;
    		let cmdJLabel = 'Goto';
    		let cmdJKeys  = 'CmdOrCtrl+' + i;

    		let cmdAName  = 'gotoAItem' + i;
    		let cmdALabel = 'Goto';
    		let cmdAKeys  = 'CmdOrCtrl+Alt+' + i;

			const alias = await joplin.settings.value(settAlias) as string;
			if (alias) {
				cmdJLabel = `Goto ${alias}`
				cmdALabel = `Goto ${alias} - Assign`
			}

			await joplin.commands.register({
				name: cmdJName,
				label: cmdJLabel,
				iconName: 'fas fa-running',
				enabledCondition: '',
				execute: async () => {
					var val  = await joplin.settings.value(settId) as string;

					var hashIdx = val.indexOf("#");
					var noteId  = hashIdx < 0 ? val : val.substring(0,hashIdx);
					var hash    = hashIdx < 0 ? ""  : val.substring(hashIdx+1);
					if (noteId.length > 0) {
						try {
							const note = await joplin.data.get(['notes', noteId], { fields: ['id', 'title'] });
							const selectedNote = await joplin.workspace.selectedNote();

							if (selectedNote.id == note.id){
								joplin.commands.execute('scrollToHash', hash);
							} else {
								await joplin.commands.execute("openNote", noteId, hash);
								await joplin.commands.execute('editor.focus');
							}

						} catch (err) {
							const result: number = await joplin.views.dialogs.showMessageBox(`Note \"${noteId}\" is no longer exist. Do you want to remove it from \"${cmdJLabel}\"`);
							if (result) return;
							joplin.settings.setValue(settId, '');
						}
					}
				}
			});
			menuJItems.push({commandName: cmdJName, accelerator: cmdJKeys})

			await joplin.commands.register({
				name: cmdAName,
				label: cmdALabel,
				iconName: 'fas fa-running',
				enabledCondition: 'oneNoteSelected',
				execute:  async () => {
					const silence  = await joplin.settings.value("qgoto_assign_silence") as boolean;
					const selectedNote = await joplin.workspace.selectedNote();

					if ( silence ) {
						joplin.settings.setValue(settId, selectedNote.id);
					} else {
						const result: number = await joplin.views.dialogs.showMessageBox(`Assign \"${selectedNote.title}\" to \"${cmdJLabel}\"`);
						if (result) return;
						joplin.settings.setValue(settId, selectedNote.id);
					}
				},
			});
			if (hotkeyA) {
				menuAItems.push({commandName: cmdAName, accelerator: cmdAKeys})
			} else {
				menuAItems.push({commandName: cmdAName})
			}
		}

		await joplin.views.menus.create('quickGotoJMenu', 'Quick Goto', menuJItems, MenuItemLocation.Tools);
		await joplin.views.menus.create('quickGotoAMenu', 'Quick Goto - Assign', menuAItems, MenuItemLocation.Tools);
	},
});
