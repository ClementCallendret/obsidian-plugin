import { Editor,MarkdownView, Notice, Plugin,TAbstractFile,TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import { ExampleView, VIEW_TYPE_EXAMPLE } from './src/view/navigator';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from './src/settings/setting';
import { SampleModal } from './src/modal/modal';
import { comparaison, getNumber,  } from './src/hierarchy/hierarchy';
import { get_next_number, set_ordre_from_file, set_order } from './src/utils/utils';

export default class MyPlugin extends Plugin {
	public settings: MyPluginSettings;
    private initial_load: boolean = true;


	async onload() {
        await this.loadSettings();

		  this.addRibbonIcon("dice", "Activate view", () => {
			this.activateView();
		  });
		
		// This creates an icon in the left ribbon.
		const ribbonIconE1 = this.addRibbonIcon('file-check', 'Enregistrer un fichier de référence', async (evt: MouseEvent) => {
			comparaison();
			new Notice('Fichier de référence créé !');

		});

		const ribbonIconE2 = this.addRibbonIcon('file-plus', 'Créer un nouveau fichier 1', (evt: MouseEvent) => {
			this.create_file(1);
			new Notice('Fichier créé !');
		});

		const ribbonIconE3 = this.addRibbonIcon('file-plus', 'Créer un nouveau fichier 2', (evt: MouseEvent) => {
			this.create_file(2);
			new Notice('Fichier créé !');
		});

		const ribbonIconE4 = this.addRibbonIcon('folder-plus', 'Créer un nouveau dossier', (evt: MouseEvent) => {
			this.create_folder();
			new Notice('Dossier créé !');
		});

		const ribbonIconE5 = this.addRibbonIcon('folder-sync', 'Synchroniser l\'ordre des fichiers', async (evt: MouseEvent) => {
			await set_order();
			new Notice('Ordre synchronisé !');
			});
		


		// Perform additional things with the ribbon
		ribbonIconE1.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'reset-id',
			name: 'Reset id',
			callback: () => {
				this.set_id(-1);
				//new SampleModal(this.app).open();
			}
		});

		this.addCommand({
			id: 'template-1',
			name: 'Template 1',
			callback: () => {
				this.create_file(1);
			}
		});

		this.addCommand({
			id: 'template-2',
			name: 'Template 2',
			callback: () => {
				this.create_file(2);
			}
		});

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
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

        this.registerEvent(
            this.app.vault.on('create', async (file: TAbstractFile) => {
                if (!this.initial_load) {
                    //await set_order();
					this.updateExampleView();
                }
            })
        );
		this.registerEvent(
            this.app.vault.on('delete', async (file: TAbstractFile) => {
				//await set_order();
				this.updateExampleView();
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', async (file: TAbstractFile) => {
				//await set_order();
                this.updateExampleView();
            })
        );

		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new ExampleView(leaf)
		  );
        
          this.app.workspace.onLayoutReady(() => {
            // Le chargement initial est terminé
            this.initial_load = false;
        });
 
	}


	onunload() {}

	get_id(): number {
		return this.settings.id;
	}

	//set l'id dans les settings
	async set_id(id: number) {
		this.settings.id = id;
		await this.saveSettings();
	}

	async create_file(num : number) {
		let activeFile = this.app.workspace.getActiveFile() as TAbstractFile;
		if (activeFile == null) {
			activeFile = this.app.vault.getRoot().children[0];
		}
		if (activeFile) {
			const folderPath = activeFile.path.substring(0, activeFile.path.lastIndexOf('/'));
			const files = this.app.vault.getMarkdownFiles();
			const digits = await get_next_number(folderPath, files);
			const newFilePath = `${folderPath}/${digits} Titre${digits}.md`;
			const id = this.get_id()+1;
			const metadata = `---\nid: ${id} \nordre: 0 \nnumero: "${digits}" \n---\n`;		
			const scenario = `Scenario SC${digits} - 1 :\n	-\n	-\n\n`
			let regle_gestion = `Règles de gestion : \n`;
			if (num == 1 ){
				regle_gestion += ` \n|  Code  |  Description de la règle de gestion  |\n| :-------: | -------------------------------------- |\n| RG${digits} | Description |`;
			} 
			else{
				regle_gestion += `	-\n	-\n`
			}
			await this.app.vault.create(newFilePath, metadata + scenario + regle_gestion);
			await this.set_id(id);
			//await set_order();
			this.app.workspace.openLinkText(newFilePath, '', true);
		}
	}

	async create_folder() {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const folderPath = activeFile.path.substring(0, activeFile.path.lastIndexOf('/'));
			const files = await this.app.vault.getFiles();
			const digits = await get_next_number(folderPath, files);
			const newFolderPath = `${folderPath}/${digits} Fichier`;
			await this.app.vault.createFolder(newFolderPath);
			
	
			const newFilePath = `${newFolderPath}/${digits}.1 Titre.md`;
			let id = this.get_id()+1;
			await this.app.vault.create(newFilePath, `---\nid: ${id} \nordre: 1 \nnumero: "${digits}.1" \n---`);
			await this.set_id(id);
			set_ordre_from_file(activeFile, 0);
	
			this.app.workspace.openLinkText(newFilePath, '', true);
		}
	
		let id = this.get_id();
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
            const view = leaves[0].view as ExampleView;
            view.updateFileList();
        }
    }
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}