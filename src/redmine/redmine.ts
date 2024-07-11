import { markdownDiff } from 'markdown-diff';
import { requestUrl } from 'obsidian';
import { addNewlinesBeforeTables, removeDelImage, replaceHtmlTags } from 'src/hierarchy/hierarchy';
import { splitMetadataAndContent } from 'src/utils/utils';

const fs = require('fs');
import { Redmine, RedmineTS } from 'redmine-ts';
//import axios from 'axios';
/*
curl -H "X-Redmine-API-Key: apiKey" https://ticket.iocean.fr/projects.json

*/



export async function getRedmineProject(apiKey : string){
    const apiUrl = 'https://ticket.iocean.fr/projects.json';

    const headers = {
        "X-Redmine-API-Key": apiKey
        }
        
        const response = await requestUrl({url: apiUrl, headers})
    return response.json;

}

export function redmineSync(){
    
}

//comparaison entre les fichiers
export async function testRedmine2(response : any) {
    console.log(response.issues[0].subject);
    console.log(response.issues[0].description);
    const allFiles = app.vault.getMarkdownFiles().filter(file => file.path.startsWith("Projet/"));
    console.log("All files", allFiles);
    for (const issue of response.issues) {
        console.log("Issue subject :",issue.subject);
        for (const file of allFiles) {

            if (file.basename == issue.subject) {
                
                console.log("file name == issue.subject :",file.name);
                const fileData = await app.vault.read(file);
                let { metadata, content } = splitMetadataAndContent(fileData);
                metadata = "---\n" + metadata + "\n---\n"

                let newContent = markdownDiff(content, issue.description);
                console.log("newContent",newContent);
                //post traitement
                
                newContent = addNewlinesBeforeTables(newContent);

                newContent = removeDelImage(newContent);

                newContent = replaceHtmlTags(newContent);
                

                console.log("Final : ", metadata + newContent);
                await app.vault.modify(file, metadata + newContent);
                //await app.vault.adapter.write(file.path, newContent);
                console.log("file modified");
            }
        }
    }
}