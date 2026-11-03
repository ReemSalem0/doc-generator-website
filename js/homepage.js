import { saveTemplate, getAllTemplates, saveTemplateOrder, deleteTemplates } from "./db.js";

const emptyState = document.getElementById("emptyState");
const templatesView = document.getElementById("templatesView");
const topActions = document.querySelector(".top-actions");
const templatesList = document.querySelector(".templates-list");
const templateItem = document.getElementById("templateItem");
const fileInput = document.getElementById("templateFileInput");

const editBtn = document.getElementById("editBtn");
const editToolbar = document.querySelector(".edit-toolbar");
const selectAllBtn = document.getElementById("selectAllBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

let currentTemplates = []; // the list as currently shown
let isEditing = false;
const selectedIds = new Set(); // ids of ticked templates
let draggedCard = null; //the card being dragged, if any


//Every "add template" button opens file picker
document.querySelectorAll(".add-template-trigger").forEach((button) => {
    button.addEventListener("click", () => fileInput.click());
});

//Runs after the user picks a file
fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return; //user cancelled

    if (!file.name.toLowerCase().endsWith(".docx")) {
        alert("Please choose a Word (.docx) file.");
        fileInput.value = "";
        return;
    }

    try {
        await saveTemplate(file);
        await showHomepage(); //redraws the page so the new template appears
    } catch (error) {
        console.error(error);
        alert("Couldn't save the template. Please try again.");
    }

    fileInput.value = ""; //so picking the same file again triggers "change"
});

//Edit /Done button
editBtn.addEventListener("click", () => setEditMode(!isEditing));

function setEditMode(on) {
    isEditing = on;
    templatesView.classList.toggle("editing", on);
    editToolbar.hidden = !on;
    editBtn.textContent = on ? "Done" : "Edit";
    selectedIds.clear();
    renderTemplateList(currentTemplates);
    updateToolbar();
}

// one listener for every click in the list (event delegation)
templatesList.addEventListener("click", async (event) => {
    const card = event.target.closest(".template-card");
    if (!card) return;
    const id = Number(card.dataset.id);

    // Normal mode: only the trash can does something; links work as usual
    if (!isEditing) {
        if (event.target.closest(".remove-template-btn")) {
            await deleteWithConfirm([id]);
        }
        return;
    }

    // Edit mode: ignore the click that ends a drag
    if (event.target.closest(".drag-handle")) return;

    // Tapping the card (not the checkbox itself) toggles its checkbox
    const checkbox = card.querySelector(".select-template");
    if (!event.target.closest(".select-template")) {
        event.preventDefault();   // don't open the form while editing
        checkbox.checked = !checkbox.checked;
    }

    toggleSelected(id, checkbox.checked);
});

function toggleSelected(id, isSelected) {
    if (isSelected) {
        selectedIds.add(id);
    } else {
        selectedIds.delete(id);
    }
    updateToolbar();
}

function updateToolbar() {
    const count = selectedIds.size;
    const allSelected = count > 0 && count === currentTemplates.length;

    deleteSelectedBtn.disabled = count === 0;
    deleteSelectedBtn.textContent = count > 0 ? `Delete (${count})` : "Delete";
    selectAllBtn.textContent = allSelected ? "Deselect all" : "Select all";
}

//Select all / Deselect all
selectAllBtn.addEventListener("click", () => {
    const allSelected = selectedIds.size === currentTemplates.length;

    selectedIds.clear();
    if (!allSelected) {
        currentTemplates.forEach((template) => selectedIds.add(template.id));
    }

    renderTemplateList(currentTemplates);
    updateToolbar();
});

//Delete selected
deleteSelectedBtn.addEventListener("click", () => deleteWithConfirm([...selectedIds]));

// shared by the trash can (one id) and "Delete selected" (several ids)
async function deleteWithConfirm(ids) {
    const label = ids.length === 1 ? "this template" : `these ${ids.length} templates`;
    if (!confirm(`Delete ${label}?`)) return;

    try {
        await deleteTemplates(ids);
        ids.forEach((id) => selectedIds.delete(id));
        await showHomepage();
        if (isEditing && currentTemplates.length === 0) setEditMode(false);
        updateToolbar();
    } catch (error) {
        console.error(error);
        alert("Couldn't delete the template.");
    }
}

// drag and drop, starting from the handle
templatesList.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest(".drag-handle");
    if (!handle || !isEditing) return;

    event.preventDefault();
    draggedCard = handle.closest(".template-card");
    draggedCard.classList.add("dragging");

    // Listen on the whole document, so the drag keeps working
    // even when the finger moves outside the list
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", onDragEnd);
});

function onDragMove(event) {
    const otherCards = [...templatesList.querySelectorAll(".template-card:not(.dragging)")];

    // The first card whose middle is below the finger is where we insert before
    const nextCard = otherCards.find((card) => {
        const box = card.getBoundingClientRect();
        return event.clientY < box.top + box.height / 2;
    });

    if (nextCard) {
        templatesList.insertBefore(draggedCard, nextCard);
    } else {
        templatesList.append(draggedCard);   // below every card: move to the end
    }
}

async function onDragEnd() {
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragEnd);

    draggedCard.classList.remove("dragging");
    draggedCard = null;

    // Read the new order from the page and rebuild the array to match
    const newOrderIds = [...templatesList.children].map((card) => Number(card.dataset.id));
    currentTemplates = newOrderIds.map((id) => currentTemplates.find((template) => template.id === id));

    try {
        await saveTemplateOrder(currentTemplates);
    } catch (error) {
        console.error(error);
        alert("Couldn't save the new order: " + error.message);
    }
}

//Sorted by saved order; new templates (no order yet) go on top, newest first
async function getSavedTemplates() {
    const templates = await getAllTemplates();
    const sortKey = (template) => template.order ?? -template.createdAt;
    return templates.sort((a, b) => sortKey(a) - sortKey(b));
}

//Draws one card per template
function renderTemplateList(templates) {
    templatesList.innerHTML = "";

    for (const template of templates) {
        const card = templateItem.content.cloneNode(true);
        const checkbox = card.querySelector(".select-template");

        card.querySelector(".template-card").dataset.id = template.id;
        card.querySelector(".template-name").textContent = template.name;
        card.querySelector(".template-link").href = `/form.html?id=${template.id}`;

        checkbox.checked = selectedIds.has(template.id);
        checkbox.setAttribute("aria-label", `Select ${template.name}`);

        templatesList.append(card);
    }
}

async function showHomepage() {
    currentTemplates = await getSavedTemplates();
    const hasTemplates = currentTemplates.length > 0;

    emptyState.hidden = hasTemplates;
    templatesView.hidden = !hasTemplates;
    topActions.hidden = !hasTemplates;

    if (hasTemplates) {
        renderTemplateList(currentTemplates);
    }
}

if (navigator.storage?.persist) {
    navigator.storage.persist();
}

showHomepage();