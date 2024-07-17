import { App, Modal } from 'obsidian';


interface Project {
    created_on: string;
    description: string;
    homepage: string;
    id: number;
    identifier: string;
    inherit_members: boolean;
    is_public: boolean;
    name: string;
    status: number;
    updated_on: string;
}


export class RedmineProjectsModal extends Modal {
    onProjectSelected: (project: Project) => void;
    projects: Project[];

    constructor(app: App, projectsList: Project[], onProjectSelected: (selectedProject: Project) => void) {
        super(app);
        this.projects = projectsList;
        this.onProjectSelected = onProjectSelected;
    }

    onOpen() {
        const { contentEl } = this;

        this.modalEl.style.width = '80%';

        const titleEl = contentEl.createEl('h2', { text: 'Sélectionner un projet' });
        titleEl.addClass('center-text');

        const gridContainer = contentEl.createEl('div', { cls: 'file-grid-container' });

        this.projects.forEach((project) => {
            const projectCard = gridContainer.createEl('div', { cls: 'file-card' });
            const titleEl = projectCard.createEl('h3', { text: project.name });
            titleEl.addClass('center-text'); // Ajouter la classe pour centrer le texte

            projectCard.style.backgroundColor = '#272A33';

            projectCard.addEventListener('click', () => {
                this.onProjectSelected(project);
                this.close();
            });

            projectCard.addEventListener('mouseover', () => {
                projectCard.style.backgroundColor = '#4CAF50'; // Couleur verte au survol
                projectCard.style.cursor = 'pointer';
            });

            projectCard.addEventListener('mouseout', () => {
                projectCard.style.backgroundColor = '#272A33'; // Couleur d'origine quand le curseur quitte la carte
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Méthode pour ouvrir la fenêtre modale
export function openRedmineProjectsModal(app: App, projects: Project[]): Promise<Project> {
    return new Promise<Project>((resolve) => {
        new RedmineProjectsModal(app, projects, (selectedProject: Project) => {
            resolve(selectedProject);
        }).open();
    });
}
