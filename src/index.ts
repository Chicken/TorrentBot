import { Client } from "discord.js";
import { config } from "./config.js";
import { ctx } from "./ctx.js";
import load from "./lib/loader.js";
import { logger } from "./lib/logger.js";

const client = new Client({
    intents: [],
});

function exit() {
    void (async function () {
        await client.destroy().catch(() => null);
        logger.log("Exited...");
        process.exit();
    })();
}
process.on("SIGINT", () => exit());
process.on("SIGTERM", () => exit());

try {
    ctx.client = client;
    await load();
    logger.log("Logging in...");
    await client.login(config.token);
} catch (err) {
    logger.error(`Error during startup\n${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    process.exit(1);
}
