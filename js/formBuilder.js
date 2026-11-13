import { formatDate } from "./fieldUtils";

// Counter for unique input ids, rows repeat the same fields so ids can't be based on position
let nextId = 0;

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
        if(Object.keys(inner).length > 0){
            fields.push({ name: tag, label: tag, type: "loop", required: true, fields: tagsToFields(inner)});
            continue;
        }

        const {name, type} = parseTag(tag);

        fields.push({name, label: name, type, required: true});
    }

    return fields;
}

/**
 * Builds one label and input per fields and adds them to the form HTML
 * @param {HTMLFormElement} container - Where the inputs go
 * @param {Array<Object>} fields - the fields we got from tagsToFields()
 * @returns {void}
 */
export function renderFields(container, fields){
    container.replaceChildren();

    for(const field of fields){
        container.append(field.type === "loop" ? createLoop(field) : createField(field));
    }
}

/**
 * Creates one label and input for a field
 * @param {Object} field - A field from tagsToFields()
 * @returns {HTMLElement} The .field element
 */
function createField(field){
    const wrapper = document.getElementById("fieldTemplate").content.cloneNode(true).querySelector(".field");
    const label = wrapper.querySelector("label");
    const input = wrapper.querySelector("input");
    const id = `field-${nextId++}`;

    wrapper.dataset.name = field.name;
    label.textContent = field.label;
    label.htmlFor = id;
    input.id = id;
    input.type = field.type;
    input.required = field.required;

    label.dir = "auto";
    input.dir = "auto";

    return wrapper;
}

/**
 * Creates the box for a loop, starting with one row and an "Add item" button
 * @param {Object} field - a field of type "loop"
 * @returns {HTMLElement} The .loop fieldset
 */
function createLoop(field){
    const fieldset = document.getElementById("loopTemplate").content.cloneNode(true).querySelector(".loop");
    const rows = fieldset.querySelector(".loopRows");

    fieldset.dataset.name = field.name;
    fieldset.querySelector("legend").textContent = field.label;
    fieldset.querySelector(".addRowBtn").addEventListener("click", () =>{
        rows.append(createLoopRow(field));
    });

    rows.append(createLoopRow(field));
    return fieldset;
}

/**
 * Creates one row of a loop with its inputs and a "Remove" button
 * @param {Object} field - A field of type "loop"
 * @returns {HTMLElement} The .loopRow element
 */
function createLoopRow(field){
    const row = document.getElementById("loopRowTemplate").content.cloneNode(true).querySelector(".loopRow");
    const removeBtn = row.querySelector(".removeRowBtn");

    for(const inner of field.fields){
        removeBtn.before(inner.type === "loop" ? createLoop(inner) : createField(inner));
    }

    removeBtn.addEventListener("click", () => {
        if(row.parentElement.children.length > 1)
            row.remove();
    });

    return row;
}

/**
 * Reads the values from a container into the docxtemplater needs
 * All dates are formatted as "DD-MM-YYYY", and loops become a list with one object per row
 * @param {HTMLElement} container - The form or a loop row
 * @param {Array<Object>} fields - The fields from tagsToFields()
 * @returns {Object}
 */
export function collectData(container, fields){
    const data = {};

    for(const element of container.children){
        const field = fields.find(f => f.name === element.dataset.name);

        if(!field)
            continue;

        // If the field is a loop (i.e contains multiple rows within it) we go over the children through a recursive call
        if(field.type === "loop"){
            const rows = element.querySelector(".loopRows").children;

            data[field.name] = [...rows].map(row => collectData(row, field.fields));
        } else{
            const value = element.querySelector("input").value;
            data[field.name] = field.type === "date" ? formatDate(value) : value;
        }
    }


    return data;
}