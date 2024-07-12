import { markdownDiff } from 'markdown-diff';
import { requestUrl, RequestUrlParam, TFile } from 'obsidian';
import { addNewlinesBeforeTables, removeDelImage, replaceHtmlTags } from 'src/hierarchy/hierarchy';
import {  get_id_from_file, splitMetadataAndContent } from 'src/utils/utils';

const fs = require('fs');
import { Redmine, RedmineTS } from 'redmine-ts';
//import axios from 'axios';
/*
curl -H "X-Redmine-API-Key: apiKey" https://ticket.iocean.fr/projects.json

*/

interface RedmineIssue {
    project_id: number;
    subject: string;
    description: string;
    tracker_id?: number;
    status_id?: number;
    priority_id?: number;
    assigned_to_id?: number;
}

export async function getRedmineProject(apiKey : string){
    const apiUrl = 'https://ticket.iocean.fr/projects.json';

    const headers = {
        "X-Redmine-API-Key": apiKey
        }
        
    const response = await requestUrl({url: apiUrl, headers})
    return response.json;

}
//projet + tracker + statut
export async function createIssue(apiKey : string, file : TFile){
    const requestParams: RequestUrlParam = {
        url: "https://ticket.iocean.fr/issues.json",
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify({
            "issue": {
                "project_id": 239,
                "subject": "test depuis obsidian",
                "description": "description test",
            }
        }),
        headers: {
            "X-Redmine-API-Key": apiKey
            },
        throw: false // Cette propriété est optionnelle et par défaut à true
    };
    console.log("requestParams",requestParams);
    const response = await requestUrl(requestParams)
    console.log("response",response);
    return response.json;
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