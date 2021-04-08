import { Message, Client } from "discord.js";

/**
 * Checks the message against global and modular commands.
 * @param message Message to parse
 * @param client Bot client object, may be used in action command requires
 * @returns Whether the message was found to be a valid command
 */
export const process_message_for_commands = function(message: Message, client: Client): boolean {
    return false;
}