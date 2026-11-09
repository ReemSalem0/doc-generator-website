/**
 * Function to convert from the "YYYY-MM-DD" to "DD-MM-YYYY" format
 * @param {string} value - The date in the "YYYY-MM-DD"
 * @returns {string} The date reformatted to the "DD-MM-YYYY" format
 */
export function formatDate(value){
    if(!value)
        return ""; // Empty field stays empty

    const [year, month, day] = value.split("-");

    return `${day}/${month}/${year}`;
}