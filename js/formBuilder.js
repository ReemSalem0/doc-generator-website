/**
 * Turns the tags from a template into a list of form fields
 * @param {Object} tags - the tags we get from the getTags() function
 * @returns {Array<{name: string, label: string, type: string, required: boolean}>} one field per tag
 */
export function tagsToFields(tags){
    const fields = [];

    for(const [name, inner] of Object.entries(tags)){
        if(Object.keys(inner).length > 0) continue;

        fields.push({name, label: name, type: "text", required: false});
    }

    return fields;
}

/**
 * Builds one label and input per fields and adds them to the form HTML
 * @param {HTMLFormElement} form - The form we fill with inputs
 * @param {Array<{name: string, label: string, type: string, required: boolean}>} fields - the fields we got from tagsToFields()
 * @returns {void}
 */
export function renderFields(form, fields){
    const fieldTemplate = document.getElementById("fieldTemplate");
    form.replaceChildren();

    for(const field of fields){
        const clone = fieldTemplate.content.cloneNode(true);
        const label = clone.querySelector("label");
        const input = clone.querySelector("input");
        const id = `field-${field.name}`;

        label.textContent = field.label;
        label.htmlFor = id;

        input.id = id;
        input.name = field.name;
        input.type = field.type;
        input.required = field.required;

        form.append(clone);
    }
}