import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return "Example view";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    let vault = app.vault.getFiles();
    vault = vault.reverse();//remettre à l'endroit
    for (const file of vault) {
      container.createEl("h4", { text: `${file.name}` });
    }
  }

  async onClose() {
    // Nothing to clean up.
  }
}