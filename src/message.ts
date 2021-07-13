import { Client, Message, MessageMentions } from "discord.js";
import { Pool } from "pg";
import { process_message_for_commands } from "./functions";
import { get_prefix } from "./integrations/server_prefixes";
import { BOT_USER_ID, GLOBAL_PREFIX } from "./main";

/**
 * Reacts in the appropriate way to a message, whether it be a command or something which should be ignored.
 *
 * Passed into `process_message_for_commands` to check for commands, this just reacts to mentions
 * @param message Message that triggered the event
 * @param client Bot client object, which may be used in a response to a command
 * @param pool Connection pool object, used in database requests
 */
export const process_message = async function (
  message: Message,
  client: Client,
  pool: Pool
) {
  // Only use this area for non-command responses
  // such as replying to DMs.

  const is_command = process_message_for_commands(message, client);

  // Process other information here like DMs, or mentions.
  // (Don't react to the mention if it's part of a command)
  if (message.mentions.users.has(BOT_USER_ID) && is_command === false) {
    if (message.guild !== null) {
      const prefix = await get_prefix(message.guild, pool);
      // If the channel isn't a DM
      message.channel.send(
        `Hi! I'm TigerDyno, a WIP bot developed by TigerGold59#8729. Use ${prefix}info (on this server, global prefix is ${GLOBAL_PREFIX}) for a more complete description.`
      );
    } else {
      message.channel.send(
        `Hi! I'm TigerDyno, a WIP bot developed by TigerGold59#8729. Use ${GLOBAL_PREFIX}info for a more complete description. You can also mention me on a server for my local prefix.`
      );
    }
  }
};
