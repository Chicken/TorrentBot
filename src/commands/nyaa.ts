import { SelectMenuBuilder, SlashCommandBuilder } from "@discordjs/builders";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionCollector,
    InteractionType,
    StringSelectMenuBuilder,
    escapeMarkdown,
} from "discord.js";
import { ctx } from "../ctx.js";
import Nyaa, { Category, Filter, Order, Sort, Torrent } from "../lib/Nyaa.js";
import { logger } from "../lib/logger.js";
import crypto from "node:crypto";

const perPage = 15;

function createPage(data: Torrent[], pageNum: number, maxPage: number) {
    return new EmbedBuilder()
        .setTitle("Nyaa.si search")
        .setColor("#2C7CFF")
        .setDescription(
            data
                .map(
                    (t, i) =>
                        `${i + 1 + pageNum * perPage}. __${escapeMarkdown(t.name)}__\n**Size**: ${
                            t.filesize
                        } | **Released**: ${t.date.toLocaleString("en-gb")}\n**Seeders**: ${
                            t.seeders
                        } | **Leechers**: ${t.leechers} | **Downloads**: ${t.downloads}`
                )
                .join("\n")
                .substring(0, 4096)
        )
        .setFooter({
            text: `Page ${pageNum + 1}/${maxPage}`,
        });
}

export const data = new SlashCommandBuilder()
    .setName("nyaa")
    .setDescription("Search and download from Nyaa.")
    .addStringOption((opt) => opt.setName("search").setDescription("Search term for Nyaa (default: *)"))
    .addStringOption((opt) =>
        opt
            .setName("filter")
            .setDescription("Filter out releases (default: No filter)")
            .addChoices(
                ...[
                    { name: "No filter", value: Filter.NoFilter },
                    { name: "No remakes", value: Filter.NoRemakes },
                    { name: "Trusted only", value: Filter.TrustedOnly },
                ]
            )
    )
    .addStringOption((opt) =>
        opt
            .setName("sort")
            .setDescription("Sort torrents (default: Date)")
            .addChoices(
                ...[
                    { name: "Size", value: Sort.Size },
                    { name: "Date", value: Sort.Date },
                    { name: "Seeders", value: Sort.Seeders },
                    { name: "Leechers", value: Sort.Leechers },
                    { name: "Downloads", value: Sort.Downloads },
                    { name: "Comment count", value: Sort.Comments },
                ]
            )
    )
    .addStringOption((opt) =>
        opt
            .setName("order")
            .setDescription("Order of sorting (default: Descending)")
            .addChoices(
                ...[
                    { name: "Ascending", value: Order.Ascending },
                    { name: "Descending", value: Order.Descending },
                ]
            )
    )
    .addStringOption((opt) =>
        opt
            .setName("category")
            .setDescription("Category to search in (default: Anime - English)")
            .addChoices(
                ...[
                    { name: "All Categories", value: Category.All },
                    { name: "Anime", value: Category.Anime },
                    { name: "Anime - English", value: Category.AnimeEnglish },
                    { name: "Anime - Raw", value: Category.AnimeRaw },
                    { name: "Audio", value: Category.Audio },
                    { name: "Audio - Lossless", value: Category.AudioLossless },
                    { name: "Audio - Lossy", value: Category.AudioLossy },
                    { name: "Literature", value: Category.Literature },
                    { name: "Literature - English", value: Category.LiteratureEnglish },
                    { name: "Literature - Raw", value: Category.LiteratureRaw },
                ]
            )
    )
    .toJSON();

export async function run(command: ChatInputCommandInteraction) {
    await command.deferReply({ ephemeral: true });

    const search = new Nyaa()
        .setQuery(command.options.getString("search") ?? "")
        .setFilter((command.options.getString("filter") as Filter | null) ?? Filter.NoFilter)
        .setSort((command.options.getString("sort") as Sort | null) ?? Sort.Date)
        .setOrder((command.options.getString("order") as Order | null) ?? Order.Descending)
        .setCategory((command.options.getString("category") as Category | null) ?? Category.AnimeEnglish);
    await search.fetch();

    if (search.totalResults === 0) {
        await command.editReply("Nothing found!");
        return;
    }

    let virtPage = 0;
    const virtMaxPage = Math.ceil(search.totalResults / perPage);

    const exchangeId = crypto.randomBytes(4).toString("hex");

    const actionRow = new ActionRowBuilder<ButtonBuilder>();
    const backBtn = new ButtonBuilder()
        .setCustomId("back." + exchangeId)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("⬅️");
    const forwardBtn = new ButtonBuilder()
        .setCustomId("forward." + exchangeId)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("➡️");
    const downloadBtn = new ButtonBuilder()
        .setCustomId("download." + exchangeId)
        .setStyle(ButtonStyle.Success)
        .setEmoji("⬇️");

    actionRow.addComponents(backBtn, forwardBtn, downloadBtn);

    const msg = await command.editReply({
        embeds: [createPage(search.current.slice(0, perPage), virtPage, virtMaxPage)],
        components: [actionRow],
    });

    const collector = new InteractionCollector(ctx.client, {
        filter: (i) => i.user.id === command.user.id && i.customId.split(".")[1] === exchangeId,
        time: 10 * 60 * 1000,
        interactionType: InteractionType.MessageComponent,
        channel: msg.channelId,
    });

    let finished = false;
    collector.on("end", async () => {
        try {
            if (!finished) {
                await command.editReply({
                    content: "This session has ended.",
                    embeds: [],
                    components: [],
                });
            }
        } catch {
            // ignore
        }
    });

    collector.on("collect", async (i) => {
        try {
            const customId = i.customId.split(".")[0];
            switch (customId) {
                case "back":
                    virtPage = virtPage > 0 ? virtPage - 1 : virtMaxPage - 1;
                    break;
                case "forward":
                    virtPage = virtPage + 1 < virtMaxPage ? virtPage + 1 : 0;
                    break;
                case "download": {
                    if (!i.isButton()) throw new Error("The interaction ain't a button");
                    const downloadRow = new ActionRowBuilder<SelectMenuBuilder>();
                    const downloadMenu = new StringSelectMenuBuilder()
                        .setCustomId("downloadConfirm." + exchangeId)
                        .setMinValues(1)
                        .setMaxValues(1)
                        .addOptions(
                            [
                                {
                                    label: "Cancel",
                                    value: "cancel",
                                },
                            ].concat(
                                [
                                    ...Array<undefined>(
                                        Math.min(15, search.current.length - ((virtPage * perPage) % 75))
                                    ),
                                ].map((_, j) => ({
                                    label: (1 + j + virtPage * perPage).toString(),
                                    value: (1 + j + virtPage * perPage).toString(),
                                }))
                            )
                        );
                    downloadRow.addComponents(downloadMenu);
                    await i.update({
                        components: [downloadRow],
                    });
                    return;
                }
                case "downloadConfirm": {
                    if (!i.isStringSelectMenu()) throw new Error("The interaction ain't a select menu");
                    finished = true;
                    collector.stop();
                    if (i.values[0] === "cancel") {
                        await i.update({
                            content: "Cancelled.",
                            embeds: [],
                            components: [],
                        });
                        return;
                    }
                    const choice = parseInt(i.values[0], 10) - 1;
                    const torrent = search.current[choice % 75];
                    try {
                        await ctx.qbit.api.addTorrent(torrent.magnet, { category: "Anime" });
                    } catch (err) {
                        await i.update({
                            content: "An error occured.",
                            embeds: [],
                            components: [],
                        });
                        logger.error(
                            `Something went wrong adding torrent\n${
                                err instanceof Error ? err.stack ?? err.message : String(err)
                            }`
                        );
                        return;
                    }
                    await i.update({
                        content: `Download started for "${escapeMarkdown(torrent.name)}"`,
                        embeds: [],
                        components: [],
                    });
                    return;
                }
                default:
            }
            await search.setPage(Math.floor(virtPage / 5));
            await command.editReply({
                embeds: [
                    createPage(
                        search.current.slice(
                            perPage * virtPage - search.page * 75,
                            perPage * (virtPage + 1) - search.page * 75
                        ),
                        virtPage,
                        virtMaxPage
                    ),
                ],
            });
            await i.deferUpdate();
        } catch (err) {
            try {
                if (i.isModalSubmit()) throw new Error("Yeah we don't have modals here");

                await i[i.replied || i.deferred ? "editReply" : "reply"]({
                    content: "Something went wrong...",
                    ephemeral: true,
                });
            } catch (_) {
                // ignore
            } finally {
                logger.error(
                    `Error while handling a button\n${err instanceof Error ? err.stack ?? err.message : String(err)}`
                );
            }
        }
    });
}
