import { ItemView, TAbstractFile, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import get_ordre_from_file from "../../main";

let folder_expand: Set<string> = new Set();

export const VIEW_TYPE_EXAMPLE = "example-view";

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

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return "Example view";
  }

  async onOpen() {
    this.updateFileList();
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

    let treeFileList = await this.parcoursProfondeur(this.app.vault.getRoot(), 0);

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

      listItem.addEventListener("click", async () => {
        const filePath = listItem.getAttribute("data-path");
        const type = listItem.getAttribute("data-type");

        if (filePath) {
          if (type === "file") {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file) {
              this.app.workspace.openLinkText(filePath, "", true);
            }
          }

          if (type === "folder") {
            const folder = treeFile.tfolder as TFolder;
            if (this.isFolderInExpandList(folder.path)) {
              folder_expand.delete(folder.path);
            } else {
              folder_expand.add(folder.path);
            }
            await this.updateFileList();
          }
        }
      });

      if (type === "folder" && this.isFolderInExpandList(treeFile.tfolder.path)) {
        const childrenList = await this.parcoursProfondeur(
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
      const container = this.containerEl.children[1];
      const draggedIndex = Array.from(container.children).indexOf(this.draggedItem!);
      const targetIndex = Array.from(container.children).indexOf(target);

      //console.log('container', container, 'draggedIndex', draggedIndex, 'targetIndex', targetIndex, 'event', event);
     
  
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

        //console.log('targetPath', targetPath, 'sourcePath', sourcePath);
     
        // Concaténer le début du chemin de destination avec la fin du chemin source
        let target_file = this.app.vault.getAbstractFileByPath(targetPath);

        
        //console.log("targetPath : ", targetPath);
        //console.log("sourcePath : ", sourcePath);
        //console.log("combinedTargetPath : ", combinedTargetPath);
        // Déplacer le fichier/dossier avec app.fileManager.renameFile
        //Rennomage des fichiers/dossiers
        this.insert_new_file(sourcePath, targetPath);
        /*
        console.log("------------------INSERT NEW FILE DONE------------------");
        //renommage elem déplacé
        let new_path = "";
        if (target_file != null){
          new_path = target_file.parent?.path + "/" + this.getNumber(target_file.name) + " " + this.getTitleWithoutNumber(sourceFile.name);
        }
        console.log("insert_new_file done");
        console.log("sourceFile : ", sourceFile);
        console.log("new_path : ", new_path);
        this.app.fileManager.renameFile(sourceFile, new_path);
  */
        console.log("Fichier/dossier déplacé avec succès !");
  
        // Mettre à jour l'interface après le déplacement si nécessaire
        await this.updateFileList();
        //this.app.workspace.openLinkText(new_path, "", true);
      } catch (error) {
        console.error("Erreur lors du déplacement du fichier/dossier :", error);
      }
    } 
    
  }
  
  
  
  

  private handleDragEnd(event: DragEvent) {
    const container = this.containerEl.children[1];
    const items = container.getElementsByClassName("sortable-item");
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as HTMLElement;
      item.classList.remove("drag-over");
      item.classList.remove("dragging");
    }
    this.draggedItem = null;
  }

private async parcoursProfondeur(parentFolder: TFolder, depth: number): Promise<TreeFile[]> {
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
                const nestedFiles = await this.parcoursProfondeur(child, depth + 1);
                result.push(...nestedFiles);
            }
        } else {
            result.push(new TreeFile(depth, child));
        }
    }

    return result;
}
  

async insert_new_file(source_path: string, target_path: string) {
  console.log("--------------insert new file -----------------");
  console.log("Source path : ", source_path);
  console.log("Target path : ", target_path);
  let source = this.app.vault.getAbstractFileByPath(source_path);
  let target = this.app.vault.getAbstractFileByPath(target_path);
  let target_file_last_number = 0;
  let source_file_last_number = 0;
  let new_path = "";

  if (target != null) {
    console.log("Target file name : ", target.name);
    target_file_last_number = this.getLastNumber(target.name);  
    console.log("Target file last number : ", target_file_last_number);
  }
  if (source != null) {
    console.log("Source file name : ", source.name);
    source_file_last_number = this.getLastNumber(source.name);
    console.log("Source file last number : ", source_file_last_number);
  }

  //récupérer le nom du dossier parent
  console.log("Target file : ", target);
  let parent_folder = target?.parent;
  if (parent_folder != null) {
    //Cas 1 : même dossier
    if (source?.parent == parent_folder && target != null) {
      console.log("Same folder");
      //Cas 1.1 : le fichier target est un fichier
      console.log("CAS 1.1");
      //future path
      let new_path = parent_folder.path + "/" + this.getNumber(target.name) + " " + this.getTitleWithoutNumber(source.name);
      //give the source file a temporary name so we can move other files without getting in collision
      let temporary_path = parent_folder.path + "/" + "temp" + " " + this.getTitleWithoutNumber(source.name);
      console.log("Temporary name : ", temporary_path);
      await this.app.fileManager.renameFile(source, temporary_path);

      // Libérer l'espace pour le fichier source
      console.log("ON LIBERE LA PLACE DU FICHIER SOURCE")
      console.log("target last number : ", target_file_last_number);
      this.reorder_files(parent_folder as TFolder, source_file_last_number, target_file_last_number);
      console.log("Réordonner les fichiers terminé");

      // Renommer le fichier source au nouveau chemin
      await this.app.fileManager.renameFile(this.app.vault.getAbstractFileByPath(temporary_path), new_path);

      //if file is a folder then rename all the child
      if (source instanceof TFolder){
        this.rename_folder_children(source as TFolder, 0);
      }
    }
    //Cas 2 : dossier différent
    else {
      console.log("-------------Different folder-----------------");
      //Incrémenter de 1 les fichiers dans le dossier cible
      this.rename_folder_children(parent_folder as TFolder, target_file_last_number);

      //On récupère le parent du fichier source avant de le déplacer 
      let source_parent;
      if (source?.parent != null){
        source_parent  = this.app.vault.getAbstractFileByPath(source?.parent.path);
      }

      //Déplacer le fichier source dans le dossier cible
      if (target != null && source != null ){
        new_path = target.parent?.path + "/" + this.getNumber(target.name) + " " + this.getTitleWithoutNumber(source.name);
        console.log("DEPLACEMENT DU SOURCE FILE DANS LE DOSSIER CIBLE")
        await this.app.fileManager.renameFile(source, new_path);

        if (source instanceof TFolder){
          this.rename_folder_children(source as TFolder, 0);
        }
      } else {
        console.log("-------------------ERROR-------------------");
        console.log("Erreur lors du déplacement du fichier source dans le dossier cible");
      }

      console.log("Source file : ", source);
      console.log("target", target);
      console.log("new_path", new_path);
      console.log("insert_new_file done");

      //Décrémenter de 1 les fichiers dans le dossier source
      this.rename_folder_children(source_parent as TFolder, (-source_file_last_number));
    }
  }
}

// Renommer tous les fichiers dans un dossier + tous les sous-dossiers
rename_folder_children(parent_folder: TFolder, number: number) {
  console.log("-------------------rename_folder_children-------------------");
  console.log("Parent folder : ", parent_folder);
  console.log("Number : ", number);

  let children = parent_folder.children;
  
  // Séparer les dossiers et les fichiers
  let folders = children.filter(child => child instanceof TFolder) as TFolder[];
  let files = children.filter(child => child instanceof TFile) as TFile[];

  // Renommer les sous-dossiers en premier pour éviter les conflits de noms
  if (number > 0) {
      folders.reverse();
      files.reverse();
  }

  for (let folder of folders) {
      console.log("folder : ", folder);
      this.rename_folder(folder, number);
  }

  // Renommer les fichiers après les sous-dossiers
  for (let file of files) {
    console.log("file : ", file);
      this.rename_file(file, number);
  }
}

rename_folder(folder: TFolder, number: number) {
  let folder_number = this.getLastNumber(folder.name);
  let new_path = folder.path;

  // Cas 1 : le dossier est contenu dans un dossier qui s'est fait renommer
  if (number == 0 && folder.parent != null) {
      console.log("---------------------------- number = 0 ----------------------------");
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
      this.app.fileManager.renameFile(folder, new_path)
          .then(() => {
              // Récursion pour renommer les sous-dossiers et fichiers du dossier renommé
              let renamedFolder = this.app.vault.getAbstractFileByPath(new_path) as TFolder;
              this.rename_folder_children(renamedFolder, 0);
          });
  } else {
      // Récursion pour renommer les sous-dossiers et fichiers si pas de changement de nom
      this.rename_folder_children(folder, number);
  }
}

rename_file(file: TFile, number: number) {
  let file_number = this.getLastNumber(file.name);
  let new_path = file.path;

  // Cas 1 : le fichier est contenu dans un dossier qui s'est fait renommer
  if (number == 0 && file.parent != null) {
      console.log("---------------------------- number = 0 ----------------------------");
      new_path = file.parent.path + "/" + this.getNumber(file.parent.name) + "." + this.getLastNumber(file.name) + " " + this.getTitleWithoutNumber(file.name);
  }
  // Cas 2 : Incrémenter les fichiers si besoin
  else if (number > 0 && file_number >= number && file.parent != null) {
    console.log("---------------------------- number > 0 ----------------------------");
    console.log("file.parent.path : ", file.parent.path, "this.incrementLastNumber(file.name) : ", this.incrementLastNumber(file.name));
    new_path = file.parent.path + "/" + this.incrementLastNumber(file.name);
  }
  // Cas 3 : Décrémenter les fichiers si besoin
  else if (number < 0 && file_number >= (-number) && file.parent != null) {
    console.log("---------------------------- number < 0 ----------------------------");
    new_path = file.parent.path + "/" + this.decrementLastNumber(file.name);
  }

  // Si le chemin du fichier a changé -> le renommer
  if (file.path != new_path) {
    console.log("Rename file : ", file.path, " to ", new_path);
    this.app.fileManager.renameFile(file, new_path);
  }
}

// Réordonner les fichiers dans le dossier pour libérer l'espace pour le fichier source
reorder_files(parent_folder: TFolder, source_number: number, target_number: number) {
  console.log("-------------------reorder_files-------------------");
  console.log("Parent folder : ", parent_folder);
  console.log("Source number : ", source_number);
  console.log("Target number : ", target_number);

  let children = parent_folder.children as TFile[];

  // Si le fichier source est déplacé vers l'avant dans la numérotation
  if (source_number > target_number) {
    for (let i = source_number - 1; i >= target_number; i--) {
      let file = children.find(child => this.getLastNumber(child.name) === i);
      if (file) {
        let new_path = parent_folder.path + "/" + this.incrementLastNumber(file.name);
        this.app.fileManager.renameFile(file, new_path);
      }
    }
  }
  // Si le fichier source est déplacé vers l'arrière dans la numérotation
  else {
    for (let i = source_number + 1; i <= target_number; i++) {
      let file = children.find(child => this.getLastNumber(child.name) === i);
      if (file) {
        let new_path = parent_folder.path + "/" + this.decrementLastNumber(file.name);
        this.app.fileManager.renameFile(file, new_path);
      }
    }
  }
}
  

  async get_numero_from_file(filepath: TFile): Promise<string | null> {
    let fileData = await this.app.vault.read(filepath);
    const numeroMatch = fileData.match(/numero:\s*"([\d.]+)"/);
    const numero = numeroMatch ? numeroMatch[1] : null;
    return numero;
  }

  async set_numero_from_file(filepath:TFile, new_numero:string){
		let file_data = await this.app.vault.read(filepath);
		const new_data = file_data.replace(/(numero:\s*")([\d.]+)"/, `$1${new_numero}"`);
		await this.app.vault.modify(filepath, new_data);
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
}
