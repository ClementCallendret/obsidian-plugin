import { stat } from 'fs';
import { requestUrl, RequestUrlParam, TFile } from 'obsidian';
import {  formatDataObsidianToRedmine, getIDFromFile, splitMetadataAndContent } from 'src/utils/utils';

const fs = require('fs');

interface RedmineIssue {
    project_id: number;
    subject: string;
    description: string;
    tracker_id?: number;
    status_id?: number;
    priority_id?: number;
    assigned_to_id?: number;
}

export async function getRedmineProject(apiKey: string) {
    const apiUrl = 'https://ticket.iocean.fr/projects.json';

    const headers = {
        "X-Redmine-API-Key": apiKey
    };

    const response = await requestUrl({ url: apiUrl, headers });
    return response.json.projects;
}

// Create a new issue in the specified project with the tracker and status
export async function createIssue(apiKey: string, file: TFile, project_id: number) {
    // There is a bug with Redmine, sometimes we get "Internal Error"
    let response = {status: 500, json : {}};
    while(response.status != 201) {
        const data = splitMetadataAndContent(await app.vault.read(file));
        const title = await getIDFromFile(file) + " " + file.basename;
        const requestParams: RequestUrlParam = {
            url: "https://ticket.iocean.fr/issues.json",
            method: "POST",
            contentType: "application/json",
            body: JSON.stringify({
                "issue": {
                    "project_id": project_id,
                    "subject": title,
                    "description": formatDataObsidianToRedmine(data.content),
                }
            }),
            headers: {
                "X-Redmine-API-Key": apiKey
            },
            throw: false 
        };
        response = await requestUrl(requestParams);
    }
    return response.json;
}

// Update an issue by changing its description
// TO KEEP THE ORIGINAL CONTENT, REPLACE "description" WITH "notes"
export async function updateIssue(apiKey: string, file: TFile, issueId: number) {
    const data = splitMetadataAndContent(await app.vault.read(file));
    const title = await getIDFromFile(file) + " " + file.basename;
    const requestParams: RequestUrlParam = {
        url: `https://ticket.iocean.fr/issues/${issueId}.json`,
        method: "PUT",
        contentType: "application/json",
        body: JSON.stringify({
            "issue": {
                "subject": title,
                "description": formatDataObsidianToRedmine(data.content),
            }
        }),
        headers: {
            "X-Redmine-API-Key": apiKey
        },
        throw: false // This property is optional and defaults to true
    };
    const response = await requestUrl(requestParams);
}

// Get all issues for a specific project
export async function getRedmineIssues(apiKey: string, projectId: number) {
    const apiUrl = `https://ticket.iocean.fr/issues.json?project_id=${projectId}`;

    const headers = {
        "X-Redmine-API-Key": apiKey
    };

    const response = await requestUrl({ url: apiUrl, headers });
    return response.json.issues;
}


//comparaison entre les fichiers
/*
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
*/