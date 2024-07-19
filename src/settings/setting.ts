import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from '../../main';

//HTML preview | Markdown content 
export interface Template {
    preview: string;
    content: string;
}

export interface MyPluginSettings {
    id: number;
    apiKey : string;
    apiUrl : string;
    templates: Template[];
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    id: -1,
    apiKey : "api0key0example",
    apiUrl : 'https://ticket.iocean.fr',
    templates : [
        {
            preview: `<div>
<p>Scenario SC1 - 1 :</p>
<ul>
    <li>-</li>
    <li>-</li>
</ul>
<p>Règles de gestion :</p>
<ul>
    <li>-</li>
    <li>-</li>
</ul>
</div>`, content:  `Scenario SC\${digits} - 1 :
    -
    -

Règles de gestion : 
    -
    -`
        },
        {
            preview: `<div>
<p>Scenario SC1 - 1 :</p>
<ul>
    <li>-</li>
    <li>-</li>
</ul>
<p>Règles de gestion :</p>
<table class="custom-table-modal">
    <thead>
        <tr>
            <th>Code</th>
            <th>Description de la règle de gestion</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>RG1</td>
            <td>Description</td>
        </tr>
    </tbody>
</table>
</div>`, content: `Scenario SC\${digits} - 1 :
	-
	-

Règles de gestion : 
 
|  Code  |  Description de la règle de gestion  |
| :-------: | -------------------------------------- |
| RG\${digits} | Description |
`
        },
        {
            preview: `<div>
<p>1.1 Cas d'usage n°1:</p>
<ul>
    <li>-</li>
    <li>-</li>
</ul>
<p>Règles de gestion :</p>
<table class="custom-table-modal">
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
</div>`, content : `\${digits}.1 Cas d'usage n°1:
	-
	-

Règles de gestion : 
 
|  N°  |         Cas d'usage        |         Règle        |
| :-------: | -------------------------------------- | -------------------------------------- |
| 1 | Texte | Cas valides :<br>	-<br>	-<br> <br>Cas d'échecs :<br>	-<br>	-<br>|
| 2 | Texte | Cas valides :<br>	-<br>	-<br> <br>Cas d'échecs :<br>	-<br>	-<br>|
`
        },
        {
            preview: `<div>
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
<table class="custom-table-modal">
    <thead>
        <tr>
            <th> Code </th>
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
</div>`, content: `Scenario SC\${digits} - 1 :
	-
	-

Scenario SC\${digits} - 2 :
	-
	-

Règles de gestion : 
 
|  Code  |  Description de la règle de gestion  |
| :-------: | -------------------------------------- |
| RG\${digits} - 1 | Description |
| RG\${digits} - 2 | Description |`
        }
    ]
    
}
export class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        //Redmine API Url
        containerEl.createEl('h2', { text: 'Redmine API Url' });
        new Setting(containerEl)
            .setName('API Url')
            .addTextArea(text => text
                .setValue(this.plugin.settings.apiUrl || '')
                .onChange(async (value) => {
                    this.plugin.settings.apiUrl = value;
                    await this.plugin.saveSettings();
                })
            );

        // Redmine API Key
        containerEl.createEl('h2', { text: 'Redmine API Key' });
        new Setting(containerEl)
            .setName('API Key')
            .addTextArea(text => text
                .setValue(this.plugin.settings.apiKey || '')
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                })
            );

        // Templates
        containerEl.createEl('h2', { text: 'Templates' });

        this.plugin.settings.templates.forEach((template, index) => {
            const templateSetting = new Setting(containerEl)
                .setName(`Template ${index + 1}`);

            // Setting for preview HTML
            new Setting(containerEl)
                .setName('Preview HTML')
                .setDesc('HTML Preview for the template')
                .addTextArea(text => text
                    .setValue(template.preview || '')
                    .onChange(async (value) => {
                        template.preview = value;
                        await this.plugin.saveSettings();
                    })
                );

            // Setting for content Markdown
            new Setting(containerEl)
                .setName('Content Markdown')
                .setDesc('Markdown content for the template')
                .addTextArea(text => text
                    .setValue(template.content || '')
                    .onChange(async (value) => {
                        template.content = value;
                        await this.plugin.saveSettings();
                    })
                );

            templateSetting.addButton(button => {
                button.setButtonText('Delete')
                    .onClick(async () => {
                        this.plugin.settings.templates.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });
        });
        
        new Setting(containerEl)
            .setName('Add New Template')
            .addButton(button => {
                button.setButtonText('Add')
                    .onClick(async () => {
                        this.plugin.settings.templates.push({
                            preview: '',
                            content: ''
                        });
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });
    }
}
