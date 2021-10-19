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

		const slots = await joplin.settings.value('qgoto_slots') as number;

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
					label: `ITEM${i} - Note ID`,
					description: ''
				},
				[settAlias]: {
					value: `Item ${i}`,
					type: SettingItemType.String,
					section: 'settings.quickGoto',
					public: true,
					label: `ITEM${i} - Menu Alias`,
					description: `Set alias for ITEM${i} (Restart required)`
				},
			});

    		let cmdJName  = 'gotoJItem' + i;
    		let cmdJLabel = 'Goto';
    		let cmdJKeys  = 'CmdOrCtrl+' + i;

    		let cmdAName  = 'gotoAItem' + i;
    		let cmdALabel = 'Assign';

			const alias = await joplin.settings.value(settAlias) as string;
			if (alias) {
				cmdJLabel = `Goto ${alias}`
				cmdALabel = `Assign to ${alias}`
			}

	    	await joplin.commands.register({
	     		name: cmdJName,
	      		label: cmdJLabel,
	    		iconName: 'fas fa-running',
	    		enabledCondition: '',
	    		execute: async () => {
	    			const noteId  = await joplin.settings.value(settId) as string;
	    			if (noteId.length > 0) {
	    				try {
	    					const note = await joplin.data.get(['notes', noteId], { fields: ['id', 'title'] });
	    					await joplin.commands.execute("openNote", noteId);
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
          			const selectedNote = await joplin.workspace.selectedNote();
          			const result: number = await joplin.views.dialogs.showMessageBox(`Assign \"${selectedNote.title}\" to \"${cmdJLabel}\"`);
            		if (result) return;
            		joplin.settings.setValue(settId, selectedNote.id);
        		},
	    	});
    		menuAItems.push({commandName: cmdAName})    	
    	}

		await joplin.views.menus.create('quickGotoJMenu', 'Quick Goto', menuJItems, MenuItemLocation.Tools);
		await joplin.views.menus.create('quickGotoAMenu', 'Quick Goto - Assign', menuAItems, MenuItemLocation.Tools);
	},
});
