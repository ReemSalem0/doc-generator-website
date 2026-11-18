import { getTemplateNames, saveTemplateName } from "./db.js";
import { t } from "./i18n.js";

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
    const newName = prompt(t("home.renameTemplate"), currentName);

    if (newName === null) return null; //user cancelled
    const trimmed = newName.trim();
    if (!trimmed) {
        alert(t("home.emptyName"));
        return null;
    }
    if (trimmed === currentName) return null; //nothing changed

    try {
        await saveTemplateName(template.id, trimmed);
        template.displayName = trimmed;
        return trimmed;
    } catch (error) {
        console.error(error);
        alert(t("home.renameFailed"));
        return null;
    }
}