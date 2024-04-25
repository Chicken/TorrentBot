import { SlashCommandBuilder } from "@discordjs/builders";
import type { ChatInputCommandInteraction } from "discord.js";
import { prettySize } from "qbit.js";
import { ctx } from "../ctx.js";

export const data = new SlashCommandBuilder().setName("stats").setDescription("qBittorrent statistics.").toJSON();

export async function run(command: ChatInputCommandInteraction) {
    await command.deferReply();
    const stats = await ctx.qbit.api.getMainData();
    await command.editReply(
        [
            "```",
            `Status   | ${stats.server_state?.connection_status}`,
            `Upload   | ${prettySize(stats.server_state?.alltime_ul ?? 0)}`,
            `Download | ${prettySize(stats.server_state?.alltime_dl ?? 0)}`,
            `Ratio    | ${stats.server_state?.global_ratio}`,
            `Peers    | ${stats.server_state?.total_peer_connections}`,
            `Torrents | ${Object.values(stats.torrents ?? {}).length}`,
            `Trackers | ${Object.values(stats.trackers ?? {}).length}`,
            "```",
        ].join("\n")
    );
}
