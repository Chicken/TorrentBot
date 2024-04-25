import { ctx } from "../ctx.js";
import { logger } from "../lib/logger.js";

export default async function ready() {
    logger.success(`${ctx.client?.user?.tag} succesfully online!`);

    logger.log("Deploying commands...");

    // TODO: do normally when support arrives
    // await ctx.client!.application!.commands.set([...ctx.commands].map(([, c]) => c.data));
    await ctx.client.rest.put(`/applications/${ctx.client.application.id}/commands`, {
        body: [...ctx.commands].map(([, c]) => c.data),
    });

    logger.success("Deployed commands!");
}
