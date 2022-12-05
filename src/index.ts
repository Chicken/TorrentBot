import { Client } from "discord.js";
import { config } from "./config";
import { ctx } from "./ctx";
import load from "./lib/loader";
import { logger } from "./lib/logger";

const client = new Client({
    intents: [],
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
process.on("exit", () => {
    client.destroy();
    logger.log("Exited...");
});

try {
    ctx.client = client;
    await load();
    logger.log("Logging in...");
    await client.login(config.token);
} catch (err) {
    logger.error(`Error during startup\n${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    process.exit(1);
}
