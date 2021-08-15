import { Client } from "discord.js";
import { readdir } from "fs/promises";
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
        const cmdFiles = await readdir("./src/commands");

        const commands = (
            await Promise.all(
                cmdFiles.map(async (file) => {
                    const commandName = file.split(".")[0];
                    try {
                        const command = (await import(`../commands/${file}`)).default;
                        if (!command) throw new Error("Command doesn't export default.");
                        if (!command.data) throw new Error("Command doesn't have data.");
                        return { ...command.data, defaultPermission: false };
                    } catch (e) {
                        logger.error(`Failed loading command "${commandName}"\n${e.stack}`);
                        return null;
                    }
                })
            )
        ).filter(Boolean);

        const guild = await client.guilds.fetch(guildId);
        await guild.commands.fetch();
        await guild.commands.set(commands);
        await guild.commands.permissions.set({
            fullPermissions: guild.commands.cache.map((cmd) => ({
                id: cmd.id,
                permissions: config.users.map((user) => ({
                    type: "USER",
                    id: user,
                    permission: true,
                })),
            })),
        });
        logger.success("Deployment succesfull!");
    } catch (e) {
        logger.error(`Failed to set commands\n${e.stack}`);
    } finally {
        client.destroy();
        process.exit();
    }
});
