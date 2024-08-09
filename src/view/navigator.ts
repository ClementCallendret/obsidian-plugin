import {ItemView,Menu, Notice, TAbstractFile, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import {decrementLastNumber, deleteFolder, fileAlreadyOpen, getNextNumber, getNumber, getLastNumber, getTitleWithoutNumber, incrementLastNumber, renameFolderChildren} from "../utils/utils";
import { openTemplateModal } from '../modal/templateModal';
import { promptForNewName } from "src/modal/renameModal";
import MyPlugin from "main";

let folder_expand: Set<TFolder> = new Set<TFolder>();

export const VIEW_TYPE_EXAMPLE = "file-flow";

class TreeFile {
  depth: number;
  tfolder: TAbstractFile;

  constructor(depth: number, tfolder: TAbstractFile) {
    this.depth = depth;
    this.tfolder = tfolder;
  }
}

export class ExampleView extends ItemView {
  private draggedItem: HTMLElement | null = null;
  private MyPlugin : MyPlugin;
  constructor(leaf: WorkspaceLeaf, Myplugin: MyPlugin) {
    super(leaf);
    this.MyPlugin = Myplugin;
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return "FileFlow";
  }

  async onOpen() {
    this.icon = "folder-open";
    await this.updateFileList();
  }

  async onClose() {
    // Nothing to clean up.
  }

  private isFolderInExpandList(folder: TFolder): boolean {
    return folder_expand.has(folder);
  }

  private getFolderIcon(folder: TFolder): string {
    return this.isFolderInExpandList(folder) ? "▼" : "▶";
  }

  public async updateFileList() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("sortable-container");

    let treeFileList = await this.depthFirstSearch(this.app.vault.getRoot(), 0);
    for (const treeFile of treeFileList) {
      let type = treeFile.tfolder instanceof TFolder ? "folder" : "file";
      let margin = -50 + treeFile.depth * 10;
      let padding = 41 + treeFile.depth * 17;

      const listItem = container.createEl("div", {
        cls: "tree-item-self is-clickable nav-file-title tappable sortable-item",
        attr: {
          draggable: "true",
          "data-path": treeFile.tfolder.path,
          style: `margin-inline-start: ${margin}px !important; padding-inline-start: ${padding}px !important;`,
          "data-type": type,
        },
      });

      const innerDiv = listItem.createEl("div", {
        cls: "tree-item-inner nav-file-title-content",
      });

    
      if (type === "folder") {
        const icon = innerDiv.createEl("span", {
          cls: "folder-icon",
          text: this.getFolderIcon(treeFile.tfolder as TFolder),
        });
        icon.style.marginRight = "8px";
      }

      innerDiv.createEl("span", {
        text: `${treeFile.tfolder.name}`,
      });

// Add event listener for right-click (contextmenu)        
      listItem.addEventListener("contextmenu", async (event) => {
          event.preventDefault(); 
          const filePath = listItem.getAttribute("data-path");
          const type = listItem.getAttribute("data-type");

          if (filePath && type) {
              await this.createContextMenu(event, filePath, type);
            }

      });

      listItem.addEventListener("click", async () => {
        const filePath = listItem.getAttribute("data-path");
        const type = listItem.getAttribute("data-type");
        if (filePath) {
          if (type === "file") {
            const file_open = fileAlreadyOpen(filePath);
            if (file_open) {
              this.app.workspace.setActiveLeaf(file_open);
            }
            else{
              this.app.workspace.openLinkText(filePath, "", true);
            }
          }

          if (type === "folder") {
            const folder = treeFile.tfolder as TFolder;
            if (this.isFolderInExpandList(folder)) {
              folder_expand.delete(folder);
            } else {
              folder_expand.add(folder);
            }
          }
        await this.updateFileList();
        }
      });

      if (type === "folder" && this.isFolderInExpandList(treeFile.tfolder as TFolder)) {
        const childrenList = await this.depthFirstSearch(
          treeFile.tfolder as TFolder,
          treeFile.depth + 1
        );
        treeFileList = treeFileList.concat(childrenList);
      }

      // Drag and drop event listeners
      listItem.addEventListener("dragstart", (event) => this.handleDragStart(event));
      listItem.addEventListener("dragover", (event) => this.handleDragOver(event));
      listItem.addEventListener("dragenter", (event) => this.handleDragEnter(event));
      listItem.addEventListener("dragleave", (event) => this.handleDragLeave(event));
      listItem.addEventListener("drop", (event) => this.handleDrop(event));
      listItem.addEventListener("dragend", (event) => this.handleDragEnd(event));
    }
  }

  // Drag and drop handlers
  private handleDragStart(event: DragEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains("sortable-item")) {
      this.draggedItem = target;
      event.dataTransfer?.setData("text/plain", "");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
      this.draggedItem.classList.add("dragging");
    }
  }

  private handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  private handleDragEnter(event: DragEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains("sortable-item") && target !== this.draggedItem) {
      target.classList.add("drag-over");
    }
  }

  private handleDragLeave(event: DragEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains("sortable-item")) {
      target.classList.remove("drag-over");
    }
  }

  private async handleDrop(event: DragEvent) {
    event.preventDefault();
    const target = event.target as HTMLElement;
     if (target.classList.contains("sortable-item")) {  
  
      const sourcePath = this.draggedItem!.getAttribute("data-path");

      if (!sourcePath) {
        console.error("Le chemin source n'est pas valide.");
        return;
      }

      try {
        const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);

        if (!sourceFile) {
          throw new Error("Impossible de trouver le fichier source.");
        }

        const targetPath = target.getAttribute("data-path");

        if (!targetPath) {
          console.error("Le chemin cible n'est pas valide.");
          return;
        }
        if (sourcePath != targetPath){
          const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
          const targetFile = this.app.vault.getAbstractFileByPath(targetPath);
          
          if (sourceFile != null && targetFile != null && getLastNumber(sourceFile.name) != 0 && getLastNumber(targetFile.name) != 0){
            await this.moveFile(sourcePath, targetPath);
        }
        else{
          console.error("tentative de déplacement de notes")
        }
        await this.updateFileList();
      }
      } catch (error) {
        console.error("Erreur lors du déplacement du fichier/dossier :", error);
      }
    } 
  }
  
  private handleDragEnd(event: DragEvent) {
    const container = this.containerEl.children[1];
    const items = Array.from(container.getElementsByClassName("sortable-item"));
    for (const item of items) {
      const element = item as HTMLElement;
      element.classList.remove("drag-over");
      element.classList.remove("dragging");
  }
    this.draggedItem = null;
  }


async depthFirstSearch(parentFolder : TFolder, depth: number): Promise<TreeFile[]> {
    let result: TreeFile[] = [];

    const compareNames = (a: string, b: string): number => {
        const regex = /(\d+|\D+)/g;
        const aParts = a.match(regex) || [];
        const bParts = b.match(regex) || [];
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || '';
            const bPart = bParts[i] || '';
            
            const aNum = parseInt(aPart, 10);
            const bNum = parseInt(bPart, 10);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                if (aNum !== bNum) {
                    return aNum - bNum;
                }
            } else {
                if (aPart !== bPart) {
                    return aPart.localeCompare(bPart);
                }
            }
        }
        
        return 0;
    };
    const parentFolderClone = {...parentFolder};
    const sortedChildren = parentFolderClone.children.sort((a, b) => compareNames(a.name, b.name));

    for (let child of sortedChildren) {
        if (child instanceof TFolder) {
            result.push(new TreeFile(depth, child));
            if (this.isFolderInExpandList(child)) {
                const nestedFiles = await this.depthFirstSearch(child, depth + 1);
                result.push(...nestedFiles);
            }
        } else {
            result.push(new TreeFile(depth, child));
        }
    }

    return result;
}
  
  //Function called when a file is moved using drag and drop
  async moveFile(source_path: string, target_path: string) {
    let source = this.app.vault.getAbstractFileByPath(source_path);
    let target = this.app.vault.getAbstractFileByPath(target_path);
    let target_file_last_number = 0;
    let source_file_last_number = 0;
    let new_path = "";


    if (target != null) {
      target_file_last_number = getLastNumber(target.name) ;  
      }
    if (source != null) {
      source_file_last_number = getLastNumber(source.name);
    }

      

    let target_parent_folder = target?.parent;
    if (target_parent_folder != null) {

      // target AND source in same folder
      if (source?.parent == target_parent_folder && target) {
        //if parent == root
        let temporary_path = "";
        if (target_parent_folder.path == "/"){
          temporary_path = "temp" + " " + getTitleWithoutNumber(source.name);
          new_path = getNumber(target.name)+ " " + getTitleWithoutNumber(source.name);
        }
        else{
          temporary_path = target_parent_folder.path + "/" + "temp" + " " + getTitleWithoutNumber(source.name);
          new_path = target_parent_folder.path + "/" + getNumber(target.name)+ " " + getTitleWithoutNumber(source.name);
        }
        await this.app.fileManager.renameFile(source, temporary_path);
        

        // Reorder file to make room to integrate the file     
        await this.reorderFiles(target_parent_folder, source_file_last_number, target_file_last_number);
        
        // Rename the file with the right path
        let file_tempo = this.app.vault.getAbstractFileByPath(temporary_path)
        if (file_tempo != null){
          await this.app.fileManager.renameFile(file_tempo, new_path);
          
          // Rename child if source is a folder
          let source = this.app.vault.getAbstractFileByPath(new_path);
          if (source instanceof TFolder) {
            await renameFolderChildren(source, 0);
          }
        };       
      } 
      //target AND source in different folder
      else {
        if (source?.parent != this.app.vault.getRoot()){
          //Make a room in target folder
          await renameFolderChildren(target_parent_folder, target_file_last_number);

          let source_parent;
          if (source?.parent != null){
            source_parent = this.app.vault.getAbstractFileByPath(source?.parent.path);
          }

          if (target != null && source != null){
            
            //root case
            let new_path = "";
            if (target_parent_folder.path == "/"){
              new_path = "/" + decrementLastNumber(getNumber(target.name)) + " " + getTitleWithoutNumber(source.name);

            }
            else{
              new_path = target.parent?.path + "/" + decrementLastNumber(getNumber(target.name)) + " " + getTitleWithoutNumber(source.name);
            }
            await this.app.fileManager.renameFile(source, new_path);
            
            let new_source_parent;
            
            if (source_parent?.path != null){
              new_source_parent  = this.app.vault.getAbstractFileByPath(source_parent?.path );
            }

            await renameFolderChildren(new_source_parent as TFolder, (-source_file_last_number));
            
            if (source instanceof TFolder){
              await renameFolderChildren(source as TFolder,0);
            }
              
          }
        }
      }
    }
	}


// Reorder the files in the folder to free up space for the source file
async reorderFiles(parent_folder: TFolder, source_number: number, target_number: number): Promise<void> {
// Copy of the parent folder and its children
const children = [... parent_folder.children ];

// If the source file is moved forward in the numbering
  if (source_number > target_number) {
      children.reverse();
      for (const child of children) {
          let child_last_number = getLastNumber(child.name);
          if (child_last_number >= target_number && child_last_number < source_number) {
              let new_path = parent_folder.path + "/" + incrementLastNumber(child.name);
              await this.app.fileManager.renameFile(child, new_path);
              // Child est un Folder
              if (child instanceof TFolder) {
                  await renameFolderChildren(child, 0);
              }
          }
      }
  }
// If the source file is moved backward in the numbering  
  else {
    for (const child of children) {
      let child_last_number = getLastNumber(child.name);
      if (child_last_number <= target_number && child_last_number > source_number) {
        let new_path = parent_folder.path + "/" + decrementLastNumber(child.name);
        await this.app.fileManager.renameFile(child, new_path);
        // Child est un Folder
        if (child instanceof TFolder) {
            await renameFolderChildren(child, 0);
        }
      }
    }
  }
}

//context Menu 
  async createContextMenu(event: MouseEvent, filePath: string, type: string) {
    const menu = new Menu();

    if (type === "file") {
        menu.addItem((item) => {
            item.setTitle("Rename")
            .setIcon("pencil")
            .onClick(async () => {
                const file = this.app.vault.getAbstractFileByPath(filePath);
                if (file instanceof TFile) {
                    const newName = await promptForNewName(file.name);
                    if (newName) {
                        const newFilePath = `${file.parent?.path}/${newName}`;
                        await this.app.vault.rename(file, newFilePath);
                        await this.updateFileList();
                        new Notice(`Renamed to ${newName}`);
                    }
                }
            });
        });

        menu.addItem((item) => {
          item.setTitle("Delete")
          .setIcon("trash")
          .onClick(async () => {
              const file = this.app.vault.getAbstractFileByPath(filePath);
              if (file instanceof TFile && file.parent != null) {
                  const file_parent = { ...file.parent };
                  const file_name = file.name + "";
                  let isMarkdown = file.extension == "md";
                  await this.app.vault.trash(file, true);
                  if (isMarkdown) {
                      await renameFolderChildren(file_parent as TFolder, -(getLastNumber(file_name)));
                  }
                  await this.updateFileList();
                  new Notice(`Deleted ${file.name}`);
              }
          });

          // Ajouter la classe personnalisée pour rendre le titre et l'icône en rouge
          (item as any).dom.classList.add('context-menu-delete-red');
      });
    } 
    else if (type === "folder") {

      menu.addItem((item) => {
        item.setTitle("New File")
        .setIcon("file")
        .onClick(async () => {
            const folder = this.app.vault.getAbstractFileByPath(filePath);
            if (folder instanceof TFolder) {
              const templateNumber = await openTemplateModal(this.app, this.MyPlugin.settings.templates);
              await this.MyPlugin.createFile(templateNumber,folder)
              await this.updateFileList();
              new Notice(`Created new file`);
            }
        });
      });


      menu.addItem((item) => {
        item.setTitle("New Canva")
        .setIcon("layout-dashboard")
        .onClick(async () => {
            const folder = this.app.vault.getAbstractFileByPath(filePath);
            if (folder instanceof TFolder) {
              const digits = await getNextNumber(folder);
              const path = `${folder.path}/${digits} New Canva${digits}.canvas`;
              await this.app.vault.create(path, `{ }`);
              await this.app.workspace.openLinkText(path, '', true);
              await this.updateFileList();
              new Notice(`Created new canva`);
            }
        });
      });

      menu.addItem((item) => {
        item.setTitle("New Folder")
        .setIcon("folder")
        .onClick(async () => {
            const folder = this.app.vault.getAbstractFileByPath(filePath);
            if (folder instanceof TFolder) {
              const number = await getNextNumber(folder);
              const newFolder = await this.app.vault.createFolder(`${folder.path}/${number} New Folder`);
              new Notice(`Created new folder ${newFolder.name}`);
              const id = this.MyPlugin.getID() +1;
              const metadata = `---\nid: ${id}\n---\n`;		
              await this.app.vault.create(`${newFolder.path}/${number}.0 Note.md`, metadata);
              this.MyPlugin.setID(id);
              await this.updateFileList();
            }
        });
      });

        menu.addItem((item) => {
            item.setTitle("Rename")
            .setIcon("pencil")
            .onClick(async () => {
                const folder = this.app.vault.getAbstractFileByPath(filePath);
                if (folder instanceof TFolder) {
                    const newName = await promptForNewName(folder.name);
                    if (newName) {
                        const newFolderPath = `${folder.parent?.path}/${newName}`;
                        folder_expand.delete(folder);
                        await this.app.vault.rename(folder, newFolderPath);
                        await this.updateFileList();
                        new Notice(`Renamed to ${newName}`);
                    }
                }
            });
        });

        menu.addItem((item) => {
          item.setTitle("Delete")
          .setIcon("trash")
          .onClick(async () => {
              const folder = this.app.vault.getAbstractFileByPath(filePath);
              if (folder instanceof TFolder && folder.parent != null) {
                  const folder_parent = { ...folder.parent };
                  const folder_name = folder.name + "";
                  await deleteFolder(folder);
                  await renameFolderChildren(folder_parent as TFolder, -(getLastNumber(folder_name)));
                  await this.updateFileList();
                  new Notice(`Deleted ${folder.name}`);
              }
          });
          // Ajouter la classe personnalisée pour rendre le titre et l'icône en rouge
          (item as any).dom.classList.add('context-menu-delete-red');
        });
    }
    menu.showAtMouseEvent(event);
  }
}