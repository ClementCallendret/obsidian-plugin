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
  
        // Concaténer le début du chemin de destination avec la fin du chemin source
        const combinedTargetPath = targetPath.substring(0, targetPath.lastIndexOf("/")) + sourcePath.substring(sourcePath.lastIndexOf("/"));
        console.log("targetPath : ", targetPath);
        console.log("sourcePath : ", sourcePath);
        console.log("combinedTargetPath : ", combinedTargetPath);
        // Déplacer le fichier/dossier avec app.fileManager.renameFile
        await this.insert_new_file(sourcePath, targetPath);
        console.log("insert_new_file done");
        await this.app.fileManager.renameFile(sourceFile, combinedTargetPath);
  
        console.log("Fichier/dossier déplacé avec succès !");
  
        // Mettre à jour l'interface après le déplacement si nécessaire
        await this.updateFileList();
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
    console.log("Source path : ", source_path);
    console.log("Target path : ", target_path);
    let number = 0;
    let source_file = this.app.vault.getAbstractFileByPath(source_path);

    //récupérer le numéro du fichier précédent
    let target_file = this.app.vault.getAbstractFileByPath(target_path);
    if (target_file != null && target_file instanceof TFile) {
      number = parseInt(await this.get_numero_from_file(target_file) ?? '0');
    }

    console.log("Number : ", number);

    
    //révcupérer le nom du dossier parent
    console.log("Target file : ", target_file);
    let parent_folder = target_file?.parent;
    if (parent_folder != null) {
      //Cas 1 : même dossier
      if (source_file?.parent == parent_folder) {
        console.log("Same folder");
        //idée : nom random temporaire sur le file source puis on décale tout les fichiers et enfin on met le fichier source à la bonne place
      }
      //Cas 2 : dossier différent
      else {
        console.log("Different folder");
        console.log("Parent folder : ", parent_folder); 
        //Pour chaque fichier du dossier + reverse pour commencer par le dernier
        console.log("Parent folder children : ", parent_folder.children);

        for ( const file of parent_folder.children.reverse()) {
          console.log("File : ", file);
          let numero = await this.get_numero_from_file(file);
          let match2 = file.name.match(/^\d+(\.\d+)*\s+/);
          if (match2) {
            console.log("Match2 : ", match2); 
            //récupérer le numéro du fichier
            let number2 = parseInt(match2[0]?.trim().split('.').pop() ?? '');
            console.log("Number2 : ", number2); 
            //Si le numéro est supérieur ou égale au fichier qu'on insère, on le décale de 1
            if (number2 >= number) {
              let new_name = parent_folder.path + "/" + file.name.replace(/^\d+(\.\d+)*\s+/, (number2+1).toString() + ' ');
              console.log("New name : ", new_name);
              await this.app.fileManager.renameFile(file, new_name);
            }
          }
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

}
