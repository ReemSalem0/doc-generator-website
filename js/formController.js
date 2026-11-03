import { renderAsync } from "docx-preview";
import {getTemplate} from "./db.js";
import { getTags, createDocx } from "./docxService.js";
import { tagsToFields, renderFields } from "./formBuilder.js";

// The current template loaded, gets set once the init() function finishes running
let currentTemplate = null;

const docTitle = document.getElementById("docTitle");

/**
 * Loads the current template from the URL's ?id and reads its tags
 * @returns {Promise<void>}
 */
async function init(){
    const id = Number(new URLSearchParams(window.location.search).get("id"));

    if(!Number.isInteger(id) || id <= 0){
        console.error("Missing or invalid ID");
        return;
    }

    const template = await getTemplate(id);

    if(!template){
        console.error(`No templates found with ID: ${id}`);
        return;
    }

    currentTemplate = template;

    const displayName = template.name.replace(/\.docx$/i, "");
    docTitle.textContent = displayName;
    document.title = displayName;

    try{
        const tags = await getTags(template.file);
        console.log("Tags: " + tags);

        const fields = tagsToFields(tags);
        console.log("Fields: " + fields);
        
        renderFields(form, fields);

    } catch (err){
        console.error("could not read template");
        console.error(err.properties?.errors);
    }
}

// Preview button functionality
const form = document.querySelector(".docForm");
const previewContainer = document.getElementById("preview");
const previewDialog = document.getElementById("previewDialog");

// Opens a preview modal for how the document will look with all the fields filled with the data from the form
document.querySelector(".previewBtn").addEventListener("click", async () =>{
    try{
        const blob = await createDocx(form, currentTemplate.file);
        previewContainer.replaceChildren();
        await renderAsync(blob, previewContainer);
        previewDialog.showModal();
    } catch (err){
        console.error(err);
        console.error(err.properties?.errors);
    }
});

// Event listener to close the preview modal
document.querySelector(".closePreviewBtn").addEventListener("click" , () =>{
    previewDialog.close();
});

// Close button functionality

// Resets the form and returns to the home page
document.querySelector(".cancelBtn").addEventListener("click", () =>{
    form.reset();
    window.location.href = import.meta.env.BASE_URL;
});

// Setup once the page loads
init();