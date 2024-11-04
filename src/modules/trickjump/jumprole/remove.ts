import { Client } from "discord.js";
import { Pool } from "pg";
import {
    BotCommandProcessResults,
    BotCommandProcessResultType,
} from "../../../functions";
import { GetArgsResult } from "../../../utilities/argument_processing/syntax_string";

export const manual = {
    name: "remove",
    arguments: [
        {
            name: "name",
            id: "name",
            optional: false,
        },
    ],
    description:
        "Removes the given Jumprole and clears it from all users' Jumprole lists.",
    syntax: "<prefix>jumprole remove $1",
} as const;

export const jumprole_remove = async function (
    _args: GetArgsResult<typeof manual.arguments>,
    _client: Client,
    _pool: Pool,
    _prefix: string | undefined,
): Promise<BotCommandProcessResults> {
    return { type: BotCommandProcessResultType.Succeeded };
};
