import { SlashCommandBuilder } from "@discordjs/builders";
import type { ChatInputCommandInteraction } from "discord.js";
import { prettySize, Size, Speed } from "qbit.js";
import { ctx } from "../ctx.js";

export const data = new SlashCommandBuilder().setName("stats").setDescription("qBittorrent statistics.").toJSON();

export async function run(command: ChatInputCommandInteraction) {
    await command.deferReply();
    const stats = await ctx.qbit.api.getMainData();
    await command.editReply(
        [
            "```",
            `Status   | ${stats.server_state?.connection_status}`,
            `Upload   | ${prettySize(Size.bytes(stats.server_state?.alltime_ul ?? 0))} @ ${prettySize(Speed.bytesPerSecond(stats.server_state?.up_info_speed ?? 0), true)}`,
            `Download | ${prettySize(Size.bytes(stats.server_state?.alltime_dl ?? 0))} @ ${prettySize(Speed.bytesPerSecond(stats.server_state?.dl_info_speed ?? 0), true)}`,
            `Ratio    | ${stats.server_state?.global_ratio}`,
            `Peers    | ${stats.server_state?.total_peer_connections}`,
            `Torrents | ${Object.values(stats.torrents ?? {}).length}`,
            `Trackers | ${Object.values(stats.trackers ?? {}).length}`,
            "```",
        ].join("\n")
    );
}
