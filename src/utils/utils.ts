import { Menu, Notice, TAbstractFile, TFile, TFolder } from "obsidian";

// Get ID from metadata
export async function getIDFromFile(filepath: TFile) {
    let filedata = await this.app.vault.read(filepath);
    const idMatch = filedata.match(/id:\s*(\d+)/);
    const id = idMatch ? parseInt(idMatch[1], 10) : null;
    return id;
}

// Get next number for a file to be created
export async function getNextNumber(parent_folder: TFolder): Promise<string> {
    let parent_number = getNumber(parent_folder.name);
    if (parent_number != "") {
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

// Check if file is already open: yes -> return file leaf | no -> return null
export function fileAlreadyOpen(filePath: string) {
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

// Delete a folder and all its children
export async function deleteFolder(folder: TFolder) {
    let children = folder.children;
    for (let child of children) {
        if (child instanceof TFolder) {
            await deleteFolder(child);
        } else if (child instanceof TFile) {
            await app.vault.trash(child, true);
        }
    }
    await app.vault.trash(folder, true);
}

// Rename all folders and their children
export async function renameFolderChildren(parent_folder: TFolder, number: number): Promise<void> {
    let children = parent_folder.children;
    
    // Separate folders and files
    let folders = [...children.filter(child => child instanceof TFolder) as TFolder[]];
    let files = [...children.filter(child => child instanceof TFile) as TFile[]];

    // Rename subfolders first to avoid name conflicts
    if (number > 0) {
        folders.reverse();
        files.reverse();
    }

    for (let folder of folders) {
        await renameFolder(folder, number);
    }

    // Rename files after subfolders
    for (let file of files) {
        await renameFile(file, number);
    }
}

//rename folder and childrens
export async function renameFolder(folder: TFolder, number: number) {
    let folder_number = getLastNumber(folder.name);
    let new_path = folder.path;

    // Case 1: The folder is contained in a folder that has been renamed
    if (number == 0 && folder.parent != null) {
        new_path = folder.parent.path + "/" + getNumber(folder.parent.name) + "." + getLastNumber(folder.name) + " " + getTitleWithoutNumber(folder.name);
    }
    // Case 2: Increment folders if necessary
    else if (number > 0 && folder_number >= number && folder.parent != null) {
        new_path = folder.parent.path + "/" + incrementLastNumber(folder.name);
    }
    // Case 3: Decrement folders if necessary
    else if (number < 0 && folder_number >= (-number) && folder.parent != null) {
        new_path = folder.parent.path + "/" + decrementLastNumber(folder.name);
    }

    // If the folder path has changed -> rename it
    if (folder.path != new_path) {
        await this.app.fileManager.renameFile(folder, new_path);
        let renamedFolder = this.app.vault.getAbstractFileByPath(new_path) as TFolder;
        await renameFolderChildren(renamedFolder, 0);
    } else {
        // Recursion to rename subfolders and files if no name change
        await renameFolderChildren(folder, number);
    }
}

//rename a file
export async function renameFile(file: TFile, number: number) {
    let file_number = getLastNumber(file.name);
    let new_path = file.path;
    
    // Case 1: The file is contained in a folder that has been renamed
    if (number == 0 && file.parent != null) {
        new_path = file.parent.path + "/" + getNumber(file.parent.name) + "." + getLastNumber(file.name) + " " + getTitleWithoutNumber(file.name);
    }
    // Case 2: Increment files if necessary
    else if (number > 0 && file_number >= number && file.parent != null) {
        new_path = file.parent.path + "/" + incrementLastNumber(file.name);
    }
    // Case 3: Decrement files if necessary
    else if (number < 0 && file_number >= (-number) && file.parent != null) {
        new_path = file.parent.path + "/" + decrementLastNumber(file.name);
    }

    // If the file path has changed -> rename it
    if (file.path != new_path) {
        await this.app.fileManager.renameFile(file, new_path);
    }
}

//get last number from title
export function getLastNumber(title: string): number {
    // Separate the "number" part from the "title" part
    const [numberPart] = title.split(" ");
    
    // Separate numbers by dots
    const numberArray = numberPart.split(".");
    
    // Get the last element of the array
    const lastNumber = numberArray.pop();
    
    // Convert to number
    return lastNumber ? parseFloat(lastNumber) : NaN;
}

//get number from title
export function getNumber(title: string): string {
    // Split the input string into two parts: before and after the first space
    const [numberPart, ...rest] = title.split(" ");

    // Check if the first part contains only numbers and dots
    const numberRegex = /^[0-9.]+$/;
    if (numberRegex.test(numberPart)) {
        return numberPart;
    }

    // If not, return an empty string
    return "";
}

//get title without number
export function getTitleWithoutNumber(title: string): string {
    // Find the index of the first space
    const spaceIndex = title.indexOf(" ");
    
    // Return the part after the first space
    if (spaceIndex !== -1) {
        return title.substring(spaceIndex + 1);
    } else {
        // If no space is found, return the entire string
        return title;
    }
}

//increment last number of a title
export function incrementLastNumber(title: string): string {
    const regex = /(\d+(\.\d+)*)(\s+.*)?$/; 
    const match = title.match(regex);

    if (!match) {
        return title;
    }

    const numPart = match[1]; 
    const restPart = match[3] ?? ""; 

    const numParts = numPart.split('.'); 
    const lastNum = parseInt(numParts.pop()!); 

    if (isNaN(lastNum)) {
        return title;
    }

    const incrementedNum = lastNum + 1; 

    const newNumPart = numParts.join('.') + '.' + incrementedNum.toString(); 

    let res = newNumPart + restPart;
    return res.replace(/^\.+/, '');
}

//decrement last number of a title
export function decrementLastNumber(title: string): string {
    const regex = /(\d+(\.\d+)*)(\s+.*)?$/; 
    const match = title.match(regex);

    if (!match) {
        return title;
    }

    const numPart = match[1]; 
    const restPart = match[3] ?? ""; 

    const numParts = numPart.split('.'); 
    const lastNum = parseInt(numParts.pop()!); 

    if (isNaN(lastNum)) {
        // If the last number is not a valid number, return the input as is
        return title;
    }

    const incrementedNum = lastNum - 1; 

    const newNumPart = numParts.join('.') + '.' + incrementedNum.toString(); 

    // Reconstruct the string with the incremented number and the rest of the string
    let res = newNumPart + restPart;
    return res.replace(/^\.+/, '');
}

//setup folders needed
export async function setupFolders() {
    let vault = app.vault;
    const root_folder = vault.getFolderByPath("/")?.children;
    let reference_folder_created = false;
    let saves_folder_created = false;
    let final_save_created = false;
    if (root_folder != null) {
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
    if (!final_save_created) {
        await vault.createFolder("Finals");
    }
}

//split metadata and content of a file
export function splitMetadataAndContent(file: string): { metadata: string, content: string } {
    // Regex to capture metadata
    const metadataRegex = /^---([\s\S]*?)^---/m;
    const match = file.match(metadataRegex);

    if (!match) {
        throw new Error('Invalid input format: metadata section (enclosed by "---") not found.');
    }

    const metadata = match[1].trim();
    const content = file.substring(match[0].length).trim();

    return { metadata, content };
}

//get the title without the number
export function getTitleNumber(title: string): number | null {
    const match = title.match(/^(\d+)/);
    if (match) {
        return parseInt(match[0], 10);
    }
    return null;
}

//remove the second lines of all tables
function removeSecondLineFromAllTables(markdownContent: string): string {
    // Regex to identify Markdown tables
    const tableRegex = /(\|.*\|)\n(\|.*\|)\n((?:\|.*\|(?:\n|$))+)/g;
    return markdownContent.replace(tableRegex, (match, header, separator, rows) => {
        // Re-form the table by removing the second line
        return `${header}\n${rows}`;
    });
}

//format data from Obsidian to Redmine
export function formatDataObsidianToRedmine(data: string): string {
    data = removeSecondLineFromAllTables(data);
    return data;
}

export async function start(){
    let vault = app.vault;
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