import type { Interaction } from "discord.js";
import { config } from "../config";
import { ctx } from "../ctx";
import { logger } from "../lib/logger";

export default async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
        try {
            if (!config.users.includes(interaction.user.id)) {
                await interaction.reply({
                    content: "You don't have the permission to use that!",
                    ephemeral: true,
                });
                return;
            }

            const command = ctx.commands.get(interaction.commandName);
            if (!command) {
                await interaction.reply({
                    content: "For some reason this command was left unhandled.",
                    ephemeral: true,
                });
                return;
            }
            await command.run(interaction);
        } catch (err) {
            try {
                await interaction[interaction.replied || interaction.deferred ? "editReply" : "reply"]({
                    content: "Something went wrong while executing that command...",
                    ephemeral: true,
                });
            } catch {
                // ignore
            } finally {
                logger.error(
                    `Error while handling a command\n${err instanceof Error ? err.stack ?? err.message : String(err)}`
                );
            }
        }
    } else if (interaction.isAutocomplete()) {
        try {
            if (!config.users.includes(interaction.user.id)) {
                await interaction.respond([]);
                return;
            }

            const command = ctx.commands.get(interaction.commandName);
            if (!command || !command.autocomplete) {
                console.error(`Unhandled autocomplete "${interaction.commandName}"`);
                await interaction.respond([]);
                return;
            }
            await command.autocomplete(interaction);
        } catch (err) {
            try {
                if (!interaction.responded) await interaction.respond([]);
            } catch {
                // ignore
            } finally {
                console.error(
                    `Error while handling a command\n${err instanceof Error ? err.stack ?? err.message : String(err)}`
                );
            }
        }
    }
};
