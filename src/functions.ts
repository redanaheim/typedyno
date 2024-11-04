import { Message, Client } from "discord.js";
import { Pool } from "pg";
import {
    CommandManual,
    CommandManualType,
    get_type,
    make_manual,
} from "./command_manual";
import {
    get_prefix,
    SetPrefixNonStringResult,
    set_prefix,
} from "./integrations/server_prefixes";
import { CONFIG, GLOBAL_PREFIX, MAINTAINER_TAG, MODULES } from "./main";
import { performance } from "perf_hooks";
import { log, LogType } from "./utilities/log";
import {
    allowed,
    is_valid_Permissions,
    Permissions,
} from "./utilities/permissions";
import {
    escape_reg_exp,
    is_string,
    is_text_channel,
} from "./utilities/typeutils";
import { url } from "./integrations/paste_ee";

export enum BotCommandProcessResultType {
    DidNotSucceed,
    Succeeded,
    Unauthorized,
    Invalid,
}

export interface BotCommandProcessResults {
    type: BotCommandProcessResultType;
    not_authorized_message?: string;
}

export const confirm = async function (message: Message): Promise<boolean> {
    try {
        await message.react("✅");
        return true;
    } catch (err) {
        return false;
    }
};

export type BotCommandProcess =
    | ((
          message: Message,
          client: Client,
          pool: Pool,
          prefix: string,
      ) => Promise<BotCommandProcessResults> | BotCommandProcessResults)
    | ((
          message: Message,
          client: Client,
          pool: Pool,
      ) => Promise<BotCommandProcessResults> | BotCommandProcessResults);
export interface BotCommand {
    // Optional more specific permissions. If a module is unavailable, this command will be too,
    // however these permissions can further restrict certain commands.
    permissions?: Permissions;
    // The command manual object which will be added to %commands results when the module (if it's part of a module) is available.
    command_manual: CommandManual;
    hide_when_contradicts_permissions: boolean;
    // Command should return whether the command succeeded or not
    process: BotCommandProcess;
}

export const is_valid_BotCommand = function (thing: any): thing is BotCommand {
    if (!thing) {
        return false;
    } else if (
        thing.permissions !== null &&
        thing.permissions !== undefined &&
        is_valid_Permissions(thing.permissions) === false
    ) {
        return false;
    } else if (
        get_type(thing.command_manual) !==
            CommandManualType.MultifacetedCommandManual &&
        get_type(thing.command_manual) !== CommandManualType.SimpleCommandManual
    ) {
        return false;
    } else if (
        thing.hide_when_contradicts_permissions !== false &&
        thing.hide_when_contradicts_permissions !== true
    ) {
        return false;
    } else if (thing.process instanceof Function === false) {
        return false;
    }

    return true;
};

export const is_valid_ModuleCommand = is_valid_BotCommand;

export enum MakeCommandRegexResult {
    IllegalCommandName = "IllegalCommandName",
    IllegalPrefix = "IllegalPrefix",
}

export const make_command_regex = function (
    command_name: string,
    prefix: string,
): RegExp | MakeCommandRegexResult {
    let use_global_prefix = false;

    if (is_string(command_name) === false) {
        log(
            `Unable to check message compliance with command "${String(
                command_name,
            )}": Illegal non-string argument. This command will be skipped in the message-command checking process.`,
            LogType.Mismatch,
        );
        return MakeCommandRegexResult.IllegalCommandName;
    } else if (/\s{1,}/.test(command_name)) {
        log(
            `Unable to check message compliance with command "${command_name}": Command name contains whitespace characters, which could cause conflicts with other commands. This command will be skipped in the message-command checking process.`,
            LogType.Error,
        );
        return MakeCommandRegexResult.IllegalCommandName;
    } else if (is_string(prefix) === false && prefix !== GLOBAL_PREFIX) {
        log(
            `Unable to check message compliance under prefix "${String(
                prefix,
            )}": Illegal non-string argument. This prefix setting will be ignored in favor of the global prefix, "${GLOBAL_PREFIX}".`,
            LogType.FixedError,
        );
        use_global_prefix = true;
    } else if (is_string(prefix) === false) {
        log(
            `Unable to check message compliance under prefix "${String(
                prefix,
            )}": Illegal non-string argument. This prefix is also the same as the global prefix. NO COMMANDS WILL FUNCTION UNTIL THIS ERROR IS FIXED.`,
            LogType.Error,
        );
        return MakeCommandRegexResult.IllegalPrefix;
    }

    if (use_global_prefix === false) {
        return new RegExp(
            `^${escape_reg_exp(prefix)}\\s*${escape_reg_exp(command_name)}`,
            "i",
        );
    } else {
        return new RegExp(
            `^${escape_reg_exp(GLOBAL_PREFIX)}\\s*${escape_reg_exp(
                command_name,
            )}`,
            "i",
        );
    }
};

export interface ParseMessageResult {
    did_find_command: boolean;
    command_worked?: boolean;
    command_authorized?: boolean;
    call_to_return_span_ms?: number;
    command_name?: string;
    did_use_module: boolean;
    module_name?: string;
    not_authorized_reason?: string;
}

/**
 * Checks the message against global and modular commands.
 * @param message Message to parse
 * @param client Bot client object, may be used in action command requires
 * @returns Whether the message was found to be a valid command, and
 */
export const process_message_for_commands = async function (
    message: Message,
    client: Client,
    pool: Pool,
): Promise<ParseMessageResult> {
    const prefix = await get_prefix(message.guild, pool);

    let valid_command: BotCommand | null = null;

    // ALWAYS check stock bot commands first. NEVER let a module command override a stock command, although we would
    // hope that would've been caught earlier.
    for (const bot_command of STOCK_BOT_COMMANDS) {
        const regex = make_command_regex(
            bot_command.command_manual.name,
            prefix,
        );

        /*
        if (regex instanceof RegExp) {
            log(`Made regex ${regex.source} to test for command "${bot_command.command_manual.name}"...`, LogType.Status)
            log(`Checking message ${message.content}...`, LogType.Status)
        }
        */

        if (
            regex instanceof RegExp &&
            regex.test(message.content) &&
            valid_command === null
        ) {
            // log(`Regex match found!`, LogType.Status)
            if (allowed(message, bot_command.permissions)) {
                // log(`Match is valid, permissions are a go.`, LogType.Success)
                valid_command = bot_command;
            } else if (
                bot_command.hide_when_contradicts_permissions === false
            ) {
                // log(`Match is not valid, permissions are restrictive.`)
                return {
                    did_find_command: true,
                    command_authorized: false,
                    command_name: bot_command.command_manual.name,
                    did_use_module: false,
                };
            }
        }
    }

    let using_module: string | null = null;

    // Check loaded module commands
    for (const module of MODULES) {
        if (allowed(message, module.permissions)) {
            // Skip checking command call if the module is already restricted here
            // Check module commands
            for (const bot_command of module.functions) {
                const regex = make_command_regex(
                    bot_command.command_manual.name,
                    prefix,
                );
                if (
                    regex instanceof RegExp &&
                    regex.test(message.content) &&
                    valid_command === null &&
                    using_module === null
                ) {
                    if (allowed(message, bot_command.permissions)) {
                        valid_command = bot_command;
                        using_module = module.name;
                    } else if (
                        bot_command.hide_when_contradicts_permissions === false
                    ) {
                        return {
                            did_find_command: true,
                            command_authorized: false,
                            command_name: bot_command.command_manual.name,
                            did_use_module: true,
                            module_name: module.name,
                        };
                    }
                }
            }
        }
    }

    // Check permissions validity of valid_command
    if (
        is_valid_BotCommand(valid_command) &&
        allowed(message, valid_command.permissions)
    ) {
        // Run the command
        const start_time = performance.now();
        const result = await valid_command.process(
            message,
            client,
            pool,
            prefix,
        );
        const end_time = performance.now();

        return {
            did_find_command: true,
            command_worked:
                result.type === BotCommandProcessResultType.Succeeded,
            command_authorized:
                result.type !== BotCommandProcessResultType.Unauthorized,
            call_to_return_span_ms: end_time - start_time,
            command_name: valid_command.command_manual.name,
            did_use_module: using_module !== null,
            // { ts-malfunction }
            // @ts-expect-error
            module_name: using_module,
            not_authorized_reason: result.not_authorized_message,
        };
    } else {
        // Didn't find a command
        return {
            did_find_command: false,
            did_use_module: false,
        };
    }
};

export const STOCK_BOT_COMMANDS: BotCommand[] = [
    {
        command_manual: {
            name: "commands",
            arguments: [],
            description:
                "Links to a paste where you can view all the available bot commands.",
            syntax: "<prefix>commands",
        },
        hide_when_contradicts_permissions: false,
        process: async (
            message: Message,
            _client: Client,
            _pool: Pool,
            prefix: string,
        ): Promise<BotCommandProcessResults> => {
            const paste = await make_manual(message, prefix);

            if (is_string(paste.error)) {
                message.channel.send(
                    `paste.ee API failed to create paste: contact ${MAINTAINER_TAG} for help fixing this error.`,
                );
                return { type: BotCommandProcessResultType.DidNotSucceed };
            } else if (is_string(paste.paste?.id)) {
                message.channel.send(
                    `You can find the command manual here: ${url(
                        // how could paste be undefined?! paste.paste.id was a string...
                        // { ts-malfunction }
                        // @ts-expect-error
                        paste.paste,
                    )}. Note that certain commands may be hidden if you lack permission to use them.`,
                );
                return { type: BotCommandProcessResultType.Succeeded };
            }

            const err = `'commands' process: internal error - make_manual neither returned an error nor a paste. Returning BotCommandProcessResultType.DidNotSucceed`;

            message.channel.send(err);
            log(err, LogType.Error);
            return {
                type: BotCommandProcessResultType.DidNotSucceed,
            };
        },
    },
    {
        command_manual: {
            name: "prefix",
            subcommands: [
                {
                    name: "set",
                    arguments: [
                        {
                            name: "string or symbol",
                            optional: false,
                        },
                        {
                            name: "server ID",
                            optional: true,
                        },
                    ],
                    description:
                        "Sets the provided string as the local prefix, overriding the global prefix.\nYou must be a bot admin or designated server manager to use this command.",
                    syntax: "<prefix>prefix set $1",
                },
                {
                    name: "get",
                    arguments: [],
                    description:
                        "Tells you the only valid prefix that you can use on this server to activate the bot's commands.",
                    syntax: "<prefix>prefix get",
                },
            ],
            description: "Manage or get the prefix for your current server.",
        },
        hide_when_contradicts_permissions: false,
        process: async (
            message: Message,
            _client: Client,
            pool: Pool,
            prefix: string,
        ): Promise<BotCommandProcessResults> => {
            const process_cmd_regex = new RegExp(
                `^${escape_reg_exp(
                    prefix,
                )}\\s*prefix (?<sub>\\w+)(?:\\s{1,}(?<post>.+?)\\s*)?$`,
                "i",
            );

            const match = message.content.match(process_cmd_regex);

            if (match === null || !match.groups) {
                return { type: BotCommandProcessResultType.Invalid };
            } else {
                switch (match.groups["sub"]) {
                    case "get": {
                        const prefix_result = await get_prefix(
                            message.guild,
                            pool,
                        );
                        if (prefix_result.trim() === GLOBAL_PREFIX.trim()) {
                            message.channel.send(
                                `The global prefix is "${prefix_result}" and it hasn't been changed locally, but you already knew that.`,
                            );
                            return {
                                type: BotCommandProcessResultType.Succeeded,
                            };
                        } else {
                            message.channel.send(
                                `The local prefix is "${prefix_result}", but you already knew that.`,
                            );
                            return {
                                type: BotCommandProcessResultType.Succeeded,
                            };
                        }
                        break;
                    }
                    case "set": {
                        if (is_string(match.groups["post"])) {
                            if (is_text_channel(message) === false) {
                                message.channel.send(
                                    "Setting a local prefix in a non-text or DM channel is not allowed.",
                                );
                                return {
                                    type: BotCommandProcessResultType.DidNotSucceed,
                                };
                            } else if (
                                CONFIG.admins.includes(message.author.id)
                            ) {
                                const result = await set_prefix(
                                    // if message is not in a valid text channel, the if above this will trigger and this clause will not run
                                    // is_text_channel explicitly checks whether message.guild instanceof Guild === true
                                    // { ts-malfunction }
                                    // @ts-expect-error
                                    message.guild,
                                    pool,
                                    match.groups["post"],
                                );

                                if (result.did_succeed) {
                                    const confirmed = await confirm(message);
                                    if (confirmed === true) {
                                        return {
                                            type: BotCommandProcessResultType.Succeeded,
                                        };
                                    } else {
                                        return {
                                            type: BotCommandProcessResultType.DidNotSucceed,
                                        };
                                    }
                                } else {
                                    if (
                                        result.result ===
                                        SetPrefixNonStringResult.LocalPrefixArgumentSameAsGlobalPrefix
                                    ) {
                                        message.channel.send(
                                            "Setting a local prefix the same as the global prefix is not allowed for flexibility reasons. However, since the prefix you wanted to set was already the prefix, you can use it just like you would if this command had worked.",
                                        );
                                        return {
                                            type: BotCommandProcessResultType.Succeeded,
                                        };
                                    } else {
                                        message.channel.send(
                                            `set_prefix failed: contact ${MAINTAINER_TAG} for help fixing this error.`,
                                        );
                                        log(
                                            `set_prefix unexpectedly threw an error:`,
                                            LogType.Error,
                                        );
                                        log(
                                            result.result as string,
                                            LogType.Error,
                                        );
                                        return {
                                            type: BotCommandProcessResultType.DidNotSucceed,
                                        };
                                    }
                                }
                            } else {
                                return {
                                    type: BotCommandProcessResultType.Unauthorized,
                                    not_authorized_message:
                                        "You must be a bot admin or otherwise authorized person to set a server prefix.",
                                };
                            }
                        } else {
                            return {
                                type: BotCommandProcessResultType.Invalid,
                            };
                        }
                    }
                    default: {
                        return { type: BotCommandProcessResultType.Invalid };
                    }
                }
            }
        },
    },
    {
        command_manual: {
            name: "info",
            arguments: [],
            syntax: "<prefix>info",
            description:
                "Provides a description of useful commands and the design of the bot.",
        },
        hide_when_contradicts_permissions: false,
        process: async (
            message: Message,
            _client: Client,
            _pool: Pool,
            prefix: string,
        ): Promise<BotCommandProcessResults> => {
            let base_info = `**Useful commands**:\n${prefix}commands: Lists the commands this bot has.\n**GitHub**: https://github.com/TigerGold59/typedyno`;
            if (prefix === GLOBAL_PREFIX) {
                base_info += `\nThe prefix on this server is the same as the global prefix, ${GLOBAL_PREFIX}.`;
            } else {
                base_info += `\nThe global prefix, which applies to servers that haven't set a local prefix, is ${GLOBAL_PREFIX}.`;
            }

            message.channel.send(base_info);
            return {
                type: BotCommandProcessResultType.Succeeded,
            };
        },
    },
];
