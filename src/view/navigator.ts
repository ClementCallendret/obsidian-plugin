import { EventRef, ItemView, TAbstractFile, WorkspaceLeaf } from "obsidian";

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
    container.addClass("sortable-container");
    let vault = this.app.vault.getFiles();
    vault = vault.reverse(); // remettre à l'endroit
    for (const file of vault) {
        const listItem = container.createEl("div", { cls: "sortable-item", attr: { draggable: "true" } });
        listItem.createEl("h4", { text: `${file.name}` });

        // Ajouter des gestionnaires d'événements pour le glisser-déposer
        listItem.addEventListener("dragstart", (event) => this.handleDragStart(event));
        listItem.addEventListener("dragover", (event) => this.handleDragOver(event));
        listItem.addEventListener("dragenter", (event) => this.handleDragEnter(event));
        listItem.addEventListener("dragleave", (event) => this.handleDragLeave(event));
        listItem.addEventListener("drop", (event) => this.handleDrop(event));
        listItem.addEventListener("dragend", (event) => this.handleDragEnd(event));
    }
  }

  async onClose() {
    // Nothing to clean up.
  }

  public async updateFileList() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("sortable-container");
    let vault = this.app.vault.getFiles();
    vault = vault.reverse(); // remettre à l'endroit
    for (const file of vault) {
        const listItem = container.createEl("div", { cls: "sortable-item", attr: { draggable: "true" } });
        listItem.createEl("h4", { text: `${file.name}` });

        // Ajouter des gestionnaires d'événements pour le glisser-déposer
        listItem.addEventListener("dragstart", (event) => this.handleDragStart(event));
        listItem.addEventListener("dragover", (event) => this.handleDragOver(event));
        listItem.addEventListener("dragenter", (event) => this.handleDragEnter(event));
        listItem.addEventListener("dragleave", (event) => this.handleDragLeave(event));
        listItem.addEventListener("drop", (event) => this.handleDrop(event));
        listItem.addEventListener("dragend", (event) => this.handleDragEnd(event));
    }
  }


  //darg and drop
private draggedItem: HTMLElement | null = null;

private handleDragStart(event: DragEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains("sortable-item")) {
        this.draggedItem = target;
        event.dataTransfer?.setData("text/plain", "");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
      }
      
    }
}

private handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
  }
  
}

private handleDragEnter(event: DragEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains("sortable-item") && target !== this.draggedItem) {
        target.classList.add("drag-over");
    }
}

private handleDragLeave(event: DragEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains("sortable-item")) {
        target.classList.remove("drag-over");
    }
}

private handleDrop(event: DragEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains("sortable-item") && target !== this.draggedItem) {
        // Swap the positions of the dragged item and the drop target
        const container = this.containerEl.children[1];
        container.insertBefore(this.draggedItem!, target);
    }
}

private handleDragEnd(event: DragEvent) {
    // Remove the drag-over class from all items
    const container = this.containerEl.children[1];
    const items = container.getElementsByClassName("sortable-item");
    for (let i = 0; i < items.length; i++) {
        const item = items[i] as HTMLElement;
        item.classList.remove("drag-over");
    }
    this.draggedItem = null;
  }
}