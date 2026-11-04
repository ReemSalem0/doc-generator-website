const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

//The current search text, cleaned up for comparing
function getSearchQuery() {
    return searchInput.value.trim().toLowerCase();
}

//Returns the templates whose name contains the search text
export function filterTemplates(templates) {
    const query = getSearchQuery();
    if (!query) return templates;

    return templates.filter((template) => template.displayName.toLowerCase().includes(query));
}

//Calls the given function whenever the search changes
export function onSearchChange(callback) {
    searchInput.addEventListener("input", callback);

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault(); //don't reload the page
        callback();
        searchInput.blur(); //closes the phone keyboard
    });
}

//Empties the search box and turns it on or off
export function resetSearch(disabled = false) {
    searchInput.value = "";
    searchInput.disabled = disabled;
} 