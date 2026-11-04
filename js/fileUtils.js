
/**
 * Downloads a file to the user's device
 * @param {Blob} blob - The file's contents
 * @param {string} fileName - The name to save it as
 * @returns {void}
 */
export function downloadFile(blob, fileName){
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();

    // Free the memory after the download starts
    setTimeout (() => URL.revokeObjectURL(url), 1000);
}

/**
 * Removes the .docx extension from a file name
 * @param {string} fileName - the file's name including the extension
 * @returns {string} The file' name without the extension
 */
export function removeDocxExtention(fileName){
    return fileName.replace(/\.docx$/i, "");
}