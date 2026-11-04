const DB_NAME = "doc-generator";
const DB_VERSION = 2;
const STORE = "templates";
const SETTINGS = "settings";

//Opens (or creates) the database once; everything else waits on this 
const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    //Runs only when the database is created or its version goes up
    request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(SETTINGS)) {
            db.createObjectStore(SETTINGS);
        }
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
function getStore(db, storeName, mode) {
    return db.transaction(storeName, mode).objectStore(storeName);
}

//Resolves when every request in the transaction has finished
function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

// Saves an uploaded file and returns its new id
export async function saveTemplate(file) {
    const db = await dbPromise;
    return promisify(getStore(db, STORE, "readwrite").add({ name: file.name, file: file, createdAt: Date.now(), }));
}

export async function getAllTemplates() {
    const db = await dbPromise;
    return promisify(getStore(db, STORE, "readonly").getAll());
}

export async function getTemplate(id) {
    const db = await dbPromise;
    return promisify(getStore(db, STORE, "readonly").get(id));
}

export async function deleteTemplate(id) {
    const db = await dbPromise;
    return promisify(getStore(db, STORE, "readwrite").delete(id));
}

//Deletes several templates at once
export async function deleteTemplates(ids) {
    const db = await dbPromise;
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);

    ids.forEach((id) => store.delete(id));

    return transactionDone(transaction);
}

//Saves the list order as an array of ids
export async function saveTemplateOrder(ids) {
    const db = await dbPromise;
    return promisify(getStore(db, SETTINGS, "readwrite").put(ids, "templateOrder"));
}

//Returns the saved order, or an empty array if there isn't one yet
export async function getTemplateOrder() {
    const db = await dbPromise;
    const order = await promisify(getStore(db, SETTINGS, "readonly").get("templateOrder"));
    return order ?? [];
}
