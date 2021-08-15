import { SlashCommandBuilder } from "@discordjs/builders";
import logger from "../lib/logger";

export default {
    data: new SlashCommandBuilder()
        .setName("download")
        .setDescription("Download a torrent from a link.")
        .addStringOption((opt) =>
            opt
                .setName("link")
                .setDescription("A magnet link or a link to a torrent file.")
                .setRequired(true)
        )
        .addStringOption((opt) =>
            opt.setName("category").setDescription("Category to give the torrent.")
        )
        .toJSON(),
    run: async (client, command) => {
        await command.deferReply({ ephemeral: true });
        const link = command.options.getString("link");
        if (!["https://", "http://", "magnet:"].some((s) => link.startsWith(s))) {
            await command.editReply("Invalid link!");
            return;
        }
        const category = command.options.getString("category") ?? undefined;
        let status;
        try {
            status = await client.qbit.addTorrent(link, category);
        } catch (e) {
            await command.editReply("An error occured.");
            logger.error(`Something went wrong adding torrent\n${e.stack}`);
            return;
        }
        if (status === "Success") {
            await command.editReply("Started downloading...");
        } else {
            await command.editReply("Invalid torrent file!");
        }
    },
};
