import { renderAsync } from "docx-preview";
import {getTemplate} from "./db.js";
import { getTags, createDocx } from "./docxService.js";
import { tagsToFields, renderFields } from "./formBuilder.js";
import { downloadFile, removeDocxExtention } from "./fileUtils.js";

// The current template loaded, gets set once the init() function finishes running
let currentTemplate = null;

const docTitle = document.getElementById("docTitle");
const formError = document.getElementById("formError");
const saveBtn = document.querySelector(".saveBtn");
const previewBtn = document.querySelector(".previewBtn");

// Displaying a hint on how to save the document as a pdf based on the user's device (IOS or android)
const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.paltform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(navigator.userAgent);

document.getElementById("pdfHint").textContent =
        isIos ? "Then tap the share icon and choose \"Save to Files\"" :
        isAndroid ? "Then pick \"Save as PDF\" as the printer"
        : "Then choose \"Save as PDF\" as the destination";

/**
 * Loads the current template from the URL's ?id and reads its tags
 * @returns {Promise<void>}
 */
async function init(){
    try{
        const id = Number(new URLSearchParams(window.location.search).get("id"));

    if(!Number.isInteger(id) || id <= 0){
        showError("No template selected");
        return;
    }

    const template = await getTemplate(id);

    if(!template){
        showError(`Template not found`);
        return;
    }

    

    const displayName = removeDocxExtention(template.name);
    docTitle.textContent = displayName;
    document.title = displayName;

    const fields = tagsToFields(await getTags(template.file)); // Getting the tags then turning them to fields right away

    if(fields.length === 0){
        showError("This template has no fields to fill in");
        return;
    }

    renderFields(form, fields);
    currentTemplate = template;
    saveBtn.disabled = false;
    previewBtn.disabled = false;
    } catch (err){
        console.error(err);
        showError("This template has a problem and can't be used: " + getErrorDetails(err));
        
    }
}

/**
 * Shows an error message above the form
 * @param {string} message - The error message to let the user know what went wrong
 * @param {string[]} [details] - Optional list of specifics
 * @returns {void}
 */
function showError(message, details = []){
    const text = document.createElement("p");

    text.textContent = "ERROR: " + message;
    formError.replaceChildren(text);

    if(details.length > 0){
        const list = document.createElement("ul");

        for(const detail of details){
            const item = document.createElement("li");
            item.textContent = detail;
            list.append(item);
        }

        formError.append(list);
    }

    formError.hidden = false;
}

/**
 * Hides the error message
 * @returns {void}
 */
function clearError(){
    formError.hidden = true;
    formError.replaceChildren();
}

/**
 * Gets readable messages from an error
 * @param {Error} err - The caught error
 * @returns {string[]} One explanation per error
 */
function getErrorDetails(err){
    const errors = err.properties?.errors ?? [err];
    return errors.map(e => e.properties?.explanation ?? e.message);
}

/**
 * Fills the template with the form's values
 * @returns {Promise<void>}
 */
async function renderPreview(){
    const blob = await createDocx(form, currentTemplate.file);
    previewContainer.replaceChildren();
    await renderAsync(blob, previewContainer);
}

// Preview button functionality
const form = document.querySelector(".docForm");
const previewContainer = document.getElementById("preview");
const previewDialog = document.getElementById("previewDialog");

// Opens a preview modal for how the document will look with all the fields filled with the data from the form
document.querySelector(".previewBtn").addEventListener("click", async () =>{
    clearError();

    if(!form.reportValidity())
        return;

    try{
        await renderPreview();
        previewDialog.showModal();
    } catch (err){
        console.error(err);
        if (err.properties?.errors) console.error(err.properties.errors);
    }
});

// Event listener to close the preview modal
document.querySelector(".closePreviewBtn").addEventListener("click" , () =>{
    previewDialog.close();
});

// Close button functionality

// Resets the form and returns to the home page
document.querySelector(".cancelBtn").addEventListener("click", () =>{
    const hasValues = [...form.querySelectorAll("input")].some(input => input.value !== "");
    
    if(hasValues && !confirm("Discard this report? Everything you have filled will be reset"))
        return;

    form.reset();
    window.location.href = import.meta.env.BASE_URL;
});

// Download as .docx button functionality
document.querySelector('[data-format="docx"]').addEventListener('click', async () =>{
    if(!currentTemplate) return;

    if(!form.reportValidity())
        return;
    
    clearError();

    try{
        const blob = await createDocx(form, currentTemplate.file);

        downloadFile(blob, `${removeDocxExtention(currentTemplate.name)}.docx`);
    } catch(err){
        console.error(err);
        showError("The docx could not be created: " + getErrorDetails(err));
    }
});

// Download as .pdf button functionality
document.querySelector('[data-format="pdf"]').addEventListener("click", async () =>{
    if(!currentTemplate) return;

    if(!form.reportValidity())
        return;

    clearError();

    try{
        await renderPreview();
        window.print();
    } catch(err){
        console.error(err);
        showError("The PDF could not be created: " + getErrorDetails(err));
    }
});

// Setup once the page loads
init();