import { App, Modal, Setting, Notice } from 'obsidian';

// Classe pour créer la fenêtre modale
class TemplateModal extends Modal {
    onTemplateSelected: (templateNumber: number) => void;

    constructor(app: App, onTemplateSelected: (templateNumber: number) => void) {
        super(app);
        this.onTemplateSelected = onTemplateSelected;
    }

    onOpen() {
        const { contentEl } = this;
        // Titre de la fenêtre modale
        contentEl.createEl('h2', { text: 'Sélectionnez un template' });

        // Container pour les templates en grille
        const gridContainer = contentEl.createEl('div', { cls: 'template-grid-container' });

        // Templates previews
        const templates = [
            {
                title: 'Template 1',
                preview: `
<div>
    <p>Scenario SC4 - 1 :</p>
    <ul>
        <li>-</li>
        <li>-</li>
    </ul>
    <p>Règles de gestion :</p>
    <ul>
        <li>-</li>
        <li>-</li>
    </ul>
</div>`
            },
            {
                title: 'Template 2',
                preview: `
<div>
    <p>Scenario SC5 - 1 :</p>
    <ul>
        <li>-</li>
        <li>-</li>
    </ul>
    <p>Règles de gestion :</p>
    <table class="custom-table-modal"> <!-- Utilisation de la classe spécifique -->
        <thead>
            <tr>
                <th>Code</th>
                <th>Description de la règle de gestion</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>RG5</td>
                <td>Description</td>
            </tr>
        </tbody>
    </table>
</div>`
            },
            {
                title: 'Template 3',
                preview: `
<div>
    <p>6.1 Cas d'usage n°1:</p>
    <ul>
        <li>-</li>
        <li>-</li>
    </ul>
    <p>Règles de gestion :</p>
    <table class="custom-table-modal"> <!-- Utilisation de la classe spécifique -->
        <thead>
            <tr>
                <th>N°</th>
                <th>Cas d'usage</th>
                <th>Règle</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td>Texte</td>
                <td>
                    Cas valides :
                    <ul>
                        <li>-</li>
                        <li>-</li>
                    </ul>
                    Cas d'échecs :
                    <ul>
                        <li>-</li>
                        <li>-</li>
                    </ul>
                </td>
            </tr>
            <tr>
                <td>2</td>
                <td>Texte</td>
                <td>
                    Cas valides :
                    <ul>
                        <li>-</li>
                        <li>-</li>
                    </ul>
                    Cas d'échecs :
                    <ul>
                        <li>-</li>
                        <li>-</li>
                    </ul>
                </td>
            </tr>
        </tbody>
    </table>
</div>`
            },
            {
                title: 'Template 4',
                preview: `
<div>
    <p>Scenario SC1 - 1 :</p>
    <ul>
        <li>-</li>
        <li>-</li>
    </ul>
    <p>Scenario SC1 - 2 :</p>
    <ul>
        <li>-</li>
        <li>-</li>
    </ul>
    <p>Règles de gestion :</p>
    <table class="custom-table-modal"> <!-- Utilisation de la classe spécifique -->
        <thead>
            <tr>
                <th>Code</th>
                <th>Description de la règle de gestion</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>RG1 - 1</td>
                <td>Description</td>
            </tr>
            <tr>
                <td>RG1 - 2</td>
                <td>Description</td>
            </tr>
        </tbody>
    </table>
</div>`
            }
        ];

        // Ajout des boutons avec prévisualisation pour les 4 templates
        templates.forEach((template, index) => {
            const templateCard = gridContainer.createEl('div', { cls: 'template-card' });

            const titleEl = templateCard.createEl('h3', { text: template.title });
            const previewEl = templateCard.createEl('div', { cls: 'template-preview' });
            previewEl.innerHTML = template.preview;

            const button = templateCard.createEl('button', { text: `Sélectionner ${template.title}` });
            button.onclick = () => {
                this.onTemplateSelected(index + 1);
                this.close();
            };
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Méthode pour ouvrir la fenêtre modale
export function openTemplateModal(app: App): Promise<number> {
    return new Promise<number>((resolve) => {
        new TemplateModal(app, (templateNumber: number) => {
            resolve(templateNumber); // Résoudre la promesse avec le numéro choisi
        }).open();
    });
}

function openTemplate(templateNumber: number) {
    new Notice(`Template ${templateNumber} sélectionné`);
}
