const emptyState = document.getElementById("emptyState");
const templatesView = document.getElementById("templatesView");
const topActions = document.querySelector(".top-actions");
const templatesList = document.querySelector(".templates-list");
const templateItem = document.getElementById("templateItem");

//Temporary until the DB storage is built
async function getSavedTemplates() {
    return [
        { id: 1, name: "Inspection report.docx" },
        { id: 2, name: "Maintenance check.docx" },
    ];
}

function renderTemplateList(templates) {
    templatesList.innerHTML = ""; //clear the old list

    for (const template of templates) {
        const card = templateItem.content.cloneNode(true);

        card.querySelector(".template-name").textContent = template.name;
        card.querySelector(".template-link").href = `/form.html?id=${template.id}`;

        templatesList.append(card);
    }
}

async function showHomepage() {
    const templates = await getSavedTemplates();
    const hasTemplates = templates.length > 0;

    emptyState.hidden = hasTemplates;
    templatesView.hidden = !hasTemplates;
    topActions.hidden = !hasTemplates;

    if (hasTemplates) {
        renderTemplateList(templates);
    }
}

showHomepage();