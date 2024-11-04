import { Client } from "discord.js";
import { Queryable, UsesClient, use_client } from "../../../pg_wrapper.js";

import { BotCommandProcessResults, BotCommandProcessResultType, Replier, Subcommand } from "../../../functions.js";
import { validate } from "../../../module_decorators.js";
import { log, LogType } from "../../../utilities/log.js";
import { Proof } from "./proof_cmd.js";
import { MAINTAINER_TAG } from "../../../main.js";
import { ValidatedArguments } from "../../../utilities/argument_processing/arguments_types.js";
import { TextChannelMessage } from "../../../utilities/typeutils.js";
import { GetJumproleResultType } from "../jumprole/internals/jumprole_type.js";
import { Jumprole } from "../jumprole/internals/jumprole_type.js";
import { GetJumproleEntryByJumproleAndHolderResultType, JumproleEntry } from "../tj/internals/entry_type.js";

export class ProofGet extends Subcommand<typeof ProofGet.manual> {
    constructor() {
        super(Proof.manual, ProofGet.manual, ProofGet.no_use_no_see, ProofGet.permissions);
    }

    static readonly manual = {
        name: "get",
        arguments: [
            {
                name: "jump name",
                id: "jumprole_name",
                optional: false,
            },
            {
                name: "user ID",
                id: "source",
                optional: true,
            },
        ],
        syntax: "::<prefix>proof get:: NAME $1{opt $2}[ USER $2]",
        description: "Get the proof for a Jumprole you or someone else has.",
    } as const;

    static readonly no_use_no_see = false;
    static readonly permissions = undefined;

    @validate
    // eslint-disable-next-line complexity
    async activate(
        values: ValidatedArguments<typeof ProofGet.manual>,
        message: TextChannelMessage,
        _client: Client,
        queryable: Queryable<UsesClient>,
        prefix: string,
        reply: Replier,
    ): Promise<BotCommandProcessResults> {
        const client = await use_client(queryable, "ProofGet.activate");

        const failed = { type: BotCommandProcessResultType.DidNotSucceed };

        let jumprole_result = await Jumprole.Get(values.jumprole_name, message.guild.id, client);

        switch (jumprole_result.type) {
            case GetJumproleResultType.InvalidName: {
                await reply(`invalid jump name. Contact @${MAINTAINER_TAG} for help as this should have been caught earlier.`);
                client.handle_release();
                return { type: BotCommandProcessResultType.Invalid };
            }
            case GetJumproleResultType.InvalidServerSnowflake: {
                log(
                    `proof get: Jumprole.Get with arguments [${values.jumprole_name}, ${message.guild.id}] failed with error GetJumproleResultType.InvalidServerSnowflake.`,
                    LogType.Error,
                );
                await reply(
                    `an unknown error caused Jumprole.Get to return GetJumproleResultType.InvalidServerSnowflake. Contact @${MAINTAINER_TAG} for help.`,
                );
                client.handle_release();
                return failed;
            }
            case GetJumproleResultType.GetTierWithIDFailed: {
                await reply(
                    "an unknown error caused Jumprole.Get to fail with error GetJumproleResultType.GetTierWithIDFailed. It is possible that its tier was deleted.",
                );
                log(
                    `proof get: Jumprole.Get with arguments [${values.jumprole_name}, ${message.guild.id}] unexpectedly failed with error GetJumproleResultType.GetTierWithIDFailed.`,
                    LogType.Error,
                );
                client.handle_release();
                return failed;
            }
            case GetJumproleResultType.NoneMatched: {
                await reply(`a jump with that name doesn't exist in this server. You can list all roles with \`${prefix}tj all\`.`);
                client.handle_release();
                return failed;
            }
            case GetJumproleResultType.QueryFailed: {
                await reply(`an unknown error occurred (query failure). Contact @${MAINTAINER_TAG} for help.`);
                client.handle_release();
                return failed;
            }
            case GetJumproleResultType.Unknown: {
                log(
                    `proof get: Jumprole.Get with arguments [${values.jumprole_name}, ${message.guild.id}] unexpectedly failed with error GetJumproleResultType.Unknown.`,
                );
                await reply(`an unknown error occurred after Jumprole.Get. Contact @${MAINTAINER_TAG} for help.`);
                client.handle_release();
                return failed;
            }
            case GetJumproleResultType.Success: {
                let jumprole = jumprole_result.jumprole;
                let user_intention = values.source === null ? message.author.id : values.source;
                let result = await JumproleEntry.Get(user_intention, jumprole_result.jumprole, client);

                switch (result.type) {
                    case GetJumproleEntryByJumproleAndHolderResultType.NoneMatched: {
                        await reply(
                            `${
                                user_intention === message.author.id ? "you don't" : `the user with ID ${user_intention} doesn't`
                            } have that role on this server.`,
                        );
                        return failed;
                    }
                    case GetJumproleEntryByJumproleAndHolderResultType.QueryFailed: {
                        log(`proof get: JumproleEntry.Get returned a query failure. Notifying the user...`, LogType.Error);
                        await reply(`an unknown internal error occurred (query failure). Contact @${MAINTAINER_TAG} for help.`);
                        return failed;
                    }
                    case GetJumproleEntryByJumproleAndHolderResultType.InvalidHolderSnowflake: {
                        log(
                            `proof get: JumproleEntry.Get did not accept holder snowflake '${message.author.id}'. Returning status to indicate failure...'`,
                            LogType.Error,
                        );
                        await reply(`an unknown internal error occurred (did not accept holder snowflake). Contact @${MAINTAINER_TAG} for help.`);
                        return failed;
                    }
                    case GetJumproleEntryByJumproleAndHolderResultType.InvalidJumprole: {
                        log(
                            `proof get: JumproleEntry.Get did not accept Jumprole object (instance: ${
                                jumprole instanceof Jumprole
                            }). Returning status to indicate failure...'`,
                            LogType.Error,
                        );
                        await reply(`an unknown internal error occurred (did not accept Jumprole object). Contact @${MAINTAINER_TAG} for help.`);
                        return failed;
                    }
                    case GetJumproleEntryByJumproleAndHolderResultType.Success: {
                        let link = result.entry.link;

                        if (link === null) {
                            await reply(
                                `${
                                    user_intention === message.author.id ? "you don't" : `the user with ID ${user_intention} doesn't`
                                } have any proof posted for that jump.`,
                            );
                        } else await message.channel.send(link);
                        return { type: BotCommandProcessResultType.Succeeded };
                    }
                }
            }
        }
    }
}
