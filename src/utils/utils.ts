import { get } from "http";
import {Menu, Notice, TAbstractFile, TFile, TFolder } from "obsidian";

//Comparer les versions de deux fichiers
export async function compare_versions(a : TFile, b : TFile): Promise<number> {
    const num_a = await get_numero_from_file(a);
    const num_b = await get_numero_from_file(b);

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

//récupérer l'id des métadonnées
export async function get_id_from_file(filepath:TFile){
    let filedata = await this.app.vault.read(filepath);
    const idMatch = filedata.match(/id:\s*(\d+)/);
    const id = idMatch ? parseInt(idMatch[1], 10) : null;
    return id;
}

//Avoir le prochain numéro de fichier
export async function get_next_number(parent_folder: TFolder): Promise<string> {
    let parent_number = getNumber(parent_folder.name);
    if (parent_number != ""){
        parent_number += ".";
    }
    let last_number = 0;
    let files = [...parent_folder.children];
    for (const file of files) {
        let file_number = getLastNumber(file.name);
        if (file_number > last_number) {
            last_number = file_number;
        }
    }
    return parent_number + (last_number + 1).toString();
}


//Récupérer le numéro des métadonnées
export async function get_numero_from_file(filepath:TFile){
    let filedata = await this.app.vault.read(filepath);
    const numeroMatch = filedata.match(/numero:\s*"([\d.]+)"/);
    const numero = numeroMatch ? numeroMatch[1] : null;
    return numero;
}

//Récupérer l'ordre des métadonnées
export async function get_ordre_from_file(filepath:TFile){
    let filedata = await this.app.vault.read(filepath);
    const ordreMatch = filedata.match(/ordre:\s*(\d+)/);
    const ordre = ordreMatch ? parseInt(ordreMatch[1], 10) : null;
    return ordre;
}

	

//set le numéro dans les métadonnées
export async function set_numero_from_file(filepath:TFile, new_numero:string){
    let file_data = await this.app.vault.read(filepath);
    const new_data = file_data.replace(/(numero:\s*")([\d.]+)"/, `$1${new_numero}"`);
    await this.app.vault.modify(filepath, new_data);
}

//set l'ordre des différents fichiers dans les métadonnées
export async function set_order(){
    const vault = this.app.vault;
    const files = [...vault.getMarkdownFiles().reverse()];
    let list_file = [];
    for (let i = 0; i < files.length; i++){
        const file = files[i];
        set_ordre_from_file(file, i);
        let numero = await get_numero_from_file(file);

        if(numero != null){
            list_file.push(file);
        }
    }
}

//set l'ordre dans les métadonnées
export async function set_ordre_from_file(filepath:TFile, new_ordre:number){
    let file_data = await this.app.vault.read(filepath);
    const new_data = file_data.replace(/(ordre:\s*)\d+/, `$1${new_ordre}`);
    await this.app.vault.modify(filepath, new_data);
}

//Check si le fichier est déjà ouvert : si Oui :  retourne la feuille, si Non : retourne null
export function file_already_open (filePath : string) {
    const { workspace } = this.app;
    const openLeaves = workspace.getLeavesOfType('markdown');
    for (const leaf of openLeaves) {
      const viewState = leaf.getViewState();
      if (viewState.state.file === filePath) {
        return leaf;
      }
    }
    return null;
}

//Delete a folder and all its children
export async function delete_folder(folder : TFolder){
    let children = folder.children;
    for (let child of children) {
        if (child instanceof TFolder) {
            await delete_folder(child);
        } else if (child instanceof TFile) {
            await app.vault.trash(child, true);
        }
    }
    await app.vault.trash(folder, true);
}

  // Renommer tous les fichiers dans un dossier + tous les sous-dossiers
  export async function  rename_folder_children(parent_folder: TFolder, number: number) : Promise<void>{
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
        await rename_folder(folder, number);
    }

    // Renommer les fichiers après les sous-dossiers
    for (let file of files) {
        await rename_file(file, number);
    }
  }

export async function rename_folder(folder: TFolder, number: number) {
    let folder_number = getLastNumber(folder.name);
    let new_path = folder.path;

    // Cas 1 : le dossier est contenu dans un dossier qui s'est fait renommer
    if (number == 0 && folder.parent != null) {
        new_path = folder.parent.path + "/" + getNumber(folder.parent.name) + "." + getLastNumber(folder.name) + " " + getTitleWithoutNumber(folder.name);
    }
    // Cas 2 : Incrémenter les dossiers si besoin
    else if (number > 0 && folder_number >= number && folder.parent != null) {
        new_path = folder.parent.path + "/" + incrementLastNumber(folder.name);
    }
    // Cas 3 : Décrémenter les dossiers si besoin
    else if (number < 0 && folder_number >= (-number) && folder.parent != null) {
        new_path = folder.parent.path + "/" + decrementLastNumber(folder.name);
    }

    // Si le chemin du dossier a changé -> le renommer
    if (folder.path != new_path) {
        await this.app.fileManager.renameFile(folder, new_path);
        let renamedFolder = this.app.vault.getAbstractFileByPath(new_path) as TFolder;
        await rename_folder_children(renamedFolder, 0);

    } 
    else {
        // Récursion pour renommer les sous-dossiers et fichiers si pas de changement de nom
        await rename_folder_children(folder, number);
    }
  }

export async function rename_file(file: TFile, number: number) {
  let file_number = getLastNumber(file.name);
  let new_path = file.path;
  // Cas 1 : le fichier est contenu dans un dossier qui s'est fait renommer
  if (number == 0 && file.parent != null) {
      new_path = file.parent.path + "/" + getNumber(file.parent.name) + "." + getLastNumber(file.name) + " " + getTitleWithoutNumber(file.name);
      
  }
  // Cas 2 : Incrémenter les fichiers si besoin
  else if (number > 0 && file_number >= number && file.parent != null) {
    new_path = file.parent.path + "/" + incrementLastNumber(file.name);
  }
  // Cas 3 : Décrémenter les fichiers si besoin
  else if (number < 0 && file_number >= (-number) && file.parent != null) {
      new_path = file.parent.path + "/" + decrementLastNumber(file.name);
  }

  // Si le chemin du fichier a changé -> le renommer
  if (file.path != new_path) {
      await this.app.fileManager.renameFile(file, new_path);
  }
}

export function getLastNumber(input: string): number {
    // Sépare la partie "nombre" de la partie "titre"
    const [numberPart] = input.split(" ");
    
    // Sépare les nombres par les points
    const numberArray = numberPart.split(".");
    
    // Récupère le dernier élément du tableau
    const lastNumber = numberArray.pop();
    
    // Convertit en nombre
    return lastNumber ? parseFloat(lastNumber) : NaN;
}

export function getNumber(input: string): string {
    // Sépare la chaîne d'entrée en deux parties : avant et après le premier espace
    const [numberPart, ...rest] = input.split(" ");

    // Vérifie si la première partie contient uniquement des nombres et des points
    const numberRegex = /^[0-9.]+$/;
    if (numberRegex.test(numberPart)) {
        return numberPart;
    }

    // Si ce n'est pas le cas, retourne une chaîne vide
    return "";
  }

export function getTitleWithoutNumber(input: string): string {
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

export function incrementLastNumber(input: string): string {
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

export function decrementLastNumber(input: string): string {
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


export async function createFolders(){
    let vault = app.vault;
    const root_folder = vault.getFolderByPath("/")?.children;
    let reference_folder_created = false;
    let saves_folder_created = false;
    let final_save_created = false;
    if (root_folder != null){
        for (const children of root_folder) {
            if (children.name == "Références") {
                reference_folder_created = true;
            }
            if (children.name == "Saves") {
                saves_folder_created = true;
            }
            if (children.name == "Finals") {
                final_save_created = true;
            }
        }
    }
    if (!reference_folder_created) {
        await vault.createFolder("Références");
    }
    if (!saves_folder_created) {
        await vault.createFolder("Saves");
    }
    if(!final_save_created){
        await vault.createFolder("Finals");
    }
}

export function splitMetadataAndContent(input: string): { metadata: string, content: string } {
    const metadataRegex = /^---([\s\S]*?)^---/m; // Regex pour capturer les métadonnées
    const match = input.match(metadataRegex);

    if (!match) {
        throw new Error('Invalid input format: metadata section (enclosed by "---") not found.');
    }

    const metadata = match[1].trim();
    const content = input.substring(match[0].length).trim();

    return { metadata, content };
}