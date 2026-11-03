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

//Saves the list order: each template gets its position as "order"
export async function saveTemplateOrder(templates) {
    const db = await dbPromise;
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);

    templates.forEach((template, index) => {
        store.put({ ...template, order: index });
    });

    return transactionDone(transaction);
}

//Deletes several templates at once
export async function deleteTemplates(ids) {
    const db = await dbPromise;
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);

    ids.forEach((id) => store.delete(id));

    return transactionDone(transaction);
}

//Resolves when every request in the transaction has finished
function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}