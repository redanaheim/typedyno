import { Client, Message } from "discord.js";
import { Pool } from "pg";
import {
    BotCommand,
    BotCommandProcessResults,
    BotCommandProcessResultType,
} from "../../../functions";

export const jumprole_cmd: BotCommand = {
    command_manual: {
        name: "jumprole",
        subcommands: [
            {
                name: "set",
                arguments: [
                    {
                        name: "name",
                        optional: false,
                    },
                    {
                        name: "kingdom",
                        optional: true,
                    },
                    {
                        name: "location",
                        optional: true,
                    },
                    {
                        name: "jump_type",
                        optional: true,
                    },
                    {
                        name: "link",
                        optional: true,
                    },
                    {
                        name: "description",
                        optional: false,
                    },
                ],
                description:
                    "Creates or updates a Jumprole with the specified properties.",
                syntax: "<prefix>jumprole set NAME $1{opt $2}[ KINGDOM $2]{opt $3}[ LOCATION $3]{opt $4}[ JUMP TYPE $4]{opt $5}[ LINK $5] INFO $6",
            },
            {
                name: "update",
                arguments: [
                    {
                        name: "name",
                        optional: false,
                    },
                    {
                        name: "kingdom",
                        optional: true,
                    },
                    {
                        name: "location",
                        optional: true,
                    },
                    {
                        name: "jump_type",
                        optional: true,
                    },
                    {
                        name: "link",
                        optional: true,
                    },
                    {
                        name: "description",
                        optional: true,
                    },
                ],
                description:
                    "Updates the specified properties of the jumprole.",
                syntax: "<prefix>jumprole update NAME $1{opt $2}[ KINGDOM $2]{opt $3}[ LOCATION $3]{opt $4}[ JUMP TYPE $4]{opt $5}[ LINK $5]${opt $6}[ INFO $6]",
            },
            {
                name: "remove",
                arguments: [
                    {
                        name: "name",
                        optional: false,
                    },
                ],
                description:
                    "Removes the given Jumprole and clears it from all users' Jumprole lists.",
                syntax: "<prefix>jumprole remove $1",
            },
        ],
        description: "Manage Jumproles in the current server.",
    },
    hide_when_contradicts_permissions: false,
    process: async (
        message: Message,
        client: Client,
        pool: Pool,
        prefix: string | undefined,
    ): Promise<BotCommandProcessResults> => {
        message.channel.send("This command is not implemented yet.");
        client;
        pool;
        prefix;
        return {
            type: BotCommandProcessResultType.Succeeded,
        };
    },
};
