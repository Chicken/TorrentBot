import { readdir } from "node:fs/promises";
import { QBittorrent } from "qbit.js";
import { config } from "../config";
import { Command, ctx } from "../ctx";
import { logger } from "./logger";

async function loadEvents(files: string[]) {
    await Promise.all(
        files.map(async (file) => {
            const eventName = file.split(".")[0];
            try {
                logger.debug(`Loading event "${eventName}"`);
                const { default: event } = (await import(`../events/${eventName}`)) as {
                    default: (...args: any[]) => void;
                };
                if (!event) throw new Error("Event doesn't export default.");
                ctx.client.on(eventName, event);
            } catch (err) {
                logger.error(
                    `Failed loading event "${eventName}"\n${
                        err instanceof Error ? err.stack ?? err.message : String(err)
                    }`
                );
            }
        })
    );
}

async function loadCommands(files: string[]) {
    await Promise.all(
        files.map(async (file) => {
            const commandName = file.split(".")[0];
            try {
                logger.debug(`Loading command "${commandName}"`);
                const command = (await import(`../commands/${commandName}`)) as Command;
                ctx.commands.set(commandName, command);
            } catch (err) {
                logger.error(
                    `Failed loading command "${commandName}"\n${
                        err instanceof Error ? err.stack ?? err.message : String(err)
                    }`
                );
            }
        })
    );
}

const load = async () => {
    logger.log("Loading events and commands...");

    const [evtFiles, cmdFiles] = await Promise.all([readdir("dist/events"), readdir("dist/commands")]);
    await Promise.all([
        loadEvents(evtFiles.filter((f) => f.endsWith(".js"))),
        loadCommands(cmdFiles.filter((f) => f.endsWith(".js"))),
    ]);

    logger.success("Events and commands loaded!");

    logger.log("Loading qBittorrent...");

    ctx.qbit = new QBittorrent(config.qbit.host, config.qbit.insecure);
    try {
        await ctx.qbit.login(config.qbit.user, config.qbit.pass);
    } catch (err) {
        logger.error(`Failed to load qBittorrent\n${err instanceof Error ? err.stack ?? err.message : String(err)}`);
        process.exit();
    }

    logger.success("qBittorrent loaded!");
};

export default load;
