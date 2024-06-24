import * as Diff from 'diff';

import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as fs from 'fs';
import {App, FileSystemAdapter, TFolder, Notice, TFile } from 'obsidian';


import { get_next_number } from '../utils/utils';

//Comparer les données des fichiers 
//Si une phrase a été changée, on marque l'entiereté de la phrase
export async function compareFiles(oldContent: string, newContent: string) {
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

        console.log('oldContent:', oldContent);
        console.log('newContent:', newContent);

        oldContent = addNewline(oldContent);
        newContent = addNewline(newContent);    

        console.log('oldContent:', oldContent);
        console.log('newContent:', newContent);

        console.log('oldContent:', deleteNewLine(oldContent));
        console.log('newContent:', deleteNewLine(newContent));

        //const res = Diff.diffLines(oldContent, newContent);
        //console.log(res);


        const diff = Diff.diffLines(oldContent, newContent);
        let textRuns: TextRun[] = [];    
        diff.forEach((part) => {
            console.log("part", part);
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
    } catch (error) {
        console.error('Erreur lors de la génération du document Word :', error);
        new Notice('Erreur lors de la génération du document Word. Vérifiez la console pour plus de détails.');
    }
}


export async function comparaison(){
    //creation du fichier de référence
    await concatenate_all_notes();


    let root = app.vault.getRoot();
    let reference = null ;
    //On récupère le chemin du dossier Références
    for (let child of root.children){
        if (child instanceof TFolder && child.name === 'Références'){
            reference = child;
            break;
        }
    }
    
    //On récupère les deux derniers fichiers
    let last_file = null;
    let previous_file = null;
    if (reference != null && reference.children.length >= 2){
        let referenceChildList = reference.children;
        let last_number = 2;
        let previous_number = 1;
        for (let child of referenceChildList){
            if (child instanceof TFile){
                let number = Number(getNumber(child.name));
                console.log("number",number)
                if (number > last_number){
                    last_number = number;
                    last_file = child;
                }
            }
        }
        for (let child of referenceChildList){
            if (child instanceof TFile && child != last_file){
                let number = Number(getNumber(child.name));
                console.log("number",number)
                if (number > previous_number){
                    previous_number = number;
                    previous_file = child;
                }
            }
        }
        //On lit les fichiers
        let last_file_data = await app.vault.read(last_file as TFile);
        let previous_file_data = await app.vault.read(previous_file as TFile);

        //On compare les fichiers
        compareFiles(previous_file_data, last_file_data);
    }
    else{
        new Notice('Pas assez de fichiers pour comparer');
    }

} 

export async function concatenate_all_notes() {
    const vault = this.app.vault;
    const files = vault.getMarkdownFiles();

    const meta_file = `---\nid:`;
    const nb_files = files.length;

    let content = '';
    let notes = new Array(nb_files).fill(0);

    //Remise en ordre
    for (let i = nb_files - 1; i > -1; i--) {
        let file = files[i];
        let data = await vault.read(file);
        if (data.startsWith(meta_file)) {
            let match = /ordre:\s*(\d+)/.exec(data);
            if (match) {
                let ordre = parseInt(match[1]);
                notes[ordre] = file;
            }
        }
    }
    //Concaténation
    for (let j = 0; j < nb_files; j++) {
        let file = notes[j];
        if (file != 0) {
            let data = await vault.read(file);
            let match = data.match(/---\n(?:.|\n)*\n---\n([\s\S]*)/);
            let data_wt_meta = match ? match[1] : null;

            content += `## ${file.basename}\n${data_wt_meta}\n\n`;
        }
    }
    //Nom du fichier
    const root_folder = vault.getFolderByPath("/")?.children;
    let reference_folder_created = false;
    if (root_folder != null){
        for (let i = 0; i < root_folder.length; i++) {
            if (root_folder[i].name == "Références") {
                console.log("Références existe");
                reference_folder_created = true;
            }
        }
    }
    if (!reference_folder_created) {
        vault.createFolder("Références");
    }
    const digits = await get_next_number('Références', files);
    const newFilePath = `/Références/${digits} Référence.md`;
    await vault.create(newFilePath, content);		
    this.app.workspace.openLinkText(newFilePath, '', true);

}

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
    