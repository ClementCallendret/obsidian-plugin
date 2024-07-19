import { App, Modal } from 'obsidian';
import { Template } from '../settings/setting';

class TemplateModal extends Modal {
    onTemplateSelected: (templateNumber: number) => void;
    templates : Template[];
    constructor(app: App, templates: Template[], onTemplateSelected: (templateNumber: number) => void) {
        super(app);
        this.templates = templates;
        this.onTemplateSelected = onTemplateSelected;
    }

    onOpen() {
        const { contentEl } = this;

        this.modalEl.style.width = '80%';

        const titleEl = contentEl.createEl('h2', { text: 'Sélectionnez un template' });
        titleEl.addClass('center-text'); 

        const gridContainer = contentEl.createEl('div', { cls: 'template-grid-container' });

        const templates = this.templates;

        templates.forEach((template, index) => {
            const templateCard = gridContainer.createEl('div', { cls: 'template-card' });
            const title = "Template " + (index + 1); 
            const titleEl = templateCard.createEl('h3', { text: title });
            titleEl.addClass('center-text'); 

            const previewEl = templateCard.createEl('div', { cls: 'template-preview' });
            previewEl.innerHTML = template.preview;

            templateCard.addEventListener('click', () => {
                this.onTemplateSelected(index + 1);
                this.close();
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export function openTemplateModal(app: App, templates : Template[]): Promise<number> {
    return new Promise<number>((resolve) => {
        new TemplateModal(app, templates, (templateNumber: number) => {
            resolve(templateNumber); 
        }).open();
    });
}

