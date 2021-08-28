import { Client, Guild, Message, Snowflake } from "discord.js";
import * as PG from "pg";

import { ArgumentValues, BotCommandProcessResults, BotCommandProcessResultType, GiveCheck, Subcommand } from "../../../functions.js";
import { MAINTAINER_TAG } from "../../../main.js";
import { validate } from "../../../module_decorators.js";
import { log, LogType } from "../../../utilities/log.js";
import { Permissions } from "../../../utilities/permissions.js";
import { is_text_channel } from "../../../utilities/typeutils.js";
import { ModifyJumproleResultType, modify_jumprole } from "./internals/jumprole_postgres.js";
import { Jumprole, KingdomNameToKingdom } from "./internals/jumprole_type.js";

export class JumproleUpdate extends Subcommand<typeof JumproleUpdate.manual> {
    constructor() {
        super(JumproleUpdate.manual, JumproleUpdate.no_use_no_see, JumproleUpdate.permissions);
    }

    static readonly manual = {
        name: "update",
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
                optional: true,
            },
        ],
        description: "Updates the specified properties of the jumprole.",
        syntax: "<prefix>jumprole update NAME $1{opt $2}[ KINGDOM $2]{opt $3}[ LOCATION $3]{opt $4}[ JUMP TYPE $4]{opt $5}[ LINK $5]{opt $6}[ INFO $6]",
    } as const;

    static readonly no_use_no_see = false;
    static readonly permissions = undefined as Permissions | undefined;

    @validate()
    async activate(
        values: ArgumentValues<typeof JumproleUpdate.manual>,
        message: Message,
        _client: Client,
        pool: PG.Pool,
        prefix: string | undefined,
    ): Promise<BotCommandProcessResults> {
        const reply = message.channel.send;
        const failed = { type: BotCommandProcessResultType.DidNotSucceed };

        if (is_text_channel(message) === false) {
            return { type: BotCommandProcessResultType.Unauthorized };
        }

        const jumprole_object: Partial<Jumprole> = {
            kingdom: values.kingdom === null ? null : KingdomNameToKingdom(values.kingdom),
            location: values.location,
            jump_type: values.jump_type,
            link: values.link,
            description: values.description === null ? undefined : values.description,
            added_by: message.author.id,
            updated_at: new Date(),
            server: message.guild?.id as Snowflake,
        };

        const { result_type } = await modify_jumprole([values.name, (message.guild as Guild).id], jumprole_object, pool);

        switch (result_type) {
            case ModifyJumproleResultType.Success: {
                await GiveCheck(message);
                return { type: BotCommandProcessResultType.Succeeded };
            }
            case ModifyJumproleResultType.InvalidQuery: {
                await reply(
                    `${prefix}jumprole update: an unknown internal error caused the database query to fail. Contact @${MAINTAINER_TAG} for help.`,
                );
                return failed;
            }
            case ModifyJumproleResultType.InvalidPropertyChange: {
                await reply(
                    `${prefix}jumprole update: an unknown internal error caused the passed Partial<Jumprole> object to be invalid. Contact @${MAINTAINER_TAG} for help.`,
                );
                return failed;
            }
            case ModifyJumproleResultType.InvalidJumproleHandle: {
                await reply(
                    `${prefix}jumprole update: an unknown internal error caused the JumproleHandle passed to modify_jumprole to be invalid. Contact @${MAINTAINER_TAG} for help.`,
                );
                return failed;
            }
            case ModifyJumproleResultType.NoneMatchJumproleHandle: {
                await reply(`${prefix}jumprole update: no Jumprole exists with that name.`);
                return failed;
            }
            case ModifyJumproleResultType.NameTooLong: {
                await reply(
                    `${prefix}jumprole update: The given name was too long (length: ${values.name.length.toString()} chars, limit: 100 chars).`,
                );
                return failed;
            }
            case ModifyJumproleResultType.LinkTooLong: {
                await reply(
                    `${prefix}jumprole update: The given link was too long (length: ${(
                        values.link as string
                    ).length.toString()} chars, limit: 150 chars).`,
                );
                return failed;
            }
            case ModifyJumproleResultType.LocationTooLong: {
                await reply(
                    `${prefix}jumprole update: The given location was too long (length: ${(
                        values.location as string
                    ).length.toString()} chars, limit: 200 chars).`,
                );
                return failed;
            }
            case ModifyJumproleResultType.JumpTypeTooLong: {
                await reply(
                    `${prefix}jumprole update: The given jump type was too long (length: ${(
                        values.jump_type as string
                    ).length.toString()} chars, limit: 200 chars).`,
                );
                return failed;
            }
            case ModifyJumproleResultType.DescriptionTooLong: {
                await reply(
                    `${prefix}jumprole update: The given description was too long (length: ${(
                        values.description as string
                    ).length.toString()} chars, limit: 1500 chars).`,
                );
                return failed;
            }
            default: {
                log(
                    `jumprole_set: received invalid option in switch (ModifyJumproleResultType) that brought us to the default case. Informing the user of the error...`,
                    LogType.Error,
                );
                await reply(`${prefix}jumprole update: unknown internal error. Contact @${MAINTAINER_TAG} for help.`);
                return failed;
            }
        }
    }
}
