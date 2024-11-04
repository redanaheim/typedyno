import { Guild } from "discord.js";
import { GLOBAL_PREFIX } from "../main";

/**
 * Uses the Heroku postgres server database to get the local prefix
 * @param server Server to check the prefix for
 * @returns Prefix for the start of commands. Example: '%' in "%info" or "t1" in "t1info"
 */
export const get_prefix = async function(server: Guild): Promise<string> {
    // TODO: use postgres
    return GLOBAL_PREFIX;
}