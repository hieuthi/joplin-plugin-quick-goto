import joplin from 'api';
import { MenuItemLocation } from 'api/types';
import { SettingItemType } from 'api/types';
import { ContentScriptType } from 'api/types';

const uslug = require('uslug');

let slugs:any = {};

function headerSlug(headerText) {
	const s = uslug(headerText);
	let num = slugs[s] ? slugs[s] : 1;
	const output = [s];
	if (num > 1) output.push(num);
	slugs[s] = num + 1;
	return output.join('-');
}

function escapeHtml(unsafe:string) {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function noteHeaders(noteBody:string, endLine=-1) {
	const headers = [];
	const lines = noteBody.split('\n');
	for (let i=0; i<lines.length; i++) {
		const line = lines[i];
		if (endLine < 0 || (endLine>=0 && i<=endLine) ){
			const match = line.match(/^(#+)\s(.*)*/);
			if (!match) continue;
			headers.push({
				level: match[1].length,
				text: match[2],
			});
		} else {
			break;
		}
	}
	return headers;
}

joplin.plugins.register({
	onStart: async function() {
		const aHandle = await joplin.views.dialogs.create('assignDialog');
		await joplin.views.dialogs.setButtons(aHandle, [{id: 'ok'}, {id: 'cancel'}]);


		await joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			'getCursorCallback',
			'./getCursorCallback.js'
		);

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
				label: 'Assign with Keyboard Shortcuts',
				description: 'Enable keyboard shortcut for assign action (Restart required)'
			},
		});
		await joplin.settings.registerSettings({
			'qgoto_assign_silent': {
				value: false,
				type: SettingItemType.Bool,
				section: 'settings.quickGoto',
				public: true,
				label: 'Assign Silently',
				description: 'Silently assign note to item without opening confirmation dialog.'
			},
		});
		await joplin.settings.registerSettings({
			'qgoto_anchor': {
				value: 'heading',
				type: SettingItemType.String,
				isEnum: true,
				options: {
					'none': "0. None (just note)", 
					'heading': "1. Nearest Heading (upward)"},
				section: 'settings.quickGoto',
				public: true,
				label: 'Assign Anchor Logic',
				description: 'The anchor logic used when assign silently'
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
					const silent  = await joplin.settings.value("qgoto_assign_silent") as boolean;
					const selectedNote = await joplin.workspace.selectedNote();

					let anchor = await joplin.settings.value("qgoto_anchor");
					if (!silent) {
						let selectAtts = {'none': '', 'heading': ''};
						selectAtts[anchor] = 'selected';
						await joplin.views.dialogs.setHtml(aHandle,`
							<h2>Quick Goto - Assign</h2>
							<form name="options" style="font-size: 14px;">
								<p>Assigning <mark>📝 - ${selectedNote.title}</mark> to <mark>⌨️ ${cmdJLabel}</mark></p>
								<label><b>Anchor Logic:</b></label>
								<select name="anchor">
									<option value="none" ${selectAtts["none"]}>0. None (just note)</option>
									<option value="heading" ${selectAtts["heading"]}>1. Nearest Heading (upward)</option>
								</select>
							</form>
						`);
						const result = await joplin.views.dialogs.open(aHandle);
						if (result.id == 'cancel') return;
						anchor = result.formData.options.anchor;
					}

					switch (anchor) {
						case 'heading':
							slugs = {};
							await joplin.commands.execute('editor.execCommand', {name: "getCursorCallback", 
								args: [ function (cursor) {
									var slug = null;
									const headers = noteHeaders(selectedNote.body, cursor.line);
									for (const header of headers) {
										slug = headerSlug(header.text);
									} 
									if (slug==null){
										joplin.settings.setValue(settId, selectedNote.id);
									} else {
										joplin.settings.setValue(settId, selectedNote.id + "#" + escapeHtml(slug));
									}
								}]
							});
							break;
						
						case 'none':
						default:
							joplin.settings.setValue(settId, selectedNote.id);
							break;
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
