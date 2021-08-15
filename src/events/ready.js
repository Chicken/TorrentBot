import logger from "../lib/logger";

export default (client) => {
    logger.success(`${client.user.tag} succesfully online!`);
};
