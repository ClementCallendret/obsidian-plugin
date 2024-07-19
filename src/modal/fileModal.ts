import { App, Modal, TFile } from 'obsidian';

export class FileModal extends Modal {
    onFilesSelected: (files: TFile[]) => void;
    files: TFile[];
    selectedFiles: Set<TFile>;

    constructor(app: App, fileList: TFile[], onFilesSelected: (files: TFile[]) => void) {
        super(app);
        this.files = fileList;
        this.onFilesSelected = onFilesSelected;
        this.selectedFiles = new Set<TFile>();
    }

    onOpen() {
        const { contentEl } = this;

        this.modalEl.style.width = '80%';

        const titleEl = contentEl.createEl('h2', { text: 'Sélectionner les fichiers à synchroniser' });
        titleEl.addClass('center-text');

        const validateButton = contentEl.createEl('button', { text: 'Valider la sélection' });
        validateButton.addClass('validate-button');
        validateButton.addEventListener('click', () => {
            this.onFilesSelected(Array.from(this.selectedFiles));
            this.close();
        });

        const gridContainer = contentEl.createEl('div', { cls: 'file-grid-container' });

        const files = this.files;
        files.forEach((file) => {
            const fileCard = gridContainer.createEl('div', { cls: 'file-card' });
            const title = file.basename;
            const titleEl = fileCard.createEl('h3', { text: title });
            titleEl.addClass('center-text'); 

            fileCard.style.backgroundColor = '#272A33';

            fileCard.addEventListener('click', () => {
                if (this.selectedFiles.has(file)) {
                    this.selectedFiles.delete(file);
                    fileCard.style.backgroundColor = '#272A33';
                } else {
                    this.selectedFiles.add(file);
                    fileCard.style.backgroundColor = '#4CAF50';
                }
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export function openFileModal(app: App, files: TFile[]): Promise<TFile[]> {
    return new Promise<TFile[]>((resolve) => {
        new FileModal(app, files, (selectedFiles: TFile[]) => {
            resolve(selectedFiles);
        }).open();
    });
}
