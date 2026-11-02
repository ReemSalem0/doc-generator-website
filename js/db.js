const DB_NAME = "doc-generator";
const DB_VERSION = 1;
const STORE = "templates";

//Opens (or creates) the database once; everything else waits on this 
const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    //Runs only when the database is created or its version goes up
    request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

//IndexedDB reports results through events; this turns a request into a promise so we can use await
function promisify(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

//Every read or write happens inside a transaction ("readonly" or "readwrite")
function getStore(db, mode) {
    return db.transaction(STORE, mode).objectStore(STORE);
}

// Saves an uploaded file and returns its new id
export async function saveTemplate(file) {
    const db = await dbPromise;
    return promisify(getStore(db, "readwrite").add({ name: file.name, file: file, createdAt: Date.now(), }));
}

export async function getAllTemplates() {
    const db = await dbPromise;
    return promisify(getStore(db, "readonly").getAll());
}

export async function getTemplate(id) {
    const db = await dbPromise;
    return promisify(getStore(db, "readonly").get(id));
}

export async function deleteTemplate(id) {
    const db = await dbPromise;
    return promisify(getStore(db, "readwrite").delete(id));
}