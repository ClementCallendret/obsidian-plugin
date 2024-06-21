import { TFile } from "obsidian";
import MyPlugin from "../../main";

//Comparer les versions de deux fichiers
export async function compare_versions(a : TFile, b : TFile): Promise<number> {
    console.log("a : ", a);
    console.log("b : ", b); 
    const num_a = await get_numero_from_file(a);
    const num_b = await get_numero_from_file(b);
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






//récupérer l'id des métadonnées
export async function get_id_from_file(filepath:TFile){
    let filedata = await this.app.vault.read(filepath);
    const idMatch = filedata.match(/id:\s*(\d+)/);
    const id = idMatch ? parseInt(idMatch[1], 10) : null;
    return id;
}

//Avoir le prochain numéro de fichier
export async function get_next_number(parent_folder_path: string, files: TFile[]): Promise<string> {
    console.log("Parent folder path : ", parent_folder_path);
    let result = "";
    let last_number = 0;

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let file_path = file.path;
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
    result = result + (last_number + 1).toString();
    return result;
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
    const files = vault.getMarkdownFiles().reverse();
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









