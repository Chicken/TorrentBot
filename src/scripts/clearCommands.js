import { Client } from "discord.js";
import config from "../config";
import logger from "../lib/logger";

const guildId = process.argv[2];

const client = new Client({
    intents: [],
});

client.login(config.token).catch((e) => {
    logger.error(`Failed to login\n${e.stack}`);
    client.destroy();
    process.exit();
});

client.on("ready", async () => {
    try {
        const guild = await client.guilds.fetch(guildId);
        const cmds = await guild.commands.fetch();
        await Promise.all(cmds.map((cmd) => cmd.delete()));
        logger.success("Clearing succesfull!");
    } catch (e) {
        logger.error(`Failed to clear commands\n${e.stack}`);
    } finally {
        client.destroy();
        process.exit();
    }
});
