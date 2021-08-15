import { Client } from "discord.js";
import config from "./config";
import load from "./lib/loader";
import logger from "./lib/logger";

const client = new Client({
    intents: [],
});

process.on("SIGINT", () => process.exit());
process.on("SIGTERM", () => process.exit());
process.on("exit", () => {
    client.destroy();
    logger.log("Exited...");
});

(async () => {
    try {
        await load(client);
        await client.login(config.token);
    } catch (e) {
        logger.error(`Error during startup\n${e.stack}`);
        process.exit();
    }
})();
