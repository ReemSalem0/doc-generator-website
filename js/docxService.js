import PizzZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { renderAsync } from "docx-preview";
import InspectModule from "docxtemplater/js/inspect-module.js";

/**
 * Read a template file and returns every tag docxtemplater finds in it
 * @param {Blob} file - THe .docx template
 * @returns {Promise<Object>} the tags found in the template
 */
export async function getTags(file){
    const zip = new PizzZip(await file.arrayBuffer());
    const iModule = new InspectModule();

    new Docxtemplater(zip, {modules: [iModule], paragraphLoop: true, linebreaks: true, parser});
    return iModule.getAllTags();
}

/**
 * Fills the template with the values provided from the form
 * @param {HTMLFormElement} data - The values from collectData()
 * @param {Blob} file - The .docx template
 * @returns {Promise<Blob>} The filled .docx file
 */
export async function createDocx(data, file) {
    const zip = new PizzZip (await file.arrayBuffer());
    const doc = new Docxtemplater(zip, {paragraphLoop: true, linebreaks: true, parser});
    
    doc.render(data);

    return doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }); 
}

/**
 * 
 * @param {string} tag - The full tag text
 * @returns {{get: function(Object): *}} What docxtemplater uses to get the tag's value
 */
function parser(tag){
    const name = tag.split(":")[0].trim();

    return{
        get: (scope) => (name === "." ? scope : scope[name])
    }
}

/**
 * Finds which tables in a docx that are right to left
 * @param {Blob} file - A .docx file
 * @returns {Promise<boolean[]>} One entry per table, in document order true if it's a right to left table
 */
export async function getRtlTables(file){
    const zip = new PizzZip(await file.arrayBuffer());
    const xml = new DOMParser().parseFromString(zip.file("word/document.xml").asText(), "application/xml");
    const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

    // return [...xml.getElementsbyTagNameNS(W, "tbl")].map(table =>{
    //     const props = table.getElementsbyTagNameNS(W, "tblPr")[0];
    //     return props?.getElementsbyTagNameNS(W, "bidiVisual").length > 0;
    // });

     return [...xml.getElementsByTagNameNS(W, "tbl")].map(table => {
        const props = table.getElementsByTagNameNS(W, "tblPr")[0];
        return props?.getElementsByTagNameNS(W, "bidiVisual").length > 0;
    });
}