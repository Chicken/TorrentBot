import logger from "../lib/logger";

export default async (client, interaction) => {
    if (!interaction.isCommand()) return;
    try {
        const action = client.commands.get(interaction.commandName);
        if (!action) {
            await interaction.reply({
                content: "For some reason this command was left unhandled.",
                ephemeral: true,
            });
            return;
        }
        await action(client, interaction);
    } catch (e) {
        try {
            await interaction[interaction.replied || interaction.deferred ? "editReply" : "reply"]({
                content: "Something went wrong while executing that command...",
                ephemeral: true,
            });
        } catch (_) {
            // ignore
        } finally {
            logger.error(`Error while handling a command\n${e.stack}`);
        }
    }
};
