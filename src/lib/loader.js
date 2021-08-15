import { readdir } from "fs/promises";
import logger from "./logger";
import qBittorrent from "./qBittorrent";
import config from "../config";

const loadEvents = async (client, files) => {
    await Promise.all(
        files.map(async (file) => {
            const eventName = file.split(".")[0];
            try {
                const event = (await import(`../events/${file}`)).default;
                if (!event) throw new Error("Event doesn't export default.");
                client.on(eventName, event.bind(null, client));
            } catch (e) {
                logger.error(`Failed loading event "${eventName}"\n${e.stack}`);
            }
        })
    );
};

const loadCommands = async (client, files) => {
    await Promise.all(
        files.map(async (file) => {
            const commandName = file.split(".")[0];
            try {
                const command = (await import(`../commands/${file}`)).default;
                if (!command) throw new Error("Command doesn't export default.");
                if (!command.run) throw new Error("Command doesn't have handler.");
                client.commands.set(commandName, command.run);
            } catch (e) {
                logger.error(`Failed loading command "${commandName}"\n${e.stack}`);
            }
        })
    );
};

const load = async (client) => {
    client.commands = new Map();

    logger.log("Loading events and commands...");

    const [evtFiles, cmdFiles] = await Promise.all([
        readdir("src/events"),
        readdir("src/commands"),
    ]);

    await Promise.all([loadEvents(client, evtFiles), loadCommands(client, cmdFiles)]);

    logger.success("Events and commands loaded!");

    logger.log("Loading qBittorrent...");

    // eslint-disable-next-line new-cap
    client.qbit = new qBittorrent({
        host: config.qbit.host,
        user: config.qbit.user,
        password: config.qbit.pass,
        insecure: config.qbit.insecure,
    });
    try {
        await client.qbit.defer;
    } catch (e) {
        logger.error(`Failed to load qBittorrent\n${e.stack}`);
        process.exit();
    }

    logger.success("qBittorrent loaded!");
};

export default load;
