import { Client, Message } from "discord.js";
import { Pool } from "pg";
import {
    BotCommandProcessResults,
    BotCommandProcessResultType,
} from "../../../functions";
import {
    GetArgsResult,
    get_first_matching_subcommand,
    handle_GetArgsResult,
} from "../../../utilities/argument_processing/syntax_string";
import { jumprole_set, manual as jumprole_set_manual } from "./set";
import { jumprole_update, manual as jumprole_update_manual } from "./update";
import { jumprole_remove, manual as jumprole_remove_manual } from "./remove";

export const jumprole_cmd = {
    command_manual: {
        name: "jumprole",
        subcommands: [
            jumprole_set_manual,
            jumprole_update_manual,
            jumprole_remove_manual,
        ],
        description: "Manage Jumproles in the current server.",
    },
    hide_when_contradicts_permissions: false,
    process: async (
        message: Message,
        _client: Client,
        pool: Pool,
        prefix: string | undefined,
    ): Promise<BotCommandProcessResults> => {
        const subcommands = jumprole_cmd.command_manual.subcommands;
        const [set_manual, update_manual, remove_manual] = subcommands;

        const manuals = [
            ["set", set_manual],
            ["update", update_manual],
            ["remove", remove_manual],
        ] as const;

        const result = get_first_matching_subcommand(
            prefix as string,
            message.content,
            manuals,
        );

        if (result === false)
            return {
                type: BotCommandProcessResultType.Invalid,
            } as BotCommandProcessResults;

        const succeeded = await handle_GetArgsResult(
            message,
            result[1],
            prefix,
        );

        if (succeeded === false)
            return {
                type: BotCommandProcessResultType.Invalid,
            };

        switch (result[0]) {
            case "set": {
                return jumprole_set(
                    result[1] as GetArgsResult<typeof set_manual.arguments>,
                    _client,
                    pool,
                    prefix,
                );
            }
            case "update": {
                return jumprole_update(
                    result[1] as GetArgsResult<typeof update_manual.arguments>,
                    _client,
                    pool,
                    prefix,
                );
            }
            case "remove": {
                return jumprole_remove(
                    result[1] as GetArgsResult<typeof remove_manual.arguments>,
                    _client,
                    pool,
                    prefix,
                );
            }
            default: {
                return { type: BotCommandProcessResultType.Invalid };
            }
        }
    },
} as const;
