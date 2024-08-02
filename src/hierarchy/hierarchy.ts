import { markdownDiff } from 'markdown-diff';

//import { Document, Packer, Paragraph, Tab, TextRun } from 'docx';
import {TFolder, TFile} from 'obsidian';
import {setupFolders, getIDFromFile, getNextNumber, orderSaveFiles } from '../utils/utils';
import { openComparaisonModal } from 'src/modal/comparaisonModal';


//Comparer les fichiers
export async function comparaison(){
    //Création des dossiers
    await setupFolders();

    //creation du fichier de référence et de sa version pour la comparaison
    await concatenateAllNotes();
    
    let savesFiles = getSavesFiles();
    //Comparaison possible
    if (savesFiles != undefined && savesFiles.length >= 2){
        savesFiles = orderSaveFiles(savesFiles);
        let LastAndPrevious = await openComparaisonModal(this.app,savesFiles)

        //On lit les fichiers
        let last_file_data = await this.app.vault.read(LastAndPrevious[0] as TFile);
        let previous_file_data = await this.app.vault.read(LastAndPrevious[1] as TFile);
    
        //On compare les fichiers
        let final_data = compareFilesData(previous_file_data, last_file_data);
        
        //On crée le fichier final
        const parent_folder = this.app.vault.getFolderByPath("Références");
        let digits = 0;
        if (parent_folder != null) {
            digits = +await getNextNumber(parent_folder);
        }
        
        
        await this.app.vault.create(`Comparaison/${digits - 1} Comparaison.md`, final_data);
        await this.app.workspace.openLinkText(``,`Comparaison/${digits - 1} Comparaison.md`, true);
    
        //ouvrir en mode view
        const leaf = this.app.workspace.activeLeaf;
        if (leaf) {
            // Basculez la vue en mode lecture
            leaf.setViewState({
                ...leaf.getViewState(),
                state: {
                    ...leaf.getViewState().state,
                    mode: 'preview' // 'preview' pour le mode lecture
                }
            });
    
            
        }
    }
}

//To compare the data from the file
export function compareFilesData(file1 : string, file2 : string): string{
    //init res
    let texteFinal = '';

    //On récupère les ID des parties
    let list_id_file1 = extractNumbers(file1);
    let list_id_file2 = extractNumbers(file2);


    for (let id2 of list_id_file2){
        //Si partie déjà existante
        if (list_id_file1.includes(id2)){
            //On récupère les parties
            let part1 = extractFileContent(file1, id2.toString());
            let part2 = extractFileContent(file2, id2.toString());
            //On compare les deux parties
            if (part1 != null && part2 != null){
                texteFinal += markdownDiff(part1, part2);
            }
        }
        else{
            texteFinal += extractFileContent(file2, id2.toString());
        }
        texteFinal += '\n';
    }
    //post traitement
    
    texteFinal = addNewlinesBeforeTables(texteFinal);

    texteFinal = removeDelImage(texteFinal);

    texteFinal = replaceHtmlTags(texteFinal);
    
    return texteFinal;
}

//concatenate all notes in folder "Projet"
export async function concatenateAllNotes() {
    const vault = this.app.vault;
    const files = vault.getMarkdownFiles().reverse();

    let content_ref = '';
    let content_save = '';
    let id_list  = [];

    for (const file of files){
        if (!file.path.startsWith('Références') && !file.path.startsWith('Saves') && !file.path.startsWith('Comparaison')) {
            let data = await vault.read(file);
            let match = data.match(/---\n(?:.|\n)*\n---\n([\s\S]*)/);
            let data_wt_meta = match ? match[1] : null;

            const id = await getIDFromFile(file);
            if (id != null){
                id_list.push(id);
                content_save += `@@@@@@@@@@\n${id}\n@@@@@@@@@@\n`;
    
                content_ref += `## ${file.basename}\n${data_wt_meta}\n\n`;
                content_save += `## ${file.basename}\n${data_wt_meta}\n\n`;
            }
        }
    }
    //Récupérer le prochain nombre
    const parent_folder = this.app.vault.getFolderByPath("Références");
    let digits = 0;
    if (parent_folder != null) {
        digits = +await getNextNumber(parent_folder);
    }

    //Creation fichier référence
    const ref_newFilePath = `/Références/${digits} Référence.md`;
    await vault.create(ref_newFilePath, content_ref);		

    //Creation fichier save
    const save_newFilePath = `Saves/${digits} Save.md`;
    await vault.create(save_newFilePath, id_list + '\n' + content_save);
}

//get number from file name
export function getNumber(fileTitle: string): string {
    // Sépare la partie "nombre" de la partie "titre"
    const [numberPart] = fileTitle.split(" ");
    
    // Retourne directement la partie "nombre"
    return numberPart;
  }

//Markdown diff compare lines by lines
//add a new lines with patterns
function addNewline(input: string): string {
    return input.replace(/\./g, '.\n@@@a');
}
//delete patterns created by addNewLine
function deleteNewLine(input: string): string {
    return input.replace(/\n@@@a/g, '');
}

//get list of numbers from a saves content
function extractNumbers(input: string): number[] {
    const parts = input.split('\n');
    if (parts.length < 2 || parts[1] !== '@@@@@@@@@@') {
        throw new Error('Invalid format');
    }
    const numberPart = parts[0];
    const numberStrings = numberPart.split(',').map(str => str.trim());
    return numberStrings.map(str => {
        const num = parseFloat(str);
        if (isNaN(num)) {
            throw new Error(`Invalid number: ${str}`);
        }
        return num;
    });
}

//get content of a file from its id
function extractFileContent(data: string, fileId: string): string | null {
    // Split the data by the delimiter
    const sections = data.split('@@@@@@@@@@');

    // Iterate over the sections to find the file with the given ID
    for (let i = 1; i < sections.length; i++) {
        const section = sections[i].trim();
        // Check if the section starts with the file ID
        if (section.startsWith(fileId)) {
            // Return the content of the file (the next section)
            if (i + 1 < sections.length) {
                return sections[i + 1].trim();
            }
        }
    }
    // If the file ID was not found, return null
    return null;
}

//add new lines before tables for Obsidian Markdown
export function addNewlinesBeforeTables(markdown: string): string {
    const lines = markdown.split(/\r?\n/);
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Vérifier si la ligne actuelle est le début d'un tableau et la ligne précédente n'est pas vide
        if (line.startsWith('|') && i > 0 && lines[i - 1].trim() !== '' && !lines[i - 1].startsWith('|')) {
            result.push('');
        }

        result.push(line);
    }

    return result.join('\n');
}

//remove <del> </del> around image
export function removeDelImage(str: string): string {
    // Utilise une expression régulière pour trouver et supprimer les éléments encadrés par <del>...</del>
    return str.replace(/<del>!\[\[.*?\]\]<\/del>/g, '');
}

//replace html tags from Markdown diff
export function replaceHtmlTags(input: string): string {
    return input
        .replace(/<del>/g, '<del>***')
        .replace(/<\/del>/g, '***</del> ')
        .replace(/<ins>/g, ' ***')
        .replace(/<\/ins>/g, '***')
        .replace(/(\*\*\*\*\*\*)/g, '')
        .replace(/(\*\*\*    \*\*\*)/g, '    ')
        .replace(/&#39;/g, '\'');
}


//get all files from the "Saves" files
function getSavesFiles() : TFile[] | undefined {
    let savesFolder: TFolder | null = null;
    const root = this.app.vault.getRoot();
    
    // On récupère le chemin du dossier Saves
    for (const child of root.children) {
        if (child instanceof TFolder && child.name === 'Saves') {
            savesFolder = child;
            break;
        }
    }
    return savesFolder?.children as TFile[];
}

