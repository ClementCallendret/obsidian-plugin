import { App, Modal } from "obsidian";


class RenameModal extends Modal {
    oldName: string;
    onSubmit: (newName: string | null) => void;
  
    constructor(app: App, oldName: string, onSubmit: (newName: string | null) => void) {
        super(app);
        this.oldName = oldName;
        this.onSubmit = onSubmit;
    }
  
    onOpen() {
        const { contentEl } = this;
  
        contentEl.createEl('h2', { text: 'Rename File/Folder' });
  
        const input = contentEl.createEl('input', {
            type: 'text',
            value: this.oldName
        });
  
        input.focus();
  
        const submitButton = contentEl.createEl('button', { text: 'Rename' });
        submitButton.onclick = () => {
            const newName = input.value.trim();
            if (newName) {
                this.onSubmit(newName);
            } else {
                this.onSubmit(null);
            }
            this.close();
        };
  
        const cancelButton = contentEl.createEl('button', { text: 'Cancel' });
        cancelButton.onclick = () => {
            this.onSubmit(null);
            this.close();
        };
    }
  
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
  }
  
  export async function promptForNewName(oldName: string): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
        const modal = new RenameModal(this.app, oldName, resolve);
        modal.open();
    });
  }