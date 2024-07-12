import { App, Modal, TFile } from 'obsidian';

export class FileModal extends Modal {
    onFilesSelected: (files: TFile[]) => void;
    files: TFile[];
    selectedFiles: Set<TFile>;
    validateButton: HTMLButtonElement;

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

        // Ajouter un bouton pour valider la sélection
        this.validateButton = contentEl.createEl('button', { text: 'Valider la sélection' });
        this.validateButton.addClass('validate-button');
        this.validateButton.disabled = true; // Désactiver le bouton au départ
        this.validateButton.style.backgroundColor = '#D3D3D3'; // Couleur grise par défaut
        this.validateButton.addEventListener('click', () => {
            this.onFilesSelected(Array.from(this.selectedFiles));
            this.close();
        });

        const gridContainer = contentEl.createEl('div', { cls: 'file-grid-container' });

        const files = this.files;
        files.forEach((file) => {
            const fileCard = gridContainer.createEl('div', { cls: 'file-card' });
            const title = file.basename;
            const titleEl = fileCard.createEl('h3', { text: title });
            titleEl.addClass('center-text'); // Ajouter la classe pour centrer le texte

            // Initialiser les files à la couleur #272A33
            fileCard.style.backgroundColor = '#272A33';

            fileCard.addEventListener('click', () => {
                if (this.selectedFiles.has(file)) {
                    this.selectedFiles.delete(file);
                    fileCard.style.backgroundColor = '#272A33';
                } else {
                    this.selectedFiles.add(file);
                    fileCard.style.backgroundColor = '#4CAF50';
                }
                this.updateValidateButtonState();
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    updateValidateButtonState() {
        if (this.selectedFiles.size === 2) {
            this.validateButton.disabled = false;
            this.validateButton.style.backgroundColor = '#4CAF50'; // Couleur verte
        } else {
            this.validateButton.disabled = true;
            this.validateButton.style.backgroundColor = '#D3D3D3'; // Couleur grise
        }
    }
}

// Méthode pour ouvrir la fenêtre modale
export function openFileModal(app: App, files: TFile[]): Promise<TFile[]> {
    return new Promise<TFile[]>((resolve) => {
        new FileModal(app, files, (selectedFiles: TFile[]) => {
            resolve(selectedFiles);
        }).open();
    });
}
