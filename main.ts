import { Editor,MarkdownView, Notice, Plugin,TAbstractFile, TFolder, WorkspaceLeaf } from 'obsidian';
import { ExampleView, VIEW_TYPE_EXAMPLE } from './src/view/navigator';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from './src/settings/setting';
import { openTemplateModal } from './src/modal/templateModal';
import {openFileModal} from './src/modal/fileModal'

import { comparaison  } from './src/hierarchy/hierarchy';
import { createFolders, get_next_number, set_ordre_from_file, set_order, get_id_from_file ,getNumberFromTitle} from './src/utils/utils';
import { createIssue, getRedmineIssues, getRedmineProject, updateIssue } from 'src/redmine/redmine';
import {openRedmineProjectsModal} from 'src/modal/redmineProjectsModal';

export default class MyPlugin extends Plugin {
	public settings: MyPluginSettings;
    private initial_load: boolean = true;

	async onload() {
        await this.loadSettings();
/*
		this.addRibbonIcon("dice", "Activate view", () => {
		this.activateView();
		});
		*/
		// This creates an icon in the left ribbon.
		
		const ribbonIconE1 = this.addRibbonIcon('file-check', 'Enregistrer un fichier de référence', async (evt: MouseEvent) => {
			comparaison();
			new Notice('Fichier de référence créé !');

		});
		
		const ribbonIconE2 = this.addRibbonIcon('file-plus', 'Créer un nouveau fichier', async (evt: MouseEvent) => {
			const templateNumber = await openTemplateModal(this.app, this.settings.templates);
			const parentFolder = this.app.workspace.getActiveFile()?.parent as TFolder;
			this.create_file(templateNumber,parentFolder);
		});
		
		this.addRibbonIcon('file-stack', 'Redmine upload', async (evt: MouseEvent) => {		
			const allFiles = app.vault.getMarkdownFiles().filter(file => file.path.startsWith("Projet/")).reverse();
			let filesSelected= await openFileModal(app,allFiles);
			console.log("Files selected", filesSelected);
			//get all issues
			//if no issue created -> create a new one
			//createIssue(this.settings.apiKey,filesSelected[0]);
			//else : modify already created issue
			new Notice('Redmine Sync Done !');
		});		

		this.addRibbonIcon('folder-sync', 'Redmine', async (evt: MouseEvent) => {
			const apiKey = this.settings.apiKey;
			//get all projects from redmine
			let projects = await getRedmineProject(apiKey);
			console.log("Projects", projects);
			//select a project
			let project = await openRedmineProjectsModal(app, projects);
			console.log("Project selected", project);
			console.log("Project id", project.id)
			//get all issues from the selected project
			let issues = await getRedmineIssues(apiKey, project.id);
			console.log("Issues", issues);
			//select files to be uploaded
			const allFiles = app.vault.getMarkdownFiles().filter(file => file.path.startsWith("Projet/")).reverse();
			let filesSelected = await openFileModal(app,allFiles);
			console.log("Files selected", filesSelected);
			new Notice('Redmine Sync Done !');

			
			//get all id issue
			let idIssueList = [];
			for (const issue of issues) {
				const idIssue = getNumberFromTitle(issue.subject);
				if (idIssue != null){
					idIssueList.push(idIssue);
				}
			}
			console.log("Id issue list", idIssueList);
			filesSelected.forEach(async file => {
				const fileId = await get_id_from_file(file);
				//file id not in idIssueList -> create a new issu
				console.log("File id", fileId);
				if (fileId != null && !idIssueList.includes(fileId)){
					console.log("Create issue");
					createIssue(apiKey, file, project.id);
				}
				//file in idIssueList -> modify already created issue
				else if (fileId != null){
					console.log("Modify issue");
					updateIssue(apiKey, file, issues[idIssueList.indexOf(fileId)].id);
				}
				else{
					console.error("Error no ID in the file");
				}
			})
			//for all files selected
			//if no issue created -> create a new one
			//else : modify already created issue

		});
		// Perform additional things with the ribbon
		//ribbonIconE1.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
			id: 'template-selection',
			name: 'Template Selection',
			callback: async () => {
				const templateNumber = await openTemplateModal(this.app, this.settings.templates);
				const parentFolder = this.app.workspace.getActiveFile()?.parent as TFolder;
				this.create_file(templateNumber, parentFolder);
			}
		});

		this.addCommand({
			id : 'create-reference-file',
			name : 'Create reference file',
			callback: async() => {
				await comparaison();
				new Notice('Fichier de référence créé !');
			},
		});


		/*
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
						openTemplateModal(this.app);
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});
		*/
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			//console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        this.registerEvent(
            this.app.vault.on('create', async (file: TAbstractFile) => {
                if (!this.initial_load) {
					this.updateExampleView();
                }
            })
        );
		this.registerEvent(
            this.app.vault.on('delete', async (file: TAbstractFile) => {
				this.updateExampleView();
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', async (file: TAbstractFile) => {
                this.updateExampleView();
            })
        );

		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new ExampleView(leaf, this)
		  );
        
        this.app.workspace.onLayoutReady(() => {
            // Le chargement initial est terminé
            this.initial_load = false;
			this.start();
			createFolders();
			this.activateView();
        });
 
	}


	onunload() {}

	public get_id(): number {
		return this.settings.id;
	}

	//set l'id dans les settings
	async set_id(id: number) {
		this.settings.id = id;
		await this.saveSettings();
	}

	async create_file(templateNumber : number, folder : TFolder) {
		//let activeFile = this.app.workspace.getActiveFile() as TAbstractFile;
		//Si le fichier actif n'est pas null et n'est pas dans la racine
		//const folderPath = activeFile.path.substring(0, activeFile.path.lastIndexOf('/'));
		//const parent_folder =  app.vault.getAbstractFileByPath(folderPath.path) as TFolder;
		const template_list = this.settings.templates;
		if (folder != null){
			//let content = '';
			const digits = await get_next_number(folder);
			
			const newFilePath = `${folder.path}/${digits} Titre${digits}.md`;
			const id = this.get_id()+1;
			const metadata = `---\nid: ${id} \nordre: 0 \nnumero: "${digits}" \n---\n`;		
			/*
			const scenario1 = `Scenario SC${digits} - 1 :\n	-\n	-\n\n`
			const scenario2 = `Scenario SC${digits} - 2 :\n	-\n	-\n\n`

			const casUsage = `${digits}.1 Cas d'usage n°1:\n	-\n	-\n\n`;

			let regle_gestion = `Règles de gestion : \n`;
			if (templateNumber == 1 ){
				regle_gestion += `	-\n	-\n`
				content = scenario1 + regle_gestion;
			} 
			else if (templateNumber == 2){
				regle_gestion += ` \n|  Code  |  Description de la règle de gestion  |\n| :-------: | -------------------------------------- |\n| RG${digits} | Description |`;
				content = scenario1 + regle_gestion;
			}
			else if(templateNumber == 3){
				regle_gestion += ` \n|  N°  |         Cas d'usage        |         Règle        |\n| :-------: | -------------------------------------- | -------------------------------------- |\n| 1 | Texte | Cas valides :<br>	-<br>	-<br> <br>Cas d'échecs :<br>	-<br>	-<br>|\n| 2 | Texte | Cas valides :<br>	-<br>	-<br> <br>Cas d'échecs :<br>	-<br>	-<br>|`
				content = casUsage + regle_gestion;

			}
			//template number 4
			else {
				regle_gestion += ` \n|  Code  |  Description de la règle de gestion  |\n| :-------: | -------------------------------------- |\n| RG${digits} - 1 | Description |\n| RG${digits} - 2 | Description |`;
				content = scenario1 + scenario2 + regle_gestion;
			}*/
			let content : string = metadata + template_list[templateNumber-1].content.toString() + "";
			content.replace(/`/g, '\'');
			content = content.replace(/\${digits}/g, digits.toString());

			await this.app.vault.create(newFilePath, content);
			this.app.workspace.openLinkText(newFilePath, '', true);
			await this.set_id(id);
			
		}
	}

	async create_folder() {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const folderPath = activeFile.path.substring(0, activeFile.path.lastIndexOf('/'));
			const parentFolder = activeFile.parent;
			if (parentFolder != null){
				const digits = await get_next_number(parentFolder);
				const newFolderPath = `${folderPath}/${digits} Fichier`;
				await this.app.vault.createFolder(newFolderPath);
				
		
				const newFilePath = `${newFolderPath}/${digits}.1 Titre.md`;
				let id = this.get_id()+1;
				await this.app.vault.create(newFilePath, `---\nid: ${id} \nordre: 1 \nnumero: "${digits}.1" \n---`);
				await this.set_id(id);
				set_ordre_from_file(activeFile, 0);
		
				this.app.workspace.openLinkText(newFilePath, '', true);
			}
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

	async start(){
		let vault = this.app.vault;
		const root_folder_children = vault.getRoot().children;
		let project_folder_created = false;
		if (root_folder_children != null){
			for (const children of root_folder_children) {
				if (children.name == "Projet") {
					project_folder_created = true;
				}
			}
		}
		if(!project_folder_created){
			await vault.createFolder("Projet");
		}
		
		//Init projet file
		/*
		const project_folder = vault.getFolderByPath("Projet");
		if (project_folder?.children.length == 0){
			const id = this.get_id()+1;
			const metadata = `---\nid: ${id} \nordre: 0 \nnumero: "1" \n---\n`;	
			const scenario = `Scenario SC 1 - 1 :\n	-\n	-\n\n`
			let regle_gestion = `Règles de gestion : \n`;
			regle_gestion += ` \n|  Code  |  Description de la règle de gestion  |\n| :-------: | -------------------------------------- |\n| RG1 | Description |`;
			await this.app.vault.create("/Projet/1 Titre1.md", metadata+scenario+regle_gestion);
			await this.set_id(id);
		}*/
	}
}

