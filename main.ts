import { Notice, Plugin,TAbstractFile, TFolder, WorkspaceLeaf } from 'obsidian';
import { ExampleView, VIEW_TYPE_EXAMPLE } from './src/view/navigator';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from './src/settings/setting';
import { openTemplateModal } from './src/modal/templateModal';
import {openFileModal} from './src/modal/fileModal'

import { comparaison  } from './src/hierarchy/hierarchy';
import { createFolders, getNextNumber, getIDFromFile ,getNumberFromTitle} from './src/utils/utils';
import { createIssue, getRedmineIssues, getRedmineProject, updateIssue } from 'src/redmine/redmine';
import {openRedmineProjectsModal} from 'src/modal/redmineProjectsModal';

export default class MyPlugin extends Plugin {
	public settings: MyPluginSettings;
    private initial_load: boolean = true;

	async onload() {
        await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('file-check', 'Enregistrer un fichier de référence', async (evt: MouseEvent) => {
			comparaison();
			new Notice('Fichier de référence créé !');
		});
		
		this.addRibbonIcon('file-plus', 'Créer un nouveau fichier', async (evt: MouseEvent) => {
			const templateNumber = await openTemplateModal(this.app, this.settings.templates);
			const parentFolder = this.app.workspace.getActiveFile()?.parent as TFolder;
			this.createFile(templateNumber,parentFolder);
		});
		

		this.addRibbonIcon('folder-sync', 'Redmine', async (evt: MouseEvent) => {
			const apiKey = this.settings.apiKey;
			//get all projects from redmine
			let projects = await getRedmineProject(apiKey);
			//select a project
			let project = await openRedmineProjectsModal(app, projects);
			//get all issues from the selected project
			let issues = await getRedmineIssues(apiKey, project.id);
			//select files to be uploaded
			const allFiles = app.vault.getMarkdownFiles().filter(file => file.path.startsWith("Projet/")).reverse();
			let filesSelected = await openFileModal(app,allFiles);
			new Notice('Redmine Sync Done !');

			//get all id issue
			let idIssueList = [];
			for (const issue of issues) {
				const idIssue = getNumberFromTitle(issue.subject);
				if (idIssue != null){
					idIssueList.push(idIssue);
				}
			}

			filesSelected.forEach(async file => {
				const fileId = await getIDFromFile(file);
				//file id not in idIssueList -> create a new issu
				if (fileId != null && !idIssueList.includes(fileId)){
					createIssue(apiKey, file, project.id);
				}
				//file in idIssueList -> modify already created issue
				else if (fileId != null){
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

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		//Choose a template and create a file 
		this.addCommand({
			id: 'template-selection',
			name: 'Template Selection',
			callback: async () => {
				const templateNumber = await openTemplateModal(this.app, this.settings.templates);
				const parentFolder = this.app.workspace.getActiveFile()?.parent as TFolder;
				this.createFile(templateNumber, parentFolder);
			}
		});

		//Create a reference file and a final file
		this.addCommand({
			id : 'create-reference-file',
			name : 'Create reference file',
			callback: async() => {
				await comparaison();
				new Notice('Fichier de référence créé !');
			},
		});

		this.addCommand({
			id : 'activate-navigator',
			name : 'Activate navigator',
			callback: () => {
				this.activateView();
			},		})

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		//this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

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
			
			const newFilePath = `${folder.path}/${digits} Titre${digits}.md`;
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
	/*
	async create_folder() {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const folderPath = activeFile.path.substring(0, activeFile.path.lastIndexOf('/'));
			const parentFolder = activeFile.parent;
			if (parentFolder != null){
				const digits = await getNextNumber(parentFolder);
				const newFolderPath = `${folderPath}/${digits} Fichier`;
				await this.app.vault.createFolder(newFolderPath);
				
		
				const newFilePath = `${newFolderPath}/${digits}.1 Titre.md`;
				let id = this.getID()+1;
				await this.app.vault.create(newFilePath, `---\nid: ${id}\n---`);
				await this.setID(id);
		
				this.app.workspace.openLinkText(newFilePath, '', true);
			}
		}
	}
	*/
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
		this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData()};
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
					break;
				}
			}
		}
		if(!project_folder_created){
			await vault.createFolder("Projet");
		}
	}
}

