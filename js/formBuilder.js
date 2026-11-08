
// Field types that a tempalte can use
const FIELD_TYPES = ["text", "date", "number"];

/**
 * Splits a tag into its name and type
 * if a tag doesn't include a type we default to a text field
 * @param {string} tag - The full tag from the template
 * @returns {{name: string, types, string}} The field's name and type
 * @throws {Error} if the field type isn't found in the FIELD_TYPES array
 */
export function parseTag(tag){
    let [name, type = "text"] = tag.split(":").map(part => part.trim());
    type = type.toLowerCase();

    if(!FIELD_TYPES.includes(type)){
        throw new Error (`Unknown type "${type}" in the tag {${tag}}`);
    }

    return {name, type};
}


/**
 * Turns the tags from a template into a list of form fields
 * @param {Object} tags - the tags we get from the getTags() function
 * @returns {Array<{name: string, label: string, type: string, required: boolean}>} one field per tag
 */
export function tagsToFields(tags){
    const fields = [];

    for(const [tag, inner] of Object.entries(tags)){
        if(Object.keys(inner).length > 0) continue;

        const {name, type} = parseTag(tag);

        fields.push({name, label: name, type, required: true});
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

    for(const [index, field] of fields.entries()){
        const clone = fieldTemplate.content.cloneNode(true);
        const label = clone.querySelector("label");
        const input = clone.querySelector("input");
        const id = `field-${index}`;

        label.textContent = field.label;
        label.htmlFor = id;

        input.id = id;
        input.name = field.name;
        input.type = field.type;
        input.required = field.required;

        form.append(clone);
    }
}