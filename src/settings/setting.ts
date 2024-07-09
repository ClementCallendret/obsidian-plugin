import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from '../../main';

export interface Template {
    preview: string;
    content: string;
}

export interface MyPluginSettings {
    id: number;
    templates: Template[];
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    id: -1,
    templates: []
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

        this.plugin.settings.templates.forEach((template, index) => {
            const templateSetting = new Setting(containerEl)
                .setName(`Template ${index + 1}`);

            // Setting for preview HTML
            new Setting(containerEl)
                .setName('Preview HTML')
                .setDesc('HTML Preview for the template')
                .addTextArea(text => text
                    .setValue(template.preview)
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
                    .setValue(template.content)
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
