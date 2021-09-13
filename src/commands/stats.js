import { SlashCommandBuilder } from "@discordjs/builders";
import qBittorrent from "../lib/qBittorrent";

export default {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("qBittorrent statistics.")
        .toJSON(),
    run: async (client, command) => {
        await command.deferReply({ ephemeral: true });
        const stats = await client.qbit.getStatistics();
        await command.editReply(
            [
                "```",
                `Status   | ${stats.status}`,
                `Upload   | ${qBittorrent.prettySize(stats.totalUpload)}`,
                `Download | ${qBittorrent.prettySize(stats.totalDownload)}`,
                `Ratio    | ${stats.ratio}`,
                `Peers    | ${stats.peers}`,
                `Torrents | ${stats.torrentCount}`,
                `Trackers | ${stats.trackerCount}`,
                "```",
            ].join("\n")
        );
    },
};
