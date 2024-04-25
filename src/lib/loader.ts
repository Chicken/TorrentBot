import { readdir } from "node:fs/promises";
import { QBittorrent } from "qbit.js";
import { config } from "../config.js";
import { Command, ctx } from "../ctx.js";
import { logger } from "./logger.js";

async function loadEvents(files: string[]) {
    await Promise.all(
        files.map(async (file) => {
            const eventName = file.split(".")[0];
            try {
                logger.debug(`Loading event "${eventName}"`);
                const { default: event } = (await import(`../events/${eventName}.js`)) as {
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
                const command = (await import(`../commands/${commandName}.js`)) as Command;

                // TODO: move this to the builders when support arrives
                // @ts-expect-error no library support yet
                command.data.integration_types = [1]; // USER_INSTALL
                // @ts-expect-error no library support yet
                command.data.contexts = [0, 1, 2]; // GUILD, BOT_DM, PRIVATE_CHANNEL

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
