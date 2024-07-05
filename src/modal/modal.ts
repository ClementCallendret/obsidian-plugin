import { App, Modal, Setting, Notice } from 'obsidian';

// CSS personnalisé pour les lignes de tableau blanches sur fond noir
const customCSS = `
<style>
    table {
        width: 100%;
        border-collapse: collapse;
        background-color: #000; /* Fond noir */
        color: #000; /* Texte noir */
    }
    th, td {
        border: 1px solid #fff; /* Lignes blanches */
        padding: 8px;
    }
</style>
`;

// Classe pour créer la fenêtre modale
class TemplateModal extends Modal {
    onTemplateSelected: (templateNumber: number) => void;

    constructor(app: App, onTemplateSelected: (templateNumber: number) => void) {
        super(app);
        this.onTemplateSelected = onTemplateSelected;
    }

    onOpen() {
        const { contentEl } = this;

        // Ajouter le CSS personnalisé à la fenêtre modale
        const styleEl = document.createElement('style');
        styleEl.innerHTML = customCSS;
        contentEl.appendChild(styleEl);

        // Titre de la fenêtre modale
        contentEl.createEl('h2', { text: 'Sélectionnez un template' });

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
    <table>
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
    <table>
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
    <table>
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
            const setting = new Setting(contentEl)
                .setName(template.title);

            const previewEl = setting.descEl.createEl('div');
            previewEl.innerHTML = template.preview;

            setting.addButton(button => {
                button
                    .setButtonText(`Sélectionner ${template.title}`)
                    .onClick(() => {
                        this.onTemplateSelected(index + 1);
                        this.close();
                    });
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Méthode pour ouvrir la fenêtre modale
export function openTemplateModal(app: App) {
    new TemplateModal(app, (templateNumber: number) => {
        openTemplate(templateNumber);
    }).open();
}

function openTemplate(templateNumber: number) {
    new Notice(`Template ${templateNumber} sélectionné`);
}
