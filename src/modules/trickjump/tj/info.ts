import { Client, MessageEmbed } from "discord.js";
import { UsingClient } from "../../../pg_wrapper.js";

import { BotCommandProcessResults, BotCommandProcessResultType, Replier, Subcommand } from "../../../functions.js";
import { MAINTAINER_TAG } from "../../../main.js";

import { GetJumproleResultType, Jumprole, KINGDOM_NAMES } from "../jumprole/internals/jumprole_type.js";
//import { DeleteJumproleResult, delete_jumprole } from "./internals/jumprole_postgres.js";
import { ValidatedArguments } from "../../../utilities/argument_processing/arguments_types.js";
import { is_number, is_string, TextChannelMessage } from "../../../utilities/typeutils.js";
import { log, LogType } from "../../../utilities/log.js";

export class TJInfo extends Subcommand<typeof TJInfo.manual> {
    constructor() {
        super();
    }

    static readonly manual = {
        name: "info",
        arguments: [
            {
                name: "name",
                id: "name",
                optional: false,
            },
        ],
        description: "Retrieves comprehensive info in the given trickjump.",
        syntax: "::<prefix>tj info:: $1",
        compact_syntaxes: true,
    } as const;

    readonly manual = TJInfo.manual;
    readonly no_use_no_see = false;
    readonly permissions = undefined;

    async activate(
        values: ValidatedArguments<typeof TJInfo.manual>,
        message: TextChannelMessage,
        discord_client: Client,
        pg_client: UsingClient,
        prefix: string,
        reply: Replier,
    ): Promise<BotCommandProcessResults> {
        const failed = { type: BotCommandProcessResultType.DidNotSucceed };
        const name = values.name;

        const instance = await Jumprole.Get(name, message.guild.id, pg_client);

        switch (instance.type) {
            case GetJumproleResultType.InvalidName: {
                await reply(`invalid jump name. Contact @${MAINTAINER_TAG} for help as this should have been caught earlier.`);
                return { type: BotCommandProcessResultType.Invalid };
            }
            case GetJumproleResultType.InvalidServerSnowflake: {
                log(
                    `tj info: Jumprole.Get with arguments [${name}, ${message.guild.id}] failed with error GetJumproleResultType.InvalidServerSnowflake.`,
                    LogType.Error,
                );
                await reply(
                    `an unknown error caused Jumprole.Get to return GetJumproleResultType.InvalidServerSnowflake. Contact @${MAINTAINER_TAG} for help.`,
                );
                return failed;
            }
            case GetJumproleResultType.GetTierWithIDFailed: {
                await reply(
                    "an unknown error caused Jumprole.Get to fail with error GetJumproleResultType.GetTierWithIDFailed. It is possible that its tier was deleted.",
                );
                log(
                    `tj info: Jumprole.Get with arguments [${name}, ${message.guild.id}] unexpectedly failed with error GetJumproleResultType.GetTierWithIDFailed.`,
                    LogType.Error,
                );
                return failed;
            }
            case GetJumproleResultType.NoneMatched: {
                await reply(`a jump with that name doesn't exist in this server. You can list all roles with \`${prefix}tj all\`.`);
                return failed;
            }
            case GetJumproleResultType.QueryFailed: {
                await reply(`an unknown error occurred (query failure). Contact @${MAINTAINER_TAG} for help.`);
                return failed;
            }
            case GetJumproleResultType.Unknown: {
                log(
                    `tj info: Jumprole.Get with arguments [${name}, ${message.guild.id}] unexpectedly failed with error GetJumproleResultType.Unknown.`,
                );
                await reply(`an unknown error occurred after Jumprole.Get. Contact @${MAINTAINER_TAG} for help.`);
                return failed;
            }
            case GetJumproleResultType.Success: {
                let embed = new MessageEmbed();
                let jump = instance.jumprole;
                embed.setColor("#5441e0");
                embed.setTitle(jump.name);
                embed.addField("Tier", jump.tier.name, true);
                if (is_number(jump.kingdom)) {
                    embed.addField("Kingdom", KINGDOM_NAMES[jump.kingdom], true);
                }
                let user = await discord_client.users.fetch(jump.added_by);
                if (is_string(user.tag)) {
                    embed.setAuthor(
                        user.tag,
                        user.avatar === null ? user.defaultAvatarURL : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg`,
                    );
                }
                embed.setTimestamp(new Date(jump.updated_at * 1000));
                if (is_string(jump.jump_type)) {
                    embed.addField("Type", jump.jump_type, true);
                }
                if (is_string(jump.location)) {
                    embed.addField("Location", jump.location, true);
                }
                embed.setDescription("");
                if (is_string(jump.link)) {
                    embed.setDescription(`Link: ${jump.link}\n\n`);
                }
                embed.setDescription(`${embed.description}Description: \n${jump.description}\n\n`);
                message.channel.send(embed);

                return { type: BotCommandProcessResultType.Succeeded };
            }
        }
    }
}
