import { Notice, Plugin,TAbstractFile, TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import { ExampleView, VIEW_TYPE_EXAMPLE } from './src/view/navigator';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from './src/settings/setting';
import { openTemplateModal } from './src/modal/templateModal';

import { comparaison  } from './src/hierarchy/hierarchy';
import { setupFolders, getNextNumber, start} from './src/utils/utils';
import { redmineSync } from 'src/redmine/redmine';


export default class MyPlugin extends Plugin {
	public settings: MyPluginSettings;
    private initial_load: boolean = true;

	async onload() {
        await this.loadSettings();

		// This creates an icon in the left ribbon.

		this.addRibbonIcon('file-check', 'Comparaison', async (evt: MouseEvent) => {
			comparaison();
			new Notice('Comparaison !');
		});

		this.addRibbonIcon('file-plus', 'Créer un nouveau fichier', async (evt: MouseEvent) => {
			const templateNumber = await openTemplateModal(this.app, this.settings.templates);
			const parentFolder = this.app.workspace.getActiveFile()?.parent as TFolder;
			this.createFile(templateNumber,parentFolder);
			new Notice('Fichier créé !');
		});
		
		this.addRibbonIcon('folder-sync', 'Synchronisation Redmine', async (evt: MouseEvent) => {
			await redmineSync(this.settings.apiKey);
			new Notice('Redmine Sync Done !');
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		//const statusBarItemEl = this.addStatusBarItem();
		//statusBarItemEl.setText('Status Bar Text');


		//Create a reference file and a compare file
		this.addCommand({
			id : 'Comparaison',
			name : 'Comparaison',
			callback: async() => {
				await comparaison();
				new Notice('Fichier de référence créé !');
			},
		});

		//Choose a template and create a file 
		this.addCommand({
			id: 'creer-un-nouveau-fichier',
			name: 'Créer un nouveau fichier',
			callback: async () => {
				const templateNumber = await openTemplateModal(this.app, this.settings.templates);
				const parentFolder = this.app.workspace.getActiveFile()?.parent as TFolder;
				this.createFile(templateNumber, parentFolder);
				new Notice('Fichier créé !');
			}
		});

		//Synchronize the redmine tasks
		this.addCommand({
			id : 'synchronisation-redmine',
			//there is space at the end of the name to make it the longer and appear at the bottom of the list
			//so it's alphabetical order
			name : 'Synchronisation Redmine ',
			callback: async() => {
				await redmineSync(this.settings.apiKey);
				new Notice('Redmine Sync Done !');
			},
		})

		/*
		this.addCommand({
			id : 'activate-navigator',
			name : 'Activate navigator',
			callback: () => {
				this.activateView();
			},		})
		*/
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		//this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        this.registerEvent(
            this.app.vault.on('create', async (file: TAbstractFile) => {
                if (!this.initial_load) {
					//await this.updateExampleView();
                }
            })
        );
		this.registerEvent(
            this.app.vault.on('delete', async (file: TAbstractFile) => {
				//await this.updateExampleView();
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', async (file: TAbstractFile) => {
                //await this.updateExampleView();
            })
        );

		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new ExampleView(leaf, this)
		  );
        
        this.app.workspace.onLayoutReady(async () => {
            // Le chargement initial est terminé
            this.initial_load = false;
			await start();
			await setupFolders();
			await this.activateView();
			await this.updateExampleView();
			console.log("Load Fileflow plugin");
        });
 
	}

	public getID(): number {
		return this.settings.id;
	}

	//set l'id dans les settings
	async setID(id: number) {
		this.settings.id = id;
		await this.saveSettings();
	}

	async createFile(templateNumber : number, folder : TFolder) {
		//Si le fichier actif n'est pas null et n'est pas dans la racine
		const template_list = this.settings.templates;
		if (folder != null){
			const digits = await getNextNumber(folder);
			
			const newFilePath = `${folder.path}/${digits} New Note${digits}.md`;
			const id = this.getID()+1;
			const metadata = `---\nid: ${id}\n---\n`;		
		
			let content : string = metadata + template_list[templateNumber-1].content.toString() + "";
			content.replace(/`/g, '\'');
			content = content.replace(/\${digits}/g, digits.toString());

			await this.app.vault.create(newFilePath, content);
			this.app.workspace.openLinkText(newFilePath, '', true);
			await this.setID(id);
			
		}
	}
	
	async activateView() {
		const { workspace } = this.app;
	
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);
	
		if (leaves.length > 0) {
		  // A leaf with our view already exists, use that
		  leaf = leaves[0];
		} else {
		// Our view could not be found in the workspace, create a new leaf
		// in the right sidebar for it
		leaf = workspace.getLeftLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
		}
		}
	
		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) {
		  workspace.revealLeaf(leaf);
		}
	  }

	async updateExampleView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);
        if (leaves.length > 0) {
			console.log("update file list");
            const view = leaves[0].view as ExampleView;
            await view.updateFileList();
        }
    }
	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData()};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}



