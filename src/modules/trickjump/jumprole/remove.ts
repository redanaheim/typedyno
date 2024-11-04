import { Client, Guild, Message } from "discord.js";
import { Pool } from "pg";
import {
    BotCommandProcessResults,
    BotCommandProcessResultType,
    GiveCheck,
} from "../../../functions";
import { MAINTAINER_TAG } from "../../../main";
import { GetArgsResult } from "../../../utilities/argument_processing/arguments_types";
import {
    argument_specification_from_manual,
    check_specification,
} from "../../../utilities/runtime_typeguard";
import { is_text_channel } from "../../../utilities/typeutils";
import {
    DeleteJumproleResult,
    delete_jumprole,
} from "./internals/jumprole_postgres";

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

const ARGUMENT_SPECIFICATION = argument_specification_from_manual(
    manual.arguments,
);

export const jumprole_remove = async function (
    args: GetArgsResult<typeof manual.arguments>,
    message: Message,
    _client: Client,
    pool: Pool,
    prefix: string | undefined,
): Promise<BotCommandProcessResults> {
    const reply = message.channel.send;
    const failed = { type: BotCommandProcessResultType.DidNotSucceed };

    const values = check_specification(
        args.values,
        "jumprole_remove",
        ARGUMENT_SPECIFICATION,
    );

    if (values === null || values === false)
        return { type: BotCommandProcessResultType.Invalid };

    if (is_text_channel(message) === false) {
        return { type: BotCommandProcessResultType.Unauthorized };
    }

    const name = values.name;

    const result = await delete_jumprole(
        [name, (message.guild as Guild).id],
        pool,
    );

    switch (result) {
        case DeleteJumproleResult.Success: {
            GiveCheck(message);
            return { type: BotCommandProcessResultType.Succeeded };
        }
        case DeleteJumproleResult.InvalidJumproleHandle: {
            await reply(
                `${prefix}jumprole remove: an unknown internal error caused the JumproleHandle passed to delete_jumprole to be invalid. Contact @${MAINTAINER_TAG} for help.`,
            );
            return failed;
        }
        case DeleteJumproleResult.NoneMatchJumproleHandle: {
            await reply(
                `${prefix}jumprole remove: no Jumprole exists with that name.`,
            );
            return failed;
        }
        case DeleteJumproleResult.QueryFailed: {
            await reply(
                `${prefix}jumprole remove: an unknown internal error caused the database query to fail. Contact @${MAINTAINER_TAG} for help.`,
            );
            return failed;
        }
    }
};
