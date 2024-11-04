import { Client, Message } from "discord.js";
import { Queryable, UsesClient } from "../../../pg_wrapper.js";

import { BotCommand, BotCommandProcessResults, BotCommandProcessResultType } from "../../../functions.js";
import { automatic_dispatch } from "../../../module_decorators.js";
import { TJGive } from "./give.js";
import { TJList } from "./list.js";
import { TJRemove } from "./remove.js";
import { TJConfirm } from "./confirm.js";
import { TJAll } from "./all.js";
import { TJMissing } from "./missing.js";
import { TJInfo } from "./info.js";
import { TJSet } from "./set.js";

export class TJ extends BotCommand {
    constructor() {
        super(TJ.manual, TJ.no_use_no_see, TJ.permissions);
    }

    static readonly manual = {
        name: "tj",
        subcommands: [TJGive.manual, TJList.manual, TJRemove.manual, TJConfirm.manual, TJAll.manual, TJMissing.manual, TJInfo.manual, TJSet.manual],
        description: "Manage and view the Jumproles people have in the current server.",
    } as const;

    @automatic_dispatch(new TJGive(), new TJList(), new TJRemove(), new TJConfirm(), new TJAll(), new TJMissing(), new TJInfo(), new TJSet())
    async process(_message: Message, _client: Client, _queryable: Queryable<UsesClient>, _prefix: string): Promise<BotCommandProcessResults> {
        return { type: BotCommandProcessResultType.PassThrough };
    }
}

export const TJCMD = new TJ();
