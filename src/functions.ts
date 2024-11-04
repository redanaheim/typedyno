import { Message, Client } from "discord.js";
import { Pool } from "pg";
import { CommandManual, CommandManualType, get_type } from "./command_manual";
import { GLOBAL_PREFIX } from "./main";
import { log, LogType } from "./utilities/log";
import { is_valid_Permissions, Permissions } from "./utilities/permissions";
import { escape_reg_exp, is_string } from "./utilities/typeutils";

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

export enum MakeCommandRegexResult {
    IllegalCommandName = "IllegalCommandName",
    IllegalPrefix = "IllegalPrefix"
}

export const make_command_regex = function(command_name: string, prefix: string): RegExp | MakeCommandRegexResult {
    let use_global_prefix = false

    if (is_string(command_name) === false) {
        log(`Unable to check message compliance with command "${String(command_name)}": Illegal non-string argument. This command will be skipped in the message-command checking process.`, LogType.Mismatch)
        return MakeCommandRegexResult.IllegalCommandName
    }
    else if (/\s{1,}/.test(command_name)) {
        log(`Unable to check message compliance with command "${command_name}": Command name contains whitespace characters, which could cause conflicts with other commands. This command will be skipped in the message-command checking process.`, LogType.Error)
        return MakeCommandRegexResult.IllegalCommandName
    }
    else if (is_string(prefix) === false && prefix !== GLOBAL_PREFIX) {
        log(`Unable to check message compliance under prefix "${String(prefix)}": Illegal non-string argument. This prefix setting will be ignored in favor of the global prefix, "${GLOBAL_PREFIX}".`, LogType.FixedError)
        use_global_prefix = true
    }
    else if (is_string(prefix) === false) {
        log(`Unable to check message compliance under prefix "${String(prefix)}": Illegal non-string argument. This prefix is also the same as the global prefix. NO COMMANDS WILL FUNCTION UNTIL THIS ERROR IS FIXED.`, LogType.Error)
        return MakeCommandRegexResult.IllegalPrefix
    }

    if (use_global_prefix === false) {
        return new RegExp(`^${escape_reg_exp(prefix)}\s*${escape_reg_exp(command_name)} `, "i")
    }
    else {
        return new RegExp(`^${escape_reg_exp(GLOBAL_PREFIX)}\s*${escape_reg_exp(command_name)} `, "i")
    }
}

/**
 * Checks the message against global and modular commands.
 * @param message Message to parse
 * @param client Bot client object, may be used in action command requires
 * @returns Whether the message was found to be a valid command
 */
export const process_message_for_commands = async function(message: Message, client: Client, pool: Pool): Promise<boolean> {
    
}