import PizzZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { renderAsync } from "docx-preview";
import {formatDate} from "./fieldUtils.js";

/**
 * Fills the template with the values provided from the form
 * @param {HTMLFormElement} form - The form filled with the inputs from the user
 * @returns {Promise<Blob>} The filled .docx file
 */
async function createDocx(form) {
    const response = await fetch("/templates/TestTemplate.docx");

    if(!response.ok)
        throw new Error(`Template not found: ${response.status}`);

    const zip = new PizzZip (await response.arrayBuffer());
    const doc = new Docxtemplater(zip, {paragraphLoop: true, linebreaks: true});

    const data = Object.fromEntries(new FormData(form));
    
    for(const input of form.querySelectorAll('input[type="date"]'))
        data[input.name] = formatDate(data[input.name]);
    
    doc.render(data);

    return doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }); 
}

// Preview button functionality
const form = document.querySelector(".docForm");
const previewContainer = document.getElementById("preview");
const previewDialog = document.getElementById("previewDialog");
const previewBtn = document.querySelector(".previewBtn");

previewBtn.addEventListener("click", async () =>{
    try{
        const blob = await createDocx(form);
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
document.querySelector(".cancelBtn").addEventListener("click", () =>{
    form.reset();
    window.location.href = import.meta.env.BASE_URL;
})