import { randomBytes } from "crypto";
import { BotCommand, is_valid_BotCommand, STOCK_BOT_COMMANDS } from "./functions";
import { CONFIG, STOCK_TABLES } from "./main";
import { log, LogType } from "./utilities/log";
import { is_valid_Permissions, Permissions } from "./utilities/permissions";
import { is_string } from "./utilities/typeutils";

type ModuleCommand = BotCommand

/**
 * An object that a valid module must pass to its module.exports in order to be loaded, as long as its name is in "use"
 * in config.
 * A module provides extra commands to functions.ts for parsing, so long as the user is permitted
 */
export interface Module {
    // Module name
    name: string,
    // Heroku PostgreSQL tables this module is allowed to create
    tables: string[],
    // Whether the module treats servers like universes, i.e. data
    // stored due to a command on one server will be inaccessible on another.
    // The other option is that data bridges servers.
    servers_are_universes: boolean,
    // The permissions indicate whether a user is allowed to use a command from the module in a specific channel.
    permissions: Permissions,
    // Indicates whether to hide this module from the command manual when its permissions aren't met
    hide_when_contradicts_permissions: boolean,
    // The command manual objects which will be added to %commands results on available servers.
    // They describe how to use a command.
    functions: ModuleCommand[]
}

/**
 * Gets a module's `Module` object using its name
 * @param name The folder name inside `/src/modules/` to require `index.js` from
 * @returns `Module` object if the require returned a valid module object, or false if it didn't
 */
export const load_module = function(name: string): Module | false {

    const module_export: Partial<Module> = require(`../src/modules/${name}/index.js`) // running from /out/

    if (!module_export) {
        return false
    }
    else if (is_string(module_export.name) === false) {
        return false
    }
    else if (Array.isArray(module_export.tables) === false) {
        return false
    }
    else if (module_export.servers_are_universes !== false && module_export.servers_are_universes !== true) {
        return false
    }
    else if (is_valid_Permissions(module_export) === false) {
        return false
    }
    else if (module_export.hide_when_contradicts_permissions !== false && module_export.hide_when_contradicts_permissions !== true) {
        return false
    }
    else if (Array.isArray(module_export.functions) === false) {
        return false
    }

    // @ts-expect-error
    for (const thing of module_export.tables) {
        if (is_string(thing) === false) {
            return false
        }
    }

    // @ts-expect-error
    for (const thing of module_export.functions) {
        if (is_valid_BotCommand(thing) === false) {
            return false
        }
    }

    // Ensure we don't have a type conflict
    return module_export as Module
}

export const has_overlap = function<T>(array_one: T[], array_two: T[]): T | false {
    for (const element of array_one) {
        if (array_two.includes(element)) {
            return element
        }
    }
    return false
}

/**
 * Requires and loads the module objects from `config.json`, checking for conflicts. If one is found, the following
 * rules are followed: 
 * 1. If the module conflicts with the base code of the bot, it will be left out of the array.
 * 2. Of modules that conflict with each other, modules toward the end of the `"use"` array in `CONFIG` will be thrown out.
 * @returns An array of `Module` objects with no table conflicts or command conflicts
 */
export const load_modules = function(): Module[] {
    const use = CONFIG.use;

    let modules = [];

    for (const element of use) {
        if (is_string(element) === false) {
            continue;
        }

        const module_obj = load_module(element);

        if (module_obj === false) {
            continue;
        }

        modules.push(module_obj);
    }

    const stock_symbol = randomBytes(16).toString("base64")

    let table_name_dictionary: {[key: string]: string} = (function (): {[key: string]: string} {
        let dictionary: {[key: string]: string} = {}
        for (const table_name of STOCK_TABLES) {
            dictionary[table_name] = stock_symbol
        }
        return dictionary;
    })()
    let function_name_dictionary: {[key: string]: string} = (function (): {[key: string]: string} {
        let dictionary: {[key: string]: string} = {}
        for (const bot_command of STOCK_BOT_COMMANDS) {
            dictionary[bot_command.command_manual.name] = stock_symbol
        }
        return dictionary;
    })()

    let valid_modules: Module[] = []

    for (const module of modules) {
        const table_overlap = has_overlap(module.tables, Object.keys(table_name_dictionary))
        if (table_overlap !== false) {
            let overlap_keep = table_name_dictionary[table_overlap]
            log(`Conflict detected while loading modules: Module ${module.name} attempted to claim PostgreSQL table name ${table_overlap} which was already in use by ${overlap_keep === stock_symbol ? "the system" : `"${overlap_keep}"`}. Module ${module.name} will not be loaded.`, LogType.Incompatibility)
            continue;
        }
        else {
            for (const table_name in module.tables) {
                table_name_dictionary[table_name] = module.name
            }
        }
        const module_function_names = module.functions.map(command => command.command_manual.name)
        const function_overlap = has_overlap(module_function_names, Object.keys(function_name_dictionary))
        if (function_overlap !== false) {
            let overlap_keep = function_name_dictionary[function_overlap]
            log(`Conflict detected while loading modules: Module ${module.name} attempted to register command name ${function_overlap} which was already in use by ${overlap_keep === stock_symbol ? "the system" : `"${overlap_keep}"`}. Module ${module.name} will not be loaded.`, LogType.Incompatibility)
            continue;
        }
        else {
            for (const function_name in module_function_names) {
                function_name_dictionary[function_name] = module.name
            }
        }

        valid_modules.push(module)
    }

    return valid_modules;

}