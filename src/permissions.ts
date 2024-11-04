import { Message } from "discord.js";
import { is_server, to_string } from "./typeutils";

export type Snowflake = string | number

export enum InclusionSpecifierType {
    Whitelist,
    Blacklist
}

export interface InclusionSpecifier {
    type: InclusionSpecifierType,
    list: [Snowflake]
}

export interface Permissions {
    servers?: InclusionSpecifier,
    channels?: InclusionSpecifier,
    users?: InclusionSpecifier
}

export const allowed_under = function(snowflake?: Snowflake, specifier?: InclusionSpecifier): boolean {
    if (!snowflake) {
        return false;
    }
    if (!specifier) {
        return false;
    }

    let list = specifier.list.map(el => to_string(el));
    let string_snowflake = to_string(snowflake)
    switch (specifier.type) {
        case InclusionSpecifierType.Blacklist:
            if (list.includes(string_snowflake)) {
                return false;
            }
            else {
                return true;
            }
        case InclusionSpecifierType.Whitelist:
            if (list.includes(string_snowflake)) {
                return true;
            }
            else {
                return false;
            }
    }
}

export const allowed = function(message: Message, permissions: Permissions): boolean {
    if (allowed_under(message.guild.id, permissions.servers)) {
        if (allowed_under(message.channel.id, permissions.channels)) {
            if (allowed_under(message.author.id, permissions.users)) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }
}
