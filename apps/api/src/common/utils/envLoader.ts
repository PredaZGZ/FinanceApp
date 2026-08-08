// Load environment variables safely, building the envFile if not existing with the default values

import fs from "fs";
import path from "path";
import crypto from "crypto";

const REQUIRED_ENV_VARS = {
    "PORT": "3001",
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_USER": "postgres",
    "DB_PASSWORD": "postgres",
    "DB_NAME": "financeapp"
};

const GENERATED_SECRET_VARS = ["JWT_SECRET", "PEPPER", "ENCRYPTION_KEY"] as const;

export default function loadEnv() {
    const envFile = path.resolve(process.cwd(), ".env");

    if (!fs.existsSync(envFile)) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Missing .env file. Production configuration must be provided explicitly.");
        }

        const lines: string[] = [];
        for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
            lines.push(`${key}=${value}`);
        }
        for (const key of GENERATED_SECRET_VARS) {
            lines.push(`${key}=${crypto.randomBytes(32).toString("hex")}`);
        }
        fs.writeFileSync(envFile, `${lines.join("\n")}\n`, { mode: 0o600 });
        console.warn("[WARNING] Created a local .env with unique development secrets.");
    }

    process.loadEnvFile(envFile);

    for (const key of GENERATED_SECRET_VARS) {
        if (!process.env[key]) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
    }
}
