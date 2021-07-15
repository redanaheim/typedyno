import { Message } from "discord.js";
import { is_number, is_server, is_string, to_string } from "./typeutils";

export type Snowflake = string | number

export const is_valid_Snowflake = function(thing?: any): boolean {
    if (is_string(thing) === false && is_number(thing) === false) {
        return false
    }
    else if (is_string(thing)) {
        return /^\d+$/.test(thing)
    }
    else if (is_number(thing)) {
        return /^\d+$/.test((thing as number).toString())
    }

    return false
}

// TODO: add whitelists and blacklists that defer to lower levels, i.e. so that whitelisted users can
// still use the commands on blacklisted servers (DeferringWhitelist, DeferringBlacklist)

export enum InclusionSpecifierType {
    Whitelist = "Whitelist",
    Blacklist = "Blacklist"
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

export const is_valid_InclusionSpecifier = function(thing?: any): boolean {
    if (!thing) {
        return false
    }
    else if (thing.type !== InclusionSpecifierType.Blacklist && thing.type !== InclusionSpecifierType.Whitelist) {
        return false
    }
    else if (Array.isArray(thing.list) === false) {
        return false
    }

    for (const item in thing.list) {
        if (is_valid_Snowflake(item) === false) {
            return false
        }
    }

    return true;
}

export const is_valid_Permissions = function(thing?: any): boolean {
    if (!thing) {
        return false
    }
    else if (thing.servers !== null && thing.servers !== undefined && is_valid_InclusionSpecifier(thing.servers) === false) {
        return false
    } 
    else if (thing.channels !== null && thing.channels !== undefined && is_valid_InclusionSpecifier(thing.channels) === false) {
        return false
    } 
    else if (thing.users !== null && thing.users !== undefined && is_valid_InclusionSpecifier(thing.users) === false) {
        return false
    } 

    return true;
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
