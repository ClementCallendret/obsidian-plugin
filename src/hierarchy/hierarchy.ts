import * as Diff from 'diff';
import { markdownDiff } from 'markdown-diff';

import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as fs from 'fs';
import {TFolder, Notice, TFile, WorkspaceLeaf} from 'obsidian';
import {createFolders, get_id_from_file, get_next_number } from '../utils/utils';

async function compareMarkdownFiles() {
    const file1 = app.vault.getAbstractFileByPath('Projet/1 Titre1.md');
    const file2 =  app.vault.getAbstractFileByPath('Projet/2 Titre2.md');

    const data1 = await app.vault.read(file1 as TFile);
    const data2 = await app.vault.read(file2 as TFile);


    const res = markdownDiff(data1, data2);
    await app.vault.create('Projet/aDiff.md', res);
} 

//Comparer les données des fichiers 
//Si une phrase a été changée, on marque l'entiereté de la phrase
export async function compareString(oldContent: string, newContent: string) {
    try {
        //TODO Créer des phrases différentes à l'aide des points puis
        //Utiliser la fonction diffLines sur chaque phrase

        //const diff = Diff.diffWords(oldContent, newContent);
        let oldContent = (`La ville était calme sous le ciel étoilé.
Les lumières scintillaient doucement dans la nuit.
Un chat noir traversa la rue déserte.
Le vent soufflait légèrement à travers les arbres.
Des voitures passaient sporadiquement au loin.
Une brise fraîche apportait une douceur à l'air.
Les étoiles brillaient intensément dans l'obscurité.
Les rues pavées semblaient silencieuses et vides.
Une enseigne clignotait au coin de la rue.
Un parfum de fleurs flottait dans l'air.`);
        let newContent = (`La ville était calme sous le ciel étoilé.
Les lumières scintillaient doucement dans la nuit.
Un chat noir traversa la rue déserte.
Le vent soufflait légèrement à travers les arbres.
Des voitures passaient sporadiquement au loin.
Une brise fraîche apportait une douceur à l'air.
Les étoiles brillaient intensément dans l'obscurité.
Les rues pavées semblaient anciennes et mystérieuses.
Un vieux piano résonnait depuis un bar voisin.
Un parfum de café flottait dans la brise nocturne.`);

        oldContent = addNewline(oldContent);
        newContent = addNewline(newContent);    

        const diff = Diff.diffLines(oldContent, newContent);
        let textRuns: TextRun[] = [];    
        diff.forEach((part) => {
            if (part.added) {
                textRuns.push(new TextRun({
                    text: deleteNewLine("\n" + part.value),
                    highlight: "FFFF00",
                    bold: true
                }));
            } else if (part.removed) {
                textRuns.push(new TextRun({
                    text: deleteNewLine("\n" + part.value),
                    strike: true,
                    color: "FF0000"
                }));
            } else {
                textRuns.push(new TextRun({
                    text: deleteNewLine("\n" + part.value)
                }));
            }
        });
        /*
        let paragraph = new Paragraph({
            children: textRuns
        });
        let doc = new Document({
            sections: [{
                children: [paragraph]
            }]
        });



        const referenceFolderPath = app.vault.getAbstractFileByPath('Références')?.path;
        let absolutePath = '';
        console.log('Chemin du dossier "reference":', referenceFolderPath);
        if (referenceFolderPath) {
            // Récupérer l'adaptateur FileSystem pour obtenir le chemin absolu dans le système de fichiers local
            const fsAdapter = app.vault.adapter as FileSystemAdapter;
            absolutePath = fsAdapter.getFullPath(referenceFolderPath);
            
            console.log('Chemin absolu du dossier "reference":', absolutePath);
        } else {
            console.error('Le dossier "reference" n\'existe pas.');
        }

        // Générer le document Word
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(absolutePath + "/DocWordddd.docx", buffer);
        new Notice(`Document Word généré : ${absolutePath}`);
         */
    } catch (error) {
        console.error('Erreur lors de la génération du document Word :', error);
        new Notice('Erreur lors de la génération du document Word. Vérifiez la console pour plus de détails.');
    }
       
}

//Comparer les fichiers
export async function comparaison(){
    //Création des dossiers
    await createFolders();
    //creation du fichier de référence et de sa version pour la comparaison
   
    await concatenate_all_notes();
     
    let LastAndPrevious = getLastAndPreviousFile();
    if (LastAndPrevious != null && LastAndPrevious.lastfile != null && LastAndPrevious?.previousfile != null) {
        //On lit les fichiers
        let last_file_data = await app.vault.read(LastAndPrevious.lastfile as TFile);
        let previous_file_data = await app.vault.read(LastAndPrevious.previousfile as TFile);
    
        //On compare les fichiers
        console.log("last file data : ", last_file_data);
        console.log("previous file data : ", previous_file_data);

        let final_data = compareFilesData(previous_file_data, last_file_data);
        
        final_data = addNewlinesBeforeTables(final_data);

        final_data = removeDelImage(final_data);

        final_data = replaceHtmlTags(final_data);

        //On crée le fichier final
        const parent_folder = app.vault.getFolderByPath("Références");
        let digits = 0;
        if (parent_folder != null) {
            digits = +await get_next_number(parent_folder);
        }
        
        await app.vault.create(`Finals/${digits - 1} Final.md`, final_data);
        await app.workspace.openLinkText(``,`Finals/${digits - 1} Final.md`, true);
    
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


function compareFilesData(file1 : string, file2 : string): string{
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
                //texteFinal += compareString(part1, part2);
                texteFinal += markdownDiff(part1, part2);
            }
        }
        else{
            texteFinal += "*** "+extractFileContent(file2, id2.toString()) + " ***";
        }
        texteFinal += '\n';
    }
    return texteFinal;
}

export async function concatenate_all_notes() {
    const vault = this.app.vault;
    const files = vault.getMarkdownFiles().reverse();

    const nb_files = files.length;

    let content_ref = '';
    let content_save = '';
    let id_list  = [];

    for (const file of files){
        if (!file.path.startsWith('Références') && !file.path.startsWith('Saves') && !file.path.startsWith('Finals')) {
            let data = await vault.read(file);
            let match = data.match(/---\n(?:.|\n)*\n---\n([\s\S]*)/);
            let data_wt_meta = match ? match[1] : null;

            const id = await get_id_from_file(file);
            if (id != null){
                id_list.push(id);
                content_save += `@@@@@@@@@@\n${id}\n@@@@@@@@@@\n`;
    
                content_ref += `## ${file.basename}\n${data_wt_meta}\n\n`;
                content_save += `## ${file.basename}\n${data_wt_meta}\n\n`;
            }
        }
    }
    //Récupérer le prochain nombre
    const parent_folder = app.vault.getFolderByPath("Références");
    let digits = 0;
    if (parent_folder != null) {
        digits = +await get_next_number(parent_folder);
    }

    //Creation fichier référence
    const ref_newFilePath = `/Références/${digits} Référence.md`;
    await vault.create(ref_newFilePath, content_ref);		

    //Creation fichier save
    const save_newFilePath = `Saves/${digits} Save.md`;
    await vault.create(save_newFilePath, id_list + '\n' + content_save);
}

//get number from file name
export function getNumber(input: string): string {
    // Sépare la partie "nombre" de la partie "titre"
    const [numberPart] = input.split(" ");
    
    // Retourne directement la partie "nombre"
    return numberPart;
  }

function addNewline(input: string): string {
    return input.replace(/\./g, '.\n@@@a');
}
function deleteNewLine(input: string): string {
    return input.replace(/\n@@@a/g, '');
}

//get list of numbers from a file content
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

// get the last and previous file
function getLastAndPreviousFile() {
    let reference: TFolder | null = null;
    const root = app.vault.getRoot();
    
    // On récupère le chemin du dossier Saves
    for (const child of root.children) {
        if (child instanceof TFolder && child.name === 'Saves') {
            reference = child;
            break;
        }
    }

    // On récupère les deux derniers fichiers
    let last_file: TFile | null = null;
    let previous_file: TFile | null = null;
    
    if (reference !== null) {
        let last_number = -Infinity;
        let previous_number = -Infinity;

        for (const child of reference.children) {
            if (child instanceof TFile) {
                const number = Number(getNumber(child.name));

                if (number > last_number) {
                    previous_number = last_number;
                    previous_file = last_file;
                    last_number = number;
                    last_file = child;
                } else if (number > previous_number) {
                    previous_number = number;
                    previous_file = child;
                }
            }
        }
    } else {
        new Notice('Dossier Saves introuvable');
        return null;
    }
    return { lastfile: last_file, previousfile: previous_file };
}

function addNewlinesBeforeTables(markdown: string): string {
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

function removeDelImage(str: string): string {
    // Utilise une expression régulière pour trouver et supprimer les éléments encadrés par <del>...</del>
    return str.replace(/<del>!\[\[.*?\]\]<\/del>/g, '');
}

function replaceHtmlTags(input: string): string {
    return input
        .replace(/<del>\s*/g, '<del>***')
        .replace(/\s*<\/del>/g, '***</del> ')
        .replace(/<ins>\s*/g, '***')
        .replace(/\s*<\/ins>/g, '***')
        .replace(/(\*\*\*\*\*\*)/g, '');
}