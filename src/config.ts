import { logger } from "./lib/logger";

const requiredKeys = ["TOKEN", "USERS", "QBIT_HOST", "QBIT_USER", "QBIT_PASS"] as const;
const missing = requiredKeys.filter((key) => !process.env[key]);
if (missing.length) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
}

if (!/^\d{17,19}(,\d{17,19})*?$/.test(process.env.USERS ?? "")) {
    logger.error("Invalid USERS list");
    process.exit(1);
}

if (process.env.QBIT_IGNORE_CERT && !["true", "false"].includes(process.env.QBIT_IGNORE_CERT)) {
    logger.error("Invalid QBIT_IGNORE_CERT value");
    process.exit(1);
}

export const config = {
    token: process.env.TOKEN ?? "",
    users: process.env.USERS?.split(",") ?? [],
    qbit: {
        host: process.env.QBIT_HOST ?? "",
        user: process.env.QBIT_USER ?? "",
        pass: process.env.QBIT_PASS ?? "",
        insecure: process.env.QBIT_IGNORE_CERT === "true",
    },
};
