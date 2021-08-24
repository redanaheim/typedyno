import { Client, Message, Snowflake } from "discord.js";
import { Pool } from "pg";
import {
    BotCommandProcessResults,
    BotCommandProcessResultType,
    GiveCheck,
} from "../../../functions";
import { MAINTAINER_TAG } from "../../../main";
import { GetArgsResult } from "../../../utilities/argument_processing/arguments_types";
import { log, LogType } from "../../../utilities/log";
import {
    argument_specification_from_manual,
    check_specification,
} from "../../../utilities/runtime_typeguard";
import { is_text_channel } from "../../../utilities/typeutils";
import {
    CreateJumproleResult,
    create_jumprole,
} from "./internals/jumprole_postgres";
import { Jumprole, KingdomNameToKingdom } from "./internals/jumprole_type";

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

const ARGUMENT_SPECIFICATION = argument_specification_from_manual(
    manual.arguments,
);

export const jumprole_set = async function (
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
        "jumprole_set",
        ARGUMENT_SPECIFICATION,
    );

    if (values === false || values === null)
        return { type: BotCommandProcessResultType.Invalid };

    if (is_text_channel(message) === false) {
        return { type: BotCommandProcessResultType.Unauthorized };
    }

    const jumprole_object: Jumprole = {
        id: -1, // not used in create
        name: values.name,
        kingdom:
            values.kingdom === null
                ? null
                : KingdomNameToKingdom(values.kingdom),
        location: values.location,
        jump_type: values.jump_type,
        link: values.link,
        description: values.description,
        added_by: message.author.id,
        updated_at: new Date(),
        server: message.guild?.id as Snowflake,
        hash: "recomputed later",
    };

    const query_result = await create_jumprole(jumprole_object, pool);

    switch (query_result) {
        case CreateJumproleResult.Success: {
            await GiveCheck(message);
            return { type: BotCommandProcessResultType.Succeeded };
        }
        case CreateJumproleResult.QueryFailed: {
            await reply(
                `${prefix}jumprole set: an unknown internal error caused the database query to fail. Contact @${MAINTAINER_TAG} for help.`,
            );
            return failed;
        }
        case CreateJumproleResult.InvalidJumproleObject: {
            await reply(
                `${prefix}jumprole set: an unknown internal error caused the passed Jumprole object to be invalid. Contact @${MAINTAINER_TAG} for help.`,
            );
            return failed;
        }
        case CreateJumproleResult.JumproleAlreadyExists: {
            await reply(
                `${prefix}jumprole set: A Jumprole with that name already exists. Please use '${prefix}jumprole update' in order to change already existing Jumproles.`,
            );
            return failed;
        }
        case CreateJumproleResult.NameTooLong: {
            await reply(
                `${prefix}jumprole set: The given name was too long (length: ${values.name.length.toString()} chars, limit: 100 chars).`,
            );
            return failed;
        }
        case CreateJumproleResult.LinkTooLong: {
            await reply(
                `${prefix}jumprole set: The given link was too long (length: ${(
                    values.link as string
                ).length.toString()} chars, limit: 150 chars).`,
            );
            return failed;
        }
        case CreateJumproleResult.LocationTooLong: {
            await reply(
                `${prefix}jumprole set: The given location was too long (length: ${(
                    values.location as string
                ).length.toString()} chars, limit: 200 chars).`,
            );
            return failed;
        }
        case CreateJumproleResult.JumpTypeTooLong: {
            await reply(
                `${prefix}jumprole set: The given jump type was too long (length: ${(
                    values.jump_type as string
                ).length.toString()} chars, limit: 200 chars).`,
            );
            return failed;
        }
        case CreateJumproleResult.DescriptionTooLong: {
            await reply(
                `${prefix}jumprole set: The given description was too long (length: ${(
                    values.description as string
                ).length.toString()} chars, limit: 1500 chars).`,
            );
            return failed;
        }
        default: {
            log(
                `jumprole_set: received invalid option in switch (CreateJumproleResult) that brought us to the default case. Informing the user of the error...`,
                LogType.Error,
            );
            await reply(
                `${prefix}jumprole set: unknown internal error. Contact @${MAINTAINER_TAG} for help.`,
            );
            return failed;
        }
    }
};
