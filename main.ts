import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { readFileSync } from "fs";
import MDBReader from "mdb-reader";
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconE1 = this.addRibbonIcon('file-check', 'Enregistrer un fichier de référence', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			concatenate_all_notes();
			new Notice('Fichier de référence créé !');
		
		});


		const ribbonIconE2 = this.addRibbonIcon('file-plus', 'Créer un nouveau fichier', (evt: MouseEvent) => {
			create_file();

			new Notice('Fichier créé !');
		});

		// Perform additional things with the ribbon
		ribbonIconE1.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');



		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

async function concatenate_all_notes(){
	const vault = app.vault;  

	const files = await vault.getMarkdownFiles();  
	const test = await vault.getFiles();
	console.log(test);
	const meta_folder = `---
	_filters: []
	_contexts: []
	_links: []
	_sort:
	field: rank
	`;

	const meta_file = `---\nid`;
	const nb_files = files.length;

	let content = '';  
	let notes = new Array(nb_files).fill(0);


	for (let i = nb_files-1; i > -1; i--)
		{  
		let file = files[i];
		let data = await vault.read(file);
		if (data.startsWith(meta_file))
		{
			let match = data.match(/---\s*id:\s*"(\d+)"\s*---/);
			if (match)
			{
				let id = parseInt(match[1]);
				notes[id] = file
			}
		}  
	}

	for (let j = 0; j < nb_files; j++){
		let file = notes[j];
		if (file != 0) {
			let data = await vault.read(file);

			let match = data.match(/---\n(?:.|\n)*\n---\n([\s\S]*)/);
			let data_wt_meta = match ? match[1] : null; // Add null check for match

			content += `## ${file.basename}\n${data_wt_meta}\n\n`;
		}
	}

	vault.create("Référence.md",content);


}

function read_database(){
	const buffer = readFileSync("Spaces.mdb");
	const reader = new MDBReader(buffer);

	reader.getTableNames(); // ['Cats', 'Dogs', 'Cars']

	const table = reader.getTable("Cats");
	table.getColumnNames(); // ['id', 'name', 'color']
	table.getData(); // [{id: 5, name: 'Ashley', color: 'black'}, ...]
	console.log("READ DATABASE")
}

async function create_file(){
	const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
		const folderPath = activeFile.path.substring(0, activeFile.path.lastIndexOf('/'));
		const digits = await get_next_number(folderPath);
		const newFilePath = `${folderPath}/${digits} Titre.md`;
		await this.app.vault.create(newFilePath, '');
		this.app.workspace.openLinkText(newFilePath, '', true);

    }
}

async function get_next_number(parent_folder_path: string):Promise<string>{
	console.log("Parent folder path : ",parent_folder_path);
	let result = "";
	let last_number = 0;
	const files = await app.vault.getMarkdownFiles();
	console.log("Files : ",files);  
	

	for (let i = 0; i < files.length; i++){
		let file = files[i];
		let file_path = file.path;
		if (file_path.startsWith(parent_folder_path)){
			let file_name = file_path.substring(parent_folder_path.length+1); 

			//Get last number
			let match2 = file_name.match(/^\d+(\.\d+)*\s+/);
			if (match2){
				let number = parseInt(match2[0]?.trim().split('.').pop() ?? '');
				if (number > last_number){
					last_number = number;
				}
			}
			//if first note 
			if (last_number == 0){


			}
			//if not first note = other note already created
			else{
				let match1 = file_name.match(/^(.*?)\s[a-zA-Z]/);
				if (match1){
					result = match1[1];
				}
			}




		}
	}
	console.log("Result : ",result);
	console.log("Last number : ",last_number);
	result = result.slice(0,-1) + (last_number + 1).toString();
	console.log("Result Final : ",result);
	return result;
}