import { SlashCommandBuilder } from "@discordjs/builders";
import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { ctx } from "../ctx";
import { logger } from "../lib/logger";

export const data = new SlashCommandBuilder()
    .setName("download")
    .setDescription("Download a torrent from a link.")
    .addStringOption((opt) =>
        opt.setName("link").setDescription("A magnet link or a link to a torrent file.").setRequired(true)
    )
    .addStringOption((opt) =>
        opt.setName("category").setDescription("Category to give the torrent.").setAutocomplete(true)
    )
    .toJSON();

export async function run(command: ChatInputCommandInteraction) {
    await command.deferReply({ ephemeral: true });
    const link = command.options.getString("link", true);
    if (!["https://", "http://", "magnet:"].some((s) => link.startsWith(s))) {
        await command.editReply("Invalid link!");
        return;
    }
    const category = command.options.getString("category") ?? undefined;

    try {
        await ctx.qbit.api.addTorrent(link, { category });
    } catch (err) {
        await command.editReply("An error occured.");
        logger.error(
            `Something went wrong adding torrent\n${err instanceof Error ? err.stack ?? err.message : String(err)}`
        );
        return;
    }

    await command.editReply("Started downloading...");
}

export async function autocomplete(autocomplete: AutocompleteInteraction) {
    const categories = Object.values(await ctx.qbit.api.getCategories());
    const query = autocomplete.options.getString("category", true).toLowerCase();
    await autocomplete.respond(
        categories.filter((c) => c.name.toLowerCase().startsWith(query)).map((c) => ({ name: c.name, value: c.name }))
    );
}
