import { SlashCommandBuilder } from "@discordjs/builders";
import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import assert from "node:assert";
import { ctx } from "../ctx.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
    .setName("download")
    .setDescription("Download a torrent from a link or file.")
    .addStringOption((opt) =>
        opt.setName("link").setDescription("A magnet link or a link to a torrent file.").setRequired(false)
    )
    .addAttachmentOption((opt) => opt.setName("file").setDescription("A torrent file to upload.").setRequired(false))
    .addStringOption((opt) =>
        opt.setName("category").setDescription("Category to give the torrent.").setAutocomplete(true)
    )
    .toJSON();

export async function run(command: ChatInputCommandInteraction) {
    await command.deferReply({ ephemeral: true });
    const link = command.options.getString("link", false);
    const file = command.options.getAttachment("file", false);
    if (link && !["https://", "http://", "magnet:"].some((s) => link.startsWith(s))) {
        await command.editReply("Invalid link!");
        return;
    }
    if (
        file &&
        (!file.name.endsWith(".torrent") ||
            !["application/x-bittorrent", "application/octet-stream"].includes(file.contentType ?? ""))
    ) {
        await command.editReply("Invalid file!");
        return;
    }
    if (!link && !file) {
        await command.editReply("You must provide a link or a file.");
        return;
    }
    if (link && file) {
        await command.editReply("You can't provide both a link and a file.");
        return;
    }
    const category = command.options.getString("category") ?? undefined;
    const fileOrLink = file ? file.url : link ? link : null;
    assert(fileOrLink);
    console.log("downloading", fileOrLink);
    try {
        await ctx.qbit.api.addTorrent(fileOrLink, category ? { category } : undefined);
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
