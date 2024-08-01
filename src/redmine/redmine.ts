import { stat } from 'fs';
import { Upload } from 'lucide';
import { App, Notice, requestUrl, RequestUrlParam, TFile } from 'obsidian';
import { openFileModal } from 'src/modal/fileModal';
import { openRedmineProjectsModal } from 'src/modal/redmineProjectsModal';
import {  formatDataObsidianToRedmine, getIDFromFile, getTitleNumber, orderNoteFiles, removeSpaces, splitMetadataAndContent } from 'src/utils/utils';
import { convert } from './SvgToPng';

const fs = require('fs');

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
    const data = splitMetadataAndContent(await this.app.vault.read(file));
    const title = await getIDFromFile(file) + " " + file.basename;
    const formatData = await formatDataObsidianToRedmine(apiKey,data.content)
    while(response.status != 201) {
        console.log("formatData",formatData);
        const requestParams: RequestUrlParam = {
            url: "https://ticket.iocean.fr/issues.json",
            method: "POST",
            contentType: "application/json",
            body: JSON.stringify({
                "issue": {
                    "project_id": project_id,
                    "subject": title,
                    "description": formatData.data,
                    "uploads": formatData.uploads
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
    const data = splitMetadataAndContent(await this.app.vault.read(file));
    const title = await getIDFromFile(file) + " " + file.basename;
    const formatData = await formatDataObsidianToRedmine(apiKey,data.content)
    while (response.status != 204) {
    const requestParams: RequestUrlParam = {
        url: `https://ticket.iocean.fr/issues/${issueId}.json`,
        method: "PUT",
        contentType: "application/json",
        body: JSON.stringify({
            "issue": {
                "subject": title,
                "description": formatData.data,
                "uploads": formatData.uploads
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
    let project = await openRedmineProjectsModal(this.app, projects);
    //get all issues from the selected project
    let issues = await getRedmineIssues(apiKey, project.id);
    //select files to be uploaded
    let allFiles = this.app.vault.getMarkdownFiles().filter(file => file.path.startsWith("Projet/")).reverse();
    allFiles = await orderNoteFiles(allFiles);
    let filesSelected = await openFileModal(this.app,allFiles);

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

export async function redmineSendImage(apiKey: string, file:TFile):Promise<string>{
    //In case internal server error, send again
    let body;
    if (file.extension == "canvas"){
        console.log(file);
        body = await convert(file);
    }
    else{
        console.log("not canvas")
        body = await this.app.vault.readBinary(file);
    }
    let response = {status: 500, json : {upload: {token: ""}}};
    while (response.status != 201) {
        const requestParams: RequestUrlParam = {
            url: `https://ticket.iocean.fr/uploads.json?filename=${removeSpaces(file.basename)}`,
            method: "POST",
            contentType: "application/octet-stream",
            body: body,
            headers: {
                "X-Redmine-API-Key": apiKey
            },
        };
        response = await requestUrl(requestParams);
        console.log(response);
    }
    return response.json.upload.token;
}