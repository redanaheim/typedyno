import { Client, Message, MessageMentions } from "discord.js";
import { Pool } from "pg";
import { process_message_for_commands } from "./functions";
import { get_prefix } from "./integrations/server_prefixes";
import { BOT_USER_ID, GLOBAL_PREFIX } from "./main";
import { log, LogType } from "./utilities/log";
import { is_number } from "./utilities/typeutils";

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

  const command_results = await process_message_for_commands(message, client, pool);

  if (command_results.did_find_command === true) {
    if (command_results.command_authorized === false) {
      // TODO: Include an unauthorized message in command results object
      message.channel.send("You are not authorized to use that command. This could be because of command permissions, or because of a function-level restriction.")
    }
    if (command_results.command_worked === true && is_number(command_results.call_to_return_span_ms)) {
      log(`Bot command ${command_results.command_name} run successfully in ${command_results.call_to_return_span_ms.toString()} ms.`, LogType.Success)
    }
  }

  // Process other information here like DMs, or mentions.
  // (Don't react to the mention if it's part of a command)
  if (message.mentions.users.has(BOT_USER_ID) && command_results.did_find_command === false) {
    const prefix = await get_prefix(message.guild, pool);
    if (prefix !== GLOBAL_PREFIX) {
      // If we have a specific prefix
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
