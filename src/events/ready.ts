import { ctx } from "../ctx";
import { logger } from "../lib/logger";

export default async function ready() {
    logger.success(`${ctx.client?.user?.tag} succesfully online!`);

    logger.log("Deploying commands...");

    if (process.env.NODE_ENV === "development" && process.env.DEV_GUILD) {
        const guild = await ctx.client.guilds.fetch(process.env.DEV_GUILD);
        await guild.commands.set([...ctx.commands].map(([, c]) => c.data));
        logger.debug("Deployed dev commands");
    } else {
        await ctx.client?.application?.commands.set([...ctx.commands].map(([, c]) => c.data));
        logger.debug("Deployed global commands");
    }

    logger.success("Deployed commands!");
}
