import {defineConfig} from "vite";
import {dirname, resolve} from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build:{
        rolldownOptions:{
            input:{
                main: resolve(__dirname, "index.html"),
                form: resolve(__dirname, "form.html"),
            },
        },
    },
});