import {App, ItemView,Menu,Modal, Notice, TAbstractFile, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import { deleteFolder, fileAlreadyOpen, getNextNumber, getLastNumber, renameFolderChildren} from "../utils/utils";
import { openTemplateModal } from '../modal/templateModal';
import MyPlugin from "main";

let folder_expand: Set<string> = new Set();

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

  private isFolderInExpandList(folderPath: string): boolean {
    return folder_expand.has(folderPath);
  }

  private getFolderIcon(folderPath: string): string {
    return this.isFolderInExpandList(folderPath) ? "▼" : "▶";
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

      // Ajouter une icône d'expansion/rétraction pour les dossiers
      if (type === "folder") {
        const icon = innerDiv.createEl("span", {
          cls: "folder-icon",
          text: this.getFolderIcon(treeFile.tfolder.path),
        });
        icon.style.marginRight = "8px";
      }

      innerDiv.createEl("span", {
        text: `${treeFile.tfolder.name}`,
      });

        // Ajout du gestionnaire d'événement pour le clic droit (contextmenu)
        
      listItem.addEventListener("contextmenu", async (event) => {
          event.preventDefault(); // Empêche le menu contextuel par défaut
          const filePath = listItem.getAttribute("data-path");
          const type = listItem.getAttribute("data-type");

          // Appel à la fonction createContextMenu avec les données appropriées
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
            console.log("folder expand", folder_expand);
            if (this.isFolderInExpandList(folder.path)) {
              folder_expand.delete(folder.path);
            } else {
              folder_expand.add(folder.path);
            }
          }
        await this.updateFileList();
        }
      });

      if (type === "folder" && this.isFolderInExpandList(treeFile.tfolder.path)) {
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
  
      // Récupérer le chemin du fichier/dossier source
      const sourcePath = this.draggedItem!.getAttribute("data-path");

      if (!sourcePath) {
        console.error("Le chemin source n'est pas valide.");
        return;
      }

      try {
        // Obtenir l'objet TAbstractFile correspondant au chemin source
        const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);

        if (!sourceFile) {
          throw new Error("Impossible de trouver le fichier source.");
        }

        // Récupérer le chemin du fichier/dossier cible
        const targetPath = target.getAttribute("data-path");

        if (!targetPath) {
          console.error("Le chemin cible n'est pas valide.");
          return;
        }
        //Deplacement sur place
        if (sourcePath != targetPath){
          const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
          const targetFile = this.app.vault.getAbstractFileByPath(targetPath);
          
          if (sourceFile != null && targetFile != null && getLastNumber(sourceFile.name) != 0 && getLastNumber(targetFile.name) != 0){
            this.moveFile(sourcePath, targetPath);
        }
        else{
          console.error("tentative de déplacement de notes")
        }
        // Mettre à jour l'interface après le déplacement si nécessaire
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


async depthFirstSearch(parentFolder: TFolder, depth: number): Promise<TreeFile[]> {
    let result: TreeFile[] = [];

    // Fonction de comparaison personnalisée pour trier les noms de fichiers/dossiers
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

    const sortedChildren = parentFolder.children.sort((a, b) => compareNames(a.name, b.name));

    for (let child of sortedChildren) {
        if (child instanceof TFolder) {
            result.push(new TreeFile(depth, child));
            if (this.isFolderInExpandList(child.path)) {
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
      target_file_last_number = this.getLastNumber(target.name) ;  
      }
    if (source != null) {
      source_file_last_number = this.getLastNumber(source.name);
    }

      
    //révcupérer le nom du dossier parent
    let target_parent_folder = target?.parent;
    if (target_parent_folder != null) {
      // Cas 1 : même dossier
      if (source?.parent == target_parent_folder && target) {
        // Cas 1.1 : le fichier target est un fichier
        // Chemin temporaire pour éviter les collisions
        //if parent == root
        let temporary_path = "";
        if (target_parent_folder.path == "/"){
          temporary_path = "temp" + " " + this.getTitleWithoutNumber(source.name);
          new_path = this.getNumber(target.name)+ " " + this.getTitleWithoutNumber(source.name);
        }
        else{
          temporary_path = target_parent_folder.path + "/" + "temp" + " " + this.getTitleWithoutNumber(source.name);
          new_path = target_parent_folder.path + "/" + this.getNumber(target.name)+ " " + this.getTitleWithoutNumber(source.name);
        }
        await this.app.fileManager.renameFile(source, temporary_path);
        

        // Réordonner les fichiers pour libérer la place pour le fichier source         
        console.log("reorder files");
        await this.reorderFiles(target_parent_folder, source_file_last_number, target_file_last_number);
        // Renommer le fichier source au nouveau chemin
        let file_tempo = this.app.vault.getAbstractFileByPath(temporary_path)
        if (file_tempo != null){
          await this.app.fileManager.renameFile(file_tempo, new_path);
          
          // Renommer les enfants si le fichier source est un dossier
          let source = this.app.vault.getAbstractFileByPath(new_path);
          if (source instanceof TFolder) {
            await renameFolderChildren(source, 0);
          }
        };       
      } 
      //Cas 2 : dossier différent
      else {
        if (source?.parent != this.app.vault.getRoot()){
          //Incrémenter de 1 les fichiers dans le dossier cible
          await renameFolderChildren(target_parent_folder, target_file_last_number);
          //On récupère le parent du fichier source avant de le déplacer 
          let source_parent;
          if (source?.parent != null){
            source_parent = this.app.vault.getAbstractFileByPath(source?.parent.path);
          }

          //Déplacer le fichier source dans le dossier cible
          if (target != null && source != null){
            
            //cas root
            let new_path = "";
            if (target_parent_folder.path == "/"){
              new_path = "/" + this.decrementLastNumber(this.getNumber(target.name)) + " " + this.getTitleWithoutNumber(source.name);

            }
            else{
              new_path = target.parent?.path + "/" + this.decrementLastNumber(this.getNumber(target.name)) + " " + this.getTitleWithoutNumber(source.name);
            }
            await this.app.fileManager.renameFile(source, new_path);
            
            //rafraichir le parent du fichier source
            let new_source_parent;
            
            if (source_parent?.path != null){
              new_source_parent  = this.app.vault.getAbstractFileByPath(source_parent?.path );
            }

            //Décrémenter de 1 les fichiers dans le dossier source
            await renameFolderChildren(new_source_parent as TFolder, (-source_file_last_number));
            
            if (source instanceof TFolder){
              await renameFolderChildren(source as TFolder,0);
            }
              
          }
        }
      }
    }
	}


  /*

  // Renommer tous les fichiers dans un dossier + tous les sous-dossiers
  async renameFolderChildren(parent_folder: TFolder, number: number) : Promise<void>{
    let children = parent_folder.children;
    
    // Séparer les dossiers et les fichiers
    let folders = [...children.filter(child => child instanceof TFolder) as TFolder[]];
    let files = [...children.filter(child => child instanceof TFile) as TFile[]];

    // Renommer les sous-dossiers en premier pour éviter les conflits de noms
    if (number > 0) {
        folders.reverse();
        files.reverse();
    }

    for (let folder of folders) {
        await this.renameFolder(folder, number);
    }

    // Renommer les fichiers après les sous-dossiers
    for (let file of files) {
        await this.renameFile(file, number);
    }
  }

  async renameFolder(folder: TFolder, number: number) {
    let folder_number = this.getLastNumber(folder.name);
    let new_path = folder.path;

    // Cas 1 : le dossier est contenu dans un dossier qui s'est fait renommer
    if (number == 0 && folder.parent != null) {
        new_path = folder.parent.path + "/" + this.getNumber(folder.parent.name) + "." + this.getLastNumber(folder.name) + " " + this.getTitleWithoutNumber(folder.name);
    }
    // Cas 2 : Incrémenter les dossiers si besoin
    else if (number > 0 && folder_number >= number && folder.parent != null) {
        new_path = folder.parent.path + "/" + this.incrementLastNumber(folder.name);
    }
    // Cas 3 : Décrémenter les dossiers si besoin
    else if (number < 0 && folder_number >= (-number) && folder.parent != null) {
        new_path = folder.parent.path + "/" + this.decrementLastNumber(folder.name);
    }

    // Si le chemin du dossier a changé -> le renommer
    if (folder.path != new_path) {
        console.log("Rename folder : ", folder.path, " to ", new_path);
        await this.app.fileManager.renameFile(folder, new_path);
        let renamedFolder = this.app.vault.getAbstractFileByPath(new_path) as TFolder;
        await renameFolderChildren(renamedFolder, 0);

    } 
    else {
        // Récursion pour renommer les sous-dossiers et fichiers si pas de changement de nom
        await renameFolderChildren(folder, number);
    }
  }

async renameFile(file: TFile, number: number) {
  let file_number = this.getLastNumber(file.name);
  let new_path = file.path;
  // Cas 1 : le fichier est contenu dans un dossier qui s'est fait renommer
  if (number == 0 && file.parent != null) {
      new_path = file.parent.path + "/" + this.getNumber(file.parent.name) + "." + this.getLastNumber(file.name) + " " + this.getTitleWithoutNumber(file.name);
      
  }
  // Cas 2 : Incrémenter les fichiers si besoin
  else if (number > 0 && file_number >= number && file.parent != null) {
    new_path = file.parent.path + "/" + this.incrementLastNumber(file.name);
  }
  // Cas 3 : Décrémenter les fichiers si besoin
  else if (number < 0 && file_number >= (-number) && file.parent != null) {
      new_path = file.parent.path + "/" + this.decrementLastNumber(file.name);
  }

  // Si le chemin du fichier a changé -> le renommer
  if (file.path != new_path) {
      console.log("Rename file : ", file.path, " to ", new_path);
      await this.app.fileManager.renameFile(file, new_path);
  }
}
*/

// Réordonner les fichiers dans le dossier pour libérer l'espace pour le fichier source
async reorderFiles(parent_folder: TFolder, source_number: number, target_number: number): Promise<void> {
  // Copie du dossier parent et de ses enfants
  const children = [... parent_folder.children ];

  // Si le fichier source est déplacé vers l'avant dans la numérotation
  if (source_number > target_number) {
      console.log("CAS 1 : source_number > target_number")
      children.reverse();
      for (const child of children) {
          let child_last_number = this.getLastNumber(child.name);
          if (child_last_number >= target_number && child_last_number < source_number) {
              let new_path = parent_folder.path + "/" + this.incrementLastNumber(child.name);
              if (this.isFolderInExpandList(child.path)){
                console.log("Child in expand list", child);
                folder_expand.delete(child.path);
                await this.app.fileManager.renameFile(child, new_path);
                folder_expand.add(child.path);
              }
              else{
                await this.app.fileManager.renameFile(child, new_path);
              }

              // Child est un Folder
              console.log("Child ", child);
              console.log("folder expand", folder_expand)
              if (child instanceof TFolder) {
                  await renameFolderChildren(child, 0);
              }
          }
      }
  }
  // Si le fichier source est déplacé vers l'arrière dans la numérotation
  else {
    console.log("CAS 2 : source_number < target_number")
    for (const child of children) {
      let child_last_number = this.getLastNumber(child.name);
      if (child_last_number <= target_number && child_last_number > source_number) {
        let new_path = parent_folder.path + "/" + this.decrementLastNumber(child.name);
        await this.app.fileManager.renameFile(child, new_path);
        // Child est un Folder
        if (child instanceof TFolder) {
          if (this.isFolderInExpandList(child.path)){
            console.log("Child in expand list", child);
          }
            await renameFolderChildren(child, 0);
        }
      }
    }
  }
}

  
getLastNumber(input: string): number {
  // Sépare la partie "nombre" de la partie "titre"
  const [numberPart] = input.split(" ");
  
  // Sépare les nombres par les points
  const numberArray = numberPart.split(".");
  
  // Récupère le dernier élément du tableau
  const lastNumber = numberArray.pop();
  
  // Convertit en nombre
  return lastNumber ? parseFloat(lastNumber) : NaN;
}

getNumber(input: string): string {
  // Sépare la partie "nombre" de la partie "titre"
  const [numberPart] = input.split(" ");
  
  // Retourne directement la partie "nombre"
  return numberPart;
}

  getTitleWithoutNumber(input: string): string {
    // Trouve l'indice du premier espace
    const spaceIndex = input.indexOf(" ");
    
    // Retourne la partie après le premier espace
    if (spaceIndex !== -1) {
        return input.substring(spaceIndex + 1);
    } else {
        // Si aucun espace n'est trouvé, retourne la chaîne complète
        return input;
    }
  }

  incrementLastNumber(input: string): string {
    const regex = /(\d+(\.\d+)*)(\s+.*)?$/; // Regex pour capturer le dernier nombre
    const match = input.match(regex);

    if (!match) {
        // Aucun nombre trouvé à la fin, retourner l'entrée telle quelle
        return input;
    }

    const numPart = match[1]; // Partie contenant le nombre
    const restPart = match[3] ?? ""; // Partie restante après le nombre, si présente

    const numParts = numPart.split('.'); // Séparer les parties du nombre par les points
    const lastNum = parseInt(numParts.pop()!); // Extraire et convertir le dernier nombre en entier

    if (isNaN(lastNum)) {
        // Si le dernier nombre n'est pas un nombre valide, retourner l'entrée telle quelle
        return input;
    }

    const incrementedNum = lastNum + 1; // Incrémenter le dernier nombre

    const newNumPart = numParts.join('.') + '.' + incrementedNum.toString(); // Reconstruire la partie nombre

    // Reconstruire la chaîne avec le nombre incrémenté et le reste de la chaîne

    let res = newNumPart + restPart;
    return res.replace(/^\.+/, '');
  }

  decrementLastNumber(input: string): string {
    const regex = /(\d+(\.\d+)*)(\s+.*)?$/; // Regex pour capturer le dernier nombre
    const match = input.match(regex);

    if (!match) {
        // Aucun nombre trouvé à la fin, retourner l'entrée telle quelle
        return input;
    }

    const numPart = match[1]; // Partie contenant le nombre
    const restPart = match[3] ?? ""; // Partie restante après le nombre, si présente

    const numParts = numPart.split('.'); // Séparer les parties du nombre par les points
    const lastNum = parseInt(numParts.pop()!); // Extraire et convertir le dernier nombre en entier

    if (isNaN(lastNum)) {
        // Si le dernier nombre n'est pas un nombre valide, retourner l'entrée telle quelle
        return input;
    }

    const incrementedNum = lastNum - 1; // Décrémenter le dernier nombre

    const newNumPart = numParts.join('.') + '.' + incrementedNum.toString(); // Reconstruire la partie nombre

    // Reconstruire la chaîne avec le nombre incrémenté et le reste de la chaîne
    let res = newNumPart + restPart;
    return res.replace(/^\.+/, '');
  }

  replaceLastNumber(input: string, new_number : number): string {
    const regex = /(\d+(\.\d+)*)(\s+.*)?$/; // Regex pour capturer le dernier nombre
    const match = input.match(regex);

    if (!match) {
        // Aucun nombre trouvé à la fin, retourner l'entrée telle quelle
        return input;
    }

    const numPart = match[1]; // Partie contenant le nombre
    const restPart = match[3] ?? ""; // Partie restante après le nombre, si présente

    const numParts = numPart.split('.'); // Séparer les parties du nombre par les points
    const lastNum = parseInt(numParts.pop()!); // Extraire et convertir le dernier nombre en entier

    if (isNaN(lastNum)) {
        // Si le dernier nombre n'est pas un nombre valide, retourner l'entrée telle quelle
        return input;
    }

    const newNumPart = numParts.join('.') + '.' + new_number.toString(); // Reconstruire la partie nombre

    // Reconstruire la chaîne avec le nombre incrémenté et le reste de la chaîne
    let res = newNumPart + restPart;
    return res.replace(/^\.+/, '');
  }

  isAChild(parent_folder : TFolder, child : TAbstractFile): boolean{
    let children_list = parent_folder.children;
    for (const children of children_list){ 
      if (children.path == child.path){
        return true;
      }
      else if (children instanceof TFolder){
        return this.isAChild(children, child);
      }
    }
    return false;
  }
  
  async createContextMenu(event: MouseEvent, filePath: string, type: string) {
    const menu = new Menu();
  
    if (type === "file") {
        menu.addItem((item) => {
            item.setTitle("Rename")
            .setIcon("pencil")
            .onClick(async () => {
                const file = app.vault.getAbstractFileByPath(filePath);
                if (file instanceof TFile) {
                    const newName = await promptForNewName(file.name);
                    if (newName) {
                        const newFilePath = `${file.parent?.path}/${newName}`;
                        await app.vault.rename(file, newFilePath);
                        new Notice(`Renamed to ${newName}`);
                    }
                }
            });
        });
  
        menu.addItem((item) => {
          item.setTitle("Delete")
          .setIcon("trash")
          .onClick(async () => {
              const file = app.vault.getAbstractFileByPath(filePath);
              if (file instanceof TFile && file.parent != null) {
                  const file_parent = { ...file.parent };
                  const file_name = file.name + "";
                  let isMarkdown = file.extension == "md";
                  await app.vault.trash(file, true);
                  if (isMarkdown) {
                      await renameFolderChildren(file_parent as TFolder, -(getLastNumber(file_name)));
                  }
                  new Notice(`Deleted ${file.name}`);
              }
          });
  
          // Ajouter la classe personnalisée pour rendre le titre et l'icône en rouge
          item.dom.classList.add('context-menu-delete-red');
      });
    } 
    else if (type === "folder") {
  
      menu.addItem((item) => {
        item.setTitle("New File")
        .setIcon("file")
        .onClick(async () => {
            const folder = app.vault.getAbstractFileByPath(filePath);
            if (folder instanceof TFolder) {
              const templateNumber = await openTemplateModal(this.app, this.MyPlugin.settings.templates);
              await this.MyPlugin.createFile(templateNumber,folder)
            }
        });
      });
  
      menu.addItem((item) => {
        item.setTitle("New Folder")
        .setIcon("folder")
        .onClick(async () => {
            const folder = app.vault.getAbstractFileByPath(filePath);
            if (folder instanceof TFolder) {
              const number = await getNextNumber(folder);
              const newFolder = await app.vault.createFolder(`${folder.path}/${number} New Folder`);
              new Notice(`Created new folder ${newFolder.name}`);
              const id = this.MyPlugin.getID() +1;
              const metadata = `---\nid: ${id}\n---\n`;		
              await app.vault.create(`${newFolder.path}/${number}.0 Notes.md`, metadata);
              this.MyPlugin.setID(id);
            }
        });
      });
  
        menu.addItem((item) => {
            item.setTitle("Rename")
            .setIcon("pencil")
            .onClick(async () => {
                const folder = app.vault.getAbstractFileByPath(filePath);
                if (folder instanceof TFolder) {
                    const newName = await promptForNewName(folder.name);
                    if (newName) {
                        const newFolderPath = `${folder.parent?.path}/${newName}`;
                        await app.vault.rename(folder, newFolderPath);
                        new Notice(`Renamed to ${newName}`);
                    }
                }
            });
        });
  
        menu.addItem((item) => {
          item.setTitle("Delete")
          .setIcon("trash")
          .onClick(async () => {
              const folder = app.vault.getAbstractFileByPath(filePath);
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
          item.dom.classList.add('context-menu-delete-red');
      });
    }
    menu.showAtMouseEvent(event);
  }



}


// Méthode pour afficher une boîte de dialogue et obtenir le nouveau nom
async function promptForNewName(oldName: string): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
      const modal = new RenameModal(this.app, oldName, resolve);
      modal.open();
  });
}

// Classe pour la boîte de dialogue de renommage
class RenameModal extends Modal {
  oldName: string;
  onSubmit: (newName: string | null) => void;

  constructor(app: App, oldName: string, onSubmit: (newName: string | null) => void) {
      super(app);
      this.oldName = oldName;
      this.onSubmit = onSubmit;
  }

  onOpen() {
      const { contentEl } = this;

      contentEl.createEl('h2', { text: 'Rename File/Folder' });

      const input = contentEl.createEl('input', {
          type: 'text',
          value: this.oldName
      });

      input.focus();

      const submitButton = contentEl.createEl('button', { text: 'Rename' });
      submitButton.onclick = () => {
          const newName = input.value.trim();
          if (newName) {
              this.onSubmit(newName);
          } else {
              this.onSubmit(null);
          }
          this.close();
      };

      const cancelButton = contentEl.createEl('button', { text: 'Cancel' });
      cancelButton.onclick = () => {
          this.onSubmit(null);
          this.close();
      };
  }

  onClose() {
      const { contentEl } = this;
      contentEl.empty();
  }
}