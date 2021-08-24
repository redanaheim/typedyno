import { Client } from "discord.js";
import { Pool } from "pg";
import {
    BotCommandProcessResults,
    BotCommandProcessResultType,
} from "../../../functions";
import { GetArgsResult } from "../../../utilities/argument_processing/syntax_string";

export const manual = {
    name: "set",
    arguments: [
        {
            name: "name",
            id: "name",
            optional: false,
        },
        {
            name: "kingdom",
            id: "kingdom",
            optional: true,
        },
        {
            name: "location",
            id: "location",
            optional: true,
        },
        {
            name: "jump type",
            id: "jump_type",
            optional: true,
        },
        {
            name: "link",
            id: "link",
            optional: true,
        },
        {
            name: "description",
            id: "description",
            optional: false,
        },
    ],
    description: "Creates or updates a Jumprole with the specified properties.",
    syntax: "<prefix>jumprole set NAME $1{opt $2}[ KINGDOM $2]{opt $3}[ LOCATION $3]{opt $4}[ JUMP TYPE $4]{opt $5}[ LINK $5] INFO $6",
} as const;

export const jumprole_set = async function (
    _args: GetArgsResult<typeof manual.arguments>,
    _client: Client,
    _pool: Pool,
    _prefix: string | undefined,
): Promise<BotCommandProcessResults> {
    return { type: BotCommandProcessResultType.Succeeded };
};
