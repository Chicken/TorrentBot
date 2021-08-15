import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu, Util } from "discord.js";
import Nyaa, { Filter, Sort, Order, Category } from "../lib/Nyaa";
import logger from "../lib/logger";

function createPage(data, pageNum, maxPage) {
    return new MessageEmbed()
        .setTitle("Nyaa.si search")
        .setColor("#2C7CFF")
        .setDescription(
            data
                .map(
                    (t, i) =>
                        `${i + 1 + pageNum * 15}. __${Util.escapeMarkdown(t.name)}__\n**Size**: ${
                            t.filesize
                        } | **Released**: ${t.date.toLocaleString("en-gb")}\n**Seeders**: ${
                            t.seeders
                        } | **Leechers**: ${t.leechers} | **Downloads**: ${t.downloads}`
                )
                .join("\n")
                .substr(0, 4096)
        )
        .setFooter(`Page ${pageNum + 1}/${maxPage}`);
}

export default {
    data: new SlashCommandBuilder()
        .setName("nyaa")
        .setDescription("Search and download from Nyaa.")
        .addStringOption((opt) =>
            opt.setName("search").setDescription("Search term for Nyaa (default: *)")
        )
        .addStringOption((opt) =>
            opt
                .setName("filter")
                .setDescription("Filter out releases (default: No filter)")
                .addChoices([
                    ["No filter", Filter.NO_FILTER],
                    ["No remakes", Filter.NO_REMAKES],
                    ["Trusted only", Filter.TRUSTED_ONLY],
                ])
        )
        .addStringOption((opt) =>
            opt
                .setName("sort")
                .setDescription("Sort torrents (default: Date)")
                .addChoices([
                    ["Size", Sort.SIZE],
                    ["Date", Sort.DATE],
                    ["Seeders", Sort.SEEDERS],
                    ["Leechers", Sort.LEECHERS],
                    ["Downloads", Sort.DOWNLOADS],
                    ["Comment count", Sort.COMMENTS],
                ])
        )
        .addStringOption((opt) =>
            opt
                .setName("order")
                .setDescription("Order of sorting (default: Descending)")
                .addChoices([
                    ["Ascending", Order.ASCENDING],
                    ["Descending", Order.DESCENDING],
                ])
        )
        .addStringOption((opt) =>
            opt
                .setName("category")
                .setDescription("Category to search in (default: Anime - English)")
                .addChoices([
                    ["All Categories", Category.ALL],
                    ["Anime", Category.ANIME],
                    ["Anime - English", Category.ANIME_ENGLISH],
                    ["Anime - Raw", Category.ANIME_RAW],
                    ["Audio", Category.AUDIO],
                    ["Audio - Lossless", Category.AUDIO_LOSSLESS],
                    ["Audio - Lossy", Category.AUDIO_LOSSY],
                    ["Literature", Category.LITERATURE],
                    ["Literature - English", Category.LITERATURE_ENGLISH],
                    ["Literature - Raw", Category.LITERATURE_RAW],
                ])
        )
        .toJSON(),
    run: async (client, command) => {
        await command.deferReply({ ephemeral: true });

        const search = new Nyaa()
            .setQuery(command.options.getString("search") ?? "")
            .setFilter(command.options.getString("filter") ?? Filter.NO_FILTER)
            .setSort(command.options.getString("sort") ?? Sort.DATE)
            .setOrder(command.options.getString("order") ?? Order.DESCENDING)
            .setCategory(command.options.getString("category") ?? Category.ANIME_ENGLISH);
        await search.fetch();

        if (search.totalResults === 0) {
            await command.editReply("Nothing found!");
            return;
        }

        let virtPage = 0;
        const virtMaxPage = Math.ceil(search.totalResults / 15);

        const actionRow = new MessageActionRow();
        const backBtn = new MessageButton().setCustomId("back").setStyle("PRIMARY").setEmoji("⬅️");
        const forwardBtn = new MessageButton()
            .setCustomId("forward")
            .setStyle("PRIMARY")
            .setEmoji("➡️");
        const downloadBtn = new MessageButton()
            .setCustomId("download")
            .setStyle("SUCCESS")
            .setEmoji("⬇️");

        actionRow.addComponents(backBtn, forwardBtn, downloadBtn);

        const msg = await command.editReply({
            embeds: [createPage(search.current.slice(0, 15), virtPage, virtMaxPage)],
            components: [actionRow],
        });

        const channel = await client.channels.fetch(msg.channel?.id ?? msg.channel_id);

        const collector = await channel.createMessageComponentCollector({
            filter: (i) => i.message.id === msg.id && i.user.id === command.user.id,
            time: 10 * 60 * 1000,
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
            } catch (e) {
                // ignore
            }
        });

        collector.on("collect", async (i) => {
            try {
                switch (i.customId) {
                    case "back":
                        virtPage = virtPage > 0 ? virtPage - 1 : virtMaxPage - 1;
                        break;
                    case "forward":
                        virtPage = virtPage + 1 < virtMaxPage ? virtPage + 1 : 0;
                        break;
                    case "download": {
                        const downloadRow = new MessageActionRow();
                        const downloadMenu = new MessageSelectMenu()
                            .setCustomId("downloadConfirm")
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
                                        ...Array(
                                            15 -
                                                (virtPage % 5 === 4
                                                    ? 75 - search.current.length
                                                    : 0)
                                        ),
                                    ].map((_, j) => ({
                                        label: (1 + j + virtPage * 15).toString(),
                                        value: (1 + j + virtPage * 15).toString(),
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
                        const choice = i.values[0] - 1;
                        const torrent = search.current[choice % 75];
                        let status;
                        try {
                            status = await client.qbit.addTorrent(torrent.magnet, "Anime");
                        } catch (e) {
                            await i.update({
                                content: "An error occured.",
                                embeds: [],
                                components: [],
                            });
                            logger.error(`Something went wrong adding torrent\n${e.stack}`);
                            return;
                        }
                        if (status === "Success") {
                            await i.update({
                                content: `Download started for "${Util.escapeMarkdown(
                                    torrent.name
                                )}"`,
                                embeds: [],
                                components: [],
                            });
                        } else {
                            await i.update({
                                content: "Invalid torrent!",
                                embeds: [],
                                components: [],
                            });
                        }
                        return;
                    }
                    default:
                }
                await search.setPage(Math.floor(virtPage / 5));
                await command.editReply({
                    embeds: [
                        createPage(
                            search.current.slice(
                                15 * virtPage - search.page * 75,
                                15 * (virtPage + 1) - search.page * 75
                            ),
                            virtPage,
                            virtMaxPage
                        ),
                    ],
                });
                await i.deferUpdate();
            } catch (e) {
                try {
                    await i[i.replied || i.deferred ? "editReply" : "reply"]({
                        content: "Something went wrong...",
                        ephemeral: true,
                    });
                } catch (_) {
                    // ignore
                } finally {
                    logger.error(`Error while handling a button\n${e.stack}`);
                }
            }
        });
    },
};
