import PizzZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { renderAsync } from "docx-preview";
import InspectModule from "docxtemplater/js/inspect-module.js";
import {formatDate} from "./fieldUtils.js";

/**
 * Read a template file and returns every tag docxtemplater finds in it
 * @param {Blob} file - THe .docx template
 * @returns {Promise<Object>} the tags found in the template
 */
export async function getTags(file){
    const zip = new PizzZip(await file.arrayBuffer());
    const iModule = new InspectModule();

    new Docxtemplater(zip, {modules: [iModule], paragraphLoop: true, linebreaks: true});
    return iModule.getAllTags();
}

/**
 * Fills the template with the values provided from the form
 * @param {HTMLFormElement} form - The form filled with the inputs from the user
 * @param {Blob} file - The .docx template
 * @returns {Promise<Blob>} The filled .docx file
 */
export async function createDocx(form, file) {
    const zip = new PizzZip (await file.arrayBuffer());
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