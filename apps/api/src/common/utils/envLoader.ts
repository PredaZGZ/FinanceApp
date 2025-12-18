// Load environment variables safely, building the envFile if not existing with the default values

import fs from "fs";
import path from "path";

const REQUIRED_ENV_VARS = {
    "PORT": "3000",
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_USER": "postgres",
    "DB_PASSWORD": "postgres",
    "DB_NAME": "postgres"
};

export default function loadEnv() {
    const envFile = path.resolve(process.cwd(), ".env");

    if (!fs.existsSync(envFile) || fs.readFileSync(envFile).toString().trim().length === 0) {
        fs.writeFileSync(envFile, "");
        for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
            fs.appendFileSync(envFile, `${key}=${value}\n`);
        }
        console.warn("[WARNING] .env file created with default values. Please update it with your own values.");
    }

    // Load the environment variables into process.env
    process.loadEnvFile(envFile);
}