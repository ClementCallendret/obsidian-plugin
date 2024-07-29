import { stat } from 'fs';
import { Notice, requestUrl, RequestUrlParam, TFile } from 'obsidian';
import { openFileModal } from 'src/modal/fileModal';
import { openRedmineProjectsModal } from 'src/modal/redmineProjectsModal';
import {  formatDataObsidianToRedmine, getIDFromFile, getTitleNumber, orderNoteFiles, splitMetadataAndContent } from 'src/utils/utils';

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
    // There is a bug with Redmine, sometimes we get "Internal Error"
    let response = {status: 500, json : {}};
    while (response.status != 204) {
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
    response = await requestUrl(requestParams);
    }
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

export async function redmineSync(apiKey: string) {
			//get all projects from redmine
			let projects = await getRedmineProject(apiKey);
			//select a project
			let project = await openRedmineProjectsModal(app, projects);
			//get all issues from the selected project
			let issues = await getRedmineIssues(apiKey, project.id);
			//select files to be uploaded
			let allFiles = app.vault.getMarkdownFiles().filter(file => file.path.startsWith("Projet/")).reverse();
            allFiles = await orderNoteFiles(allFiles);
			let filesSelected = await openFileModal(app,allFiles);

			//get all id issue
			let idIssueList = [];
			for (const issue of issues) {
				const idIssue = getTitleNumber(issue.subject);
				if (idIssue != null){
					idIssueList.push(idIssue);
				}
			}
			filesSelected.forEach(async file => {
				const fileId = await getIDFromFile(file);
				//file id not in idIssueList -> create a new issu
				if (fileId != null && !idIssueList.includes(fileId)){
					await createIssue(apiKey, file, project.id);
				}
				//file in idIssueList -> modify already created issue
				else if (fileId != null){
					await updateIssue(apiKey, file, issues[idIssueList.indexOf(fileId)].id);
				}
				else{
					console.error("Error no ID in the file");
				}
			});
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