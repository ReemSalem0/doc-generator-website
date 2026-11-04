import { getTemplateNames, saveTemplateName } from "./db.js";

// The file name without ".docx"
function defaultName(template) {
    return template.name.replace(/\.docx$/i, "");
}

//Gives each template a displayName
export async function addDisplayNames(templates) {
    const names = await getTemplateNames();
    templates.forEach((template) => {
        template.displayName = names[template.id] ?? defaultName(template);
    });
    return templates;
}

// Asks the user for a new name and saves it
export async function promptRename(template) {
    const currentName = template.displayName ?? defaultName(template);
    const newName = prompt("Rename template", currentName);

    if (newName === null) return null; //user cancelled
    const trimmed = newName.trim();
    if (!trimmed) {
        alert("The name can't be empty.");
        return null;
    }
    if (trimmed === currentName) return null; //nothing changed

    try {
        await saveTemplateName(template.id, trimmed);
        template.displayName = trimmed;
        return trimmed;
    } catch (error) {
        console.error(error);
        alert("Couldn't rename the template.");
        return null;
    }
}