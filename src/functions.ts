import { Message, Client } from "discord.js";
import { Pool } from "pg";
import { CommandManual, CommandManualType, get_type } from "./command_manual";
import { is_valid_Permissions, Permissions } from "./utilities/permissions";

export interface BotCommand {
    // Optional more specific permissions. If a module is unavailable, this command will be too,
    // however these permissions can further restrict certain commands.
    permissions?: Permissions,
    // The command manual object which will be added to %commands results when the module (if it's part of a module) is available.
    command_manual: CommandManual,
    // Command should return whether the message was valid or not
    process: (message: Message, client: Client, pool: Pool) => boolean
}

export const is_valid_BotCommand = function(thing?: any): boolean {
    if (!thing) {
        return false
    }
    else if (thing.permissions !== null && thing.permissions !== undefined && is_valid_Permissions(thing.permissions) === false) {
        return false
    }
    else if (get_type(thing.command_manual) !== CommandManualType.MultifacetedCommandManual && get_type(thing.command_manual) !== CommandManualType.SimpleCommandManual) {
        return false
    }
    else if (thing.process instanceof Function === false) {
        return false
    }
    
    return true
}

export const is_valid_ModuleCommand = is_valid_BotCommand

export const STOCK_BOT_COMMANDS: BotCommand[] = []

/**
 * Checks the message against global and modular commands.
 * @param message Message to parse
 * @param client Bot client object, may be used in action command requires
 * @returns Whether the message was found to be a valid command
 */
export const process_message_for_commands = async function(message: Message, client: Client, pool: Pool): Promise<boolean> {
    return false;
}