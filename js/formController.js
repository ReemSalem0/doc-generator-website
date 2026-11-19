import { renderAsync } from "docx-preview";
import { getTemplate } from "./db.js";
import { getTags, createDocx, getRtlTables } from "./docxService.js";
import { tagsToFields, renderFields, collectData } from "./formBuilder.js";
import { downloadFile, removeDocxExtention } from "./fileUtils.js";
import { t, toggleLanguage } from "./i18n.js";

// The current template loaded, gets set once the init() function finishes running
let currentTemplate = null;

// The form's fields, set once init() builds the form
let currentFields = [];

const docTitle = document.getElementById("docTitle");
const formError = document.getElementById("formError");
const saveBtn = document.querySelector(".saveBtn");
const previewBtn = document.querySelector(".previewBtn");

// Displaying a hint on how to save the document as a pdf based on the user's device (IOS or android)
const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(navigator.userAgent);

function setPdfHint() {
    const key = isIos ? "form.pdfHintIos" : isAndroid ? "form.pdfHintAndroid" : "form.pdfHintDesktop";
    document.getElementById("pdfHint").textContent = t(key);
}

const langBtn = document.getElementById("langBtn");
langBtn.textContent = t("common.language");
langBtn.addEventListener("click", toggleLanguage);

setPdfHint();

window.addEventListener("languagechange", () => {
    langBtn.textContent = t("common.language");
    setPdfHint();
});

/**
 * Loads the current template from the URL's ?id and reads its tags
 * @returns {Promise<void>}
 */
async function init() {
    try {
        const id = Number(new URLSearchParams(window.location.search).get("id"));

        if (!Number.isInteger(id) || id <= 0) {
            showError(t("form.noTemplate"));
            return;
        }

        const template = await getTemplate(id);

        if (!template) {
            showError(t("form.notFound"));
            return;
        }



        const displayName = removeDocxExtention(template.name);
        docTitle.textContent = displayName;
        document.title = displayName;

        const fields = tagsToFields(await getTags(template.file)); // Getting the tags then turning them to fields right away

        if (fields.length === 0) {
            showError(t("form.noFields"));
            return;
        }

        renderFields(form, fields);
        currentFields = fields;
        currentTemplate = template;
        saveBtn.disabled = false;
        previewBtn.disabled = false;
    } catch (err) {
        console.error(err);
        showError(t("form.templateProblem") + ": " + getErrorDetails(err));

    }
}

/**
 * Shows an error message above the form
 * @param {string} message - The error message to let the user know what went wrong
 * @param {string[]} [details] - Optional list of specifics
 * @returns {void}
 */
function showError(message, details = []) {
    const text = document.createElement("p");

    text.textContent = t("form.errorPrefix") + " " + message;
    formError.replaceChildren(text);

    if (details.length > 0) {
        const list = document.createElement("ul");

        for (const detail of details) {
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
function clearError() {
    formError.hidden = true;
    formError.replaceChildren();
}

/**
 * Gets readable messages from an error
 * @param {Error} err - The caught error
 * @returns {string[]} One explanation per error
 */
function getErrorDetails(err) {
    const errors = err.properties?.errors ?? [err];
    return errors.map(e => e.properties?.explanation ?? e.message);
}

/**
 * Fixes the position of floating images
 * @param {HTMLElement} container - the rendered preview, must be visible so positions can be measured
 * @returns {void}
 */
function fixFloatingImages(container) {
    for (const box of container.querySelectorAll('div[style*="width: 0px"][style*="position: relative"]')) {
        const paragraph = box.closest("p");
        const page = box.closest("section");

        if (!paragraph || !page)
            continue;

        const textAreaLeft = page.getBoundingClientRect().left + parseFloat(getComputedStyle(page).paddingLeft);
        const shift = textAreaLeft - paragraph.getBoundingClientRect().left;

        paragraph.style.position = "relative";
        box.style.position = "absolute";
        box.style.direction = "ltr";
        box.style.left = `calc(${box.style.left || "0px"} + ${shift}px)`;
    }

    for (const shape of container.querySelectorAll('svg[style*="horizontal-relative:text"], svg[style*="horizontal-relative:margin"]')) {
        const page = shape.closest("section");

        if (page)
            shape.style.left = getComputedStyle(page).paddingLeft;
    }
}

/**
 * Shrinks the document to fit the preview's on smaller screens
 * @param {HTMLElement} container - The rendered preview
 * @returns {void}
 */
function fitPreviewToWidth(container) {
    const wrapper = container.querySelector(".docx-wrapper");
    const page = container.querySelector("section.docx");

    if (!wrapper || !page)
        return;

    wrapper.style.zoom = "";
    const available = container.clientWidth;
    const needed = page.offsetWidth + 2 * parseFloat(getComputedStyle(wrapper).paddingLeft);

    if (needed > available)
        wrapper.style.zoom = available / needed;
}

// Preview button functionality
const form = document.querySelector(".docForm");
const previewContainer = document.getElementById("preview");
const previewDialog = document.getElementById("previewDialog");


/**
 * Fills the template with the form's values
 * @returns {Promise<void>}
 */
async function renderPreview() {
    const blob = await createDocx(collectData(form, currentFields), currentTemplate.file);
    previewContainer.replaceChildren();
    await renderAsync(blob, previewContainer);

    for (const row of previewContainer.querySelectorAll("tr"))
        row.style.textAlign = "";

    const rtlTables = await getRtlTables(blob);
    const tables = previewContainer.querySelectorAll("article table");
    rtlTables.forEach((isRtl, i) => {
        if (isRtl && tables[i])
            tables[i].dir = "rtl";
    });

    previewDialog.showModal();
    document.body.style.overflow = "hidden";
    fixFloatingImages(previewContainer);
    fitPreviewToWidth(previewContainer);
}


//Makes a textarea as tall as it's content
function autoGrow(textarea) {
    textarea.style.height = "auto"; // shrinks first, so it can also get smaller
    textarea.style.height = `${textarea.scrollHeight}px`; //then fit the text
}

//One listener for every textarea in the form, including ones in loop rows added late
form.addEventListener("input", (e) => {
    if (e.target.matches("textarea"))
        autoGrow(e.target);
});

// Opens a preview modal for how the document will look with all the fields filled with the data from the form
document.querySelector(".previewBtn").addEventListener("click", async () => {
    clearError();

    if (!form.reportValidity())
        return;

    try {
        await renderPreview();
        previewDialog.showModal();
    } catch (err) {
        console.error(err);
        if (err.properties?.errors) console.error(err.properties.errors);
    }
});

// Event listener to close the preview modal
document.querySelector(".closePreviewBtn").addEventListener("click", () => {
    previewDialog.close();
});

// Closing the modal when clicking outside of it
previewDialog.addEventListener("click", (e) => {
    document.body.style.overflow = "";
    const box = previewDialog.getBoundingClientRect();

    const clickedOutside = e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom;

    if (clickedOutside)
        previewDialog.close();
})

// Close button functionality

// Resets the form and returns to the home page
document.querySelector(".cancelBtn").addEventListener("click", () => {
    const hasValues = [...form.querySelectorAll("input, textarea")].some(input => input.value !== "");

    if (hasValues && !confirm(t("form.confirmDiscard")))
        return;

    form.reset();
    window.location.href = import.meta.env.BASE_URL;
});

// Download as .docx button functionality
document.querySelector('[data-format="docx"]').addEventListener('click', async () => {
    if (!currentTemplate) return;

    if (!form.reportValidity())
        return;

    clearError();

    try {
        const blob = await createDocx(collectData(form, currentFields), currentTemplate.file);

        downloadFile(blob, `${removeDocxExtention(currentTemplate.name)}.docx`);
    } catch (err) {
        console.error(err);
        showError(t("form.docxFailed") + ": " + getErrorDetails(err));
    }
});

// Download as .pdf button functionality
document.querySelector('[data-format="pdf"]').addEventListener("click", async () => {
    if (!currentTemplate) return;

    if (!form.reportValidity())
        return;

    clearError();

    try {
        await renderPreview();
        window.print();
    } catch (err) {
        console.error(err);
        showError(t("form.pdfFailed") + ": " + getErrorDetails(err));
    }
});

// Event listener to resize the preview once the screen size changes (for example if a phone is rotated)
window.addEventListener("resize", () => {
    if (previewDialog.open)
        fitPreviewToWidth(previewContainer);
});

// Setup once the page loads
init();