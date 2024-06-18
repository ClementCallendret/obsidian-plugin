import { Editor,MarkdownView, Notice, Plugin,TAbstractFile,TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import { ExampleView, VIEW_TYPE_EXAMPLE } from './src/view/navigator';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from './src/settings/setting';
import { SampleModal } from './src/modal/modal';


export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
    private initial_load: boolean = true;


	async onload() {
        await this.loadSettings();

		  this.addRibbonIcon("dice", "Activate view", () => {
			this.activateView();
			//this.parcours_profondeur(app.vault.getRoot(), 0);
		  });
		
		// This creates an icon in the left ribbon.
		const ribbonIconE1 = this.addRibbonIcon('file-check', 'Enregistrer un fichier de référence', (evt: MouseEvent) => {
			this.concatenate_all_notes();
			new Notice('Fichier de référence créé !');
		});

		const ribbonIconE2 = this.addRibbonIcon('file-plus', 'Créer un nouveau fichier', (evt: MouseEvent) => {
			this.create_file();
			new Notice('Fichier créé !');
		});

		const ribbonIconE3 = this.addRibbonIcon('folder-plus', 'Créer un nouveau dossier', (evt: MouseEvent) => {
			this.create_folder();
			new Notice('Dossier créé !');
		});

		const ribbonIconE4 = this.addRibbonIcon('folder-sync', 'Synchroniser l\'ordre des fichiers', (evt: MouseEvent) => {
			this.set_order();
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

        this.registerEvent(
            this.app.vault.on('create', async (file: TAbstractFile) => {
                if (!this.initial_load) {
                    await this.set_order();
					this.updateExampleView();
                }
            })
        );
		this.registerEvent(
            this.app.vault.on('delete', async (file: TAbstractFile) => {
				await this.set_order();
				this.updateExampleView();
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', async (file: TAbstractFile) => {
				await this.set_order();
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
		//leaf = workspace.getRightLeaf(false);
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



	async set_id(id: number) {
		this.settings.id = id;
		await this.saveSettings();
	}

	async concatenate_all_notes() {
		const vault = this.app.vault;
		const files = vault.getMarkdownFiles();

		const meta_file = `---\nid:`;
		const nb_files = files.length;

		let content = '';
		let notes = new Array(nb_files).fill(0);

		//console.log("Files : ", files);
		//Remise en ordre
		for (let i = nb_files - 1; i > -1; i--) {
			let file = files[i];
			let data = await vault.read(file);
			if (data.startsWith(meta_file)) {
				let match = /ordre:\s*(\d+)/.exec(data);
				if (match) {
					//console.log("Match : ", match);
					let ordre = parseInt(match[1]);
					//console.log("Ordre : ", ordre);
					notes[ordre] = file;
				}
			}
		}
		//Concaténation
		for (let j = 0; j < nb_files; j++) {
			let file = notes[j];
			//console.log("notes : ", notes);
			if (file != 0) {
				let data = await vault.read(file);
				let match = data.match(/---\n(?:.|\n)*\n---\n([\s\S]*)/);
				let data_wt_meta = match ? match[1] : null;

				content += `## ${file.basename}\n${data_wt_meta}\n\n`;
			}
		}
		//Nom du fichier
		const root_folder = vault.getFolderByPath("/")?.children;
		let reference_folder_created = false;
		if (root_folder != null){
			for (let i = 0; i < root_folder.length; i++) {
				if (root_folder[i].name == "Références") {
					console.log("Références existe");
					reference_folder_created = true;
				}
			}
		}
		if (!reference_folder_created) {
			vault.createFolder("Références");
		}
		const digits = await this.get_next_number('Références', files);
		const newFilePath = `/Références/${digits} Référence.md`;
		await vault.create(newFilePath, content);		
        this.app.workspace.openLinkText(newFilePath, '', true);

	}

	async create_file() {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const folderPath = activeFile.path.substring(0, activeFile.path.lastIndexOf('/'));
			const files = await this.app.vault.getMarkdownFiles();
			const digits = await this.get_next_number(folderPath, files);
			const newFilePath = `${folderPath}/${digits} Titre${digits}.md`;
			const id = this.get_id()+1;
            
			await this.app.vault.create(newFilePath, `---\nid: ${id} \nordre: 0 \nnumero: "${digits}" \n---`);
			await this.set_id(id);
			await this.set_order();

			await this.app.workspace.openLinkText(newFilePath, '', true);
		}
	}

	async get_next_number(parent_folder_path: string, files: TFile[]): Promise<string> {
		console.log("Parent folder path : ", parent_folder_path);
		let result = "";
		let last_number = 0;

		//console.log("Files : ", files);

		for (let i = 0; i < files.length; i++) {
			let file = files[i];
			let file_path = file.path;
			//console.log("File path : ", file_path);
			if (file_path.startsWith(parent_folder_path)) {
				let file_name = file_path.substring(parent_folder_path.length + 1);
				

				//Si il y a déjà un fichier avec un numéro du dossier
				let match2 = file_name.match(/^\d+(\.\d+)*\s+/);
				if (match2) {
					console.log("Match2 : ", match2);
					let number = parseInt(match2[0]?.trim().split('.').pop() ?? '');
					if (number > last_number) {
						last_number = number;
					}
				}
				//Si c'est le premier fichier du dossier
				if (last_number != 0) {
					let match1 = file_name.match(/^(.*?)\s[a-zA-Z]/);
					if (match1) {
						result = match1[1].slice(0, -1);
					}
				}
			}
		}
		if (last_number == 0) {
			let parent_folder = this.app.vault.getFolderByPath(parent_folder_path);
			console.log("parent folder : ", parent_folder);
			let match3 = parent_folder?.name.match(/^(.*?)\s[a-zA-Z]/);
			if (match3) {
				result = match3[1];
			}
		}
		//console.log("Result : ", result);
		//console.log("Last number : ", last_number);
		result = result + (last_number + 1).toString();
		//console.log("Result Final : ", result);
		return result;
	}

	async create_folder() {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const folderPath = activeFile.path.substring(0, activeFile.path.lastIndexOf('/'));
			const files = await this.app.vault.getFiles();
			const digits = await this.get_next_number(folderPath, files);
			const newFolderPath = `${folderPath}/${digits} Fichier`;
			await this.app.vault.createFolder(newFolderPath);
			

			const newFilePath = `${newFolderPath}/${digits}.1 Titre.md`;
			let id = this.get_id()+1;
			await this.app.vault.create(newFilePath, `---\nid: ${id} \nordre: 1 \nnumero: "${digits}.1" \n---`);
			await this.set_id(id);
			this.set_ordre_from_file(activeFile, 0);
            await this.set_order();

            this.app.workspace.openLinkText(newFilePath, '', true);
			/*
			console.log("id", this.get_id_from_file(activeFile));
			console.log("ordre", this.get_ordre_from_file(activeFile));
			console.log("numero", this.get_numero_from_file(activeFile));
			*/
		}

		let id = this.get_id();
		//console.log(`Current ID: ${id}`);

	}


	async get_id_from_file(filepath:TFile){
		let filedata = await this.app.vault.read(filepath);
		const idMatch = filedata.match(/id:\s*(\d+)/);
		const id = idMatch ? parseInt(idMatch[1], 10) : null;
		return id;
	}

	public async get_ordre_from_file(filepath:TFile){
		let filedata = await this.app.vault.read(filepath);
		const ordreMatch = filedata.match(/ordre:\s*(\d+)/);
		const ordre = ordreMatch ? parseInt(ordreMatch[1], 10) : null;
		return ordre;
	}

	async get_numero_from_file(filepath:TFile){
		let filedata = await this.app.vault.read(filepath);
		const numeroMatch = filedata.match(/numero:\s*"([\d.]+)"/);
		const numero = numeroMatch ? numeroMatch[1] : null;
		return numero;
	}

	async set_numero_from_file(filepath:TFile, new_numero:string){
		let file_data = await this.app.vault.read(filepath);
		const new_data = file_data.replace(/(numero:\s*")([\d.]+)"/, `$1${new_numero}"`);
		await this.app.vault.modify(filepath, new_data);
	}

	async set_ordre_from_file(filepath:TFile, new_ordre:number){
		let file_data = await this.app.vault.read(filepath);
		const new_data = file_data.replace(/(ordre:\s*)\d+/, `$1${new_ordre}`);
		await this.app.vault.modify(filepath, new_data);
	}

	async set_order(){
		const vault = this.app.vault;
		const files = vault.getMarkdownFiles().reverse();
        let list_file = [];
		for (let i = 0; i < files.length; i++){
			const file = files[i];
			this.set_ordre_from_file(file, i);
            let numero = await this.get_numero_from_file(file);
            if(numero != null){
			    list_file.push(file);
            }
            /*
			console.log("id", await this.get_id_from_file(file));
			console.log("ordre", await this.get_ordre_from_file(file));
			console.log("numero", await this.get_numero_from_file(file));
            */
		}
        //console.log("Liste des numéros : ", list_file);
        /*
		list_file.sort(this.compare_versions);
        console.log("Liste des numéros triés : ", list_file);
		*/
	}


    async compare_versions(a : TFile, b : TFile): Promise<number> {
        console.log("a : ", a);
        console.log("b : ", b); 
        const num_a = await this.get_numero_from_file(a);
        const num_b = await this.get_numero_from_file(b);
        console.log("num_a : ", num_a);
        console.log("num_b : ", num_b);
        if (num_a === null || num_b === null) {
            return 0;
        }
        const a_parts = num_a.split('.').map(Number);
        const b_parts = num_b.split('.').map(Number);
    
        const length = Math.max(a_parts.length, b_parts.length);
    
        for (let i = 0; i < length; i++) {
            const aValue = a_parts[i] !== undefined ? a_parts[i] : 0;
            const bValue = b_parts[i] !== undefined ? b_parts[i] : 0;
    
            if (aValue > bValue) {
                return 1;
            }
            if (aValue < bValue) {
                return -1;
            }
        }
    
        return 0;
    }	


	
}