import PizZip from "pizzip";
import { renderAsync } from "docx-preview";

const cache = new Map(); //template id => finished thumbnail element (kept for this session)
const waiting = new WeakMap(); //thumbnail box => template, until the box scrolls into view 
let renderQueue = Promise.resolve(); // makes thmbnails one at a time so the phone doesn't freeze 

//Starts making a thumbnail when its box comes near the screen
const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const box = entry.target;
        observer.unobserve(box);
        const template = waiting.get(box);
        waiting.delete(box);
        if (template) queueThumbnail(box, template);
    }
}, { rootMargin: "200px" }); //start a little before the box is actually visible

//Shows a template's thumbnail in a box; the box must be already be on the page
export function showThumbnail(box, template) {
    const cached = cache.get(template.id);
    if (cached) {
        placeInBox(box, cached);
        return;
    }
    waiting.set(box, template);
    observer.observe(box);
}

//Frees the memory used by deleted templates' thumbnails
export function forgetThumbnails(ids) {
    for (const id of ids) {
        const element = cache.get(id);
        if (element?.tagName === "IMG") URL.revokeObjectURL(element.src);
        cache.delete(id);
    }
}

//Adds a thumbnail to the queue (one at a time)
function queueThumbnail(box, template) {
    renderQueue = renderQueue.then(async () => {
        let element = cache.get(template.id); //it may have been made while waiting in line
        if (!element) {
            try {
                element = await createThumbnail(template);
            } catch (error) {
                console.error("Thumbnail failed for", template.name, error);
                return; //keep the plain grey box
            }
            cache.set(template.id, element);
        }
        if (box.isConnected) placeInBox(box, element); // the list may have been redrawn meanwhile
    });
}

//Uses Word's built-in thumbnail if the file has one otherwise renders the first page 
async function createThumbnail(template) {
    const data = await template.file.arrayBuffer();
    return getBuiltInThumbnail(data) ?? (await renderFirstPage(data, template.id));
}

//Some .docx files contain a small preview image. Returns an <img>, or null if there isn't a usable one 
function getBuiltInThumbnail(data) {
    try {
        const zip = new PizZip(data);
        const relsFile = zip.file("_rels/.rels"); //the file that lists the document's parts
        if (!relsFile) return null;

        const rels = new DOMParser().parseFromString(relsFile.asText(), "application/xml");
        const thumbnailRel = [...rels.getElementsByTagName("Relationship")].find((rel) => rel.getAttribute("Type")?.endsWith("/thumbnail"));
        if (!thumbnailRel) return null; 
        
        const path = thumbnailRel.getAttribute("Target").replace(/^\//, "");
        const type = /\.png$/i.test(path) ? "image/png"
                   : /\.jpe?g$/i.test(path) ? "image/jpeg"
                   : null; //other formats (like .emf) can't be shown by browsers
        const imageFile = zip.file(path);
        if (!type || !imageFile) return null;

        const img = document.createElement("img");
        img.className = "thumb-image";
        img.alt = "";
        img.src = URL.createObjectURL(new Blob([imageFile.asUint8Array()], { type }));
        return img;
    } catch {
        return null; //unreadable: fall back to rendering
    }
}

//Renders the document with docx-preview and keeps only the first page
async function renderFirstPage(data, id) {
    const page = document.createElement("div");
    page.className =  "thumb-page";

    await renderAsync(data, page, null, {
        className: `thumb-${id}`, //unique per template, so different documnets' style don't clash
        inWrapper: false, //no grey background around the pages
        breakPages: true,
    });

    page.querySelectorAll("section").forEach((section, index) => {
        if (index > 0) section.remove(); //drop every page after the first
    });
    return page;
}

//Puts a finished thumbnail in its box, shrinking a rendered page to the box's width
function placeInBox(box, element) {
    box.replaceChildren(element);

    if (element.classList.contains("thumb-page")) {
        const firstPage = element.querySelector("section");
        const pageWidth = firstPage?.offsetWidth;
        if (pageWidth) {
            element.style.transform = `scale(${box.clientWidth / pageWidth})`;
        }
    }
}