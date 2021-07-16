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
    Blacklist = "Blacklist",
    DeferringWhitelist = "DeferringWhitelist",
    DeferringBlacklist = "DeferringBlacklist"
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
    else if (thing.type !== InclusionSpecifierType.Blacklist && thing.type !== InclusionSpecifierType.Whitelist && thing.type !== InclusionSpecifierType.DeferringWhitelist && thing.type !== InclusionSpecifierType.DeferringBlacklist) {
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

export enum TentativePermissionType {
    AllowedIfLowerLevelWhitelisted,
    AllowedThroughWhitelistIfLowerLevelAllowed, // indicates to allowed() function that a whitelist is the reason this is allowed. this allows
    // it to override the DeferringBlacklist and DeferringWhitelist AllowedIfLowerLevelWhitelisted result
    AllowedIfLowerLevelAllowed,
    NotAllowed
}

export const allowed_under = function(snowflake?: Snowflake, specifier?: InclusionSpecifier): TentativePermissionType {
    if (!snowflake || is_valid_Snowflake(snowflake) === false) {
        return TentativePermissionType.NotAllowed
    }
    if (!specifier || is_valid_InclusionSpecifier(specifier) === false) {
        return TentativePermissionType.AllowedIfLowerLevelAllowed
    }

    let list = specifier.list.map(el => to_string(el));
    let string_snowflake = to_string(snowflake)
    switch (specifier.type) {
        case InclusionSpecifierType.Blacklist:
            if (list.includes(string_snowflake)) {
                return TentativePermissionType.NotAllowed
            }
            else {
                return TentativePermissionType.AllowedIfLowerLevelAllowed
            }
        case InclusionSpecifierType.Whitelist:
            if (list.includes(string_snowflake)) {
                return TentativePermissionType.AllowedThroughWhitelistIfLowerLevelAllowed
            }
            else {
                return TentativePermissionType.NotAllowed
            }
        case InclusionSpecifierType.DeferringBlacklist:
            if (list.includes(string_snowflake)) {
                return TentativePermissionType.AllowedIfLowerLevelWhitelisted
            }
            else {
                return TentativePermissionType.AllowedIfLowerLevelAllowed
            }
        case InclusionSpecifierType.DeferringWhitelist:
            if (list.includes(string_snowflake)) {
                return TentativePermissionType.AllowedThroughWhitelistIfLowerLevelAllowed
            }
            else {
                return TentativePermissionType.AllowedIfLowerLevelWhitelisted
            }
    }
}

export const allowed = function(message: Message, permissions: Permissions): boolean {

    switch (allowed_under(message.guild.id, permissions.servers)) { // Server level
        case TentativePermissionType.NotAllowed: // Never allowed
            return false;
        case TentativePermissionType.AllowedIfLowerLevelAllowed: // Check lower levels for passive allowance
        case TentativePermissionType.AllowedThroughWhitelistIfLowerLevelAllowed:
            switch (allowed_under(message.channel.id, permissions.channels)) { // Channel level
                case TentativePermissionType.NotAllowed: // Never allowed
                    return false;
                case TentativePermissionType.AllowedIfLowerLevelAllowed: // Check lower levels for passive allowance
                case TentativePermissionType.AllowedThroughWhitelistIfLowerLevelAllowed:
                    switch (allowed_under(message.author.id, permissions.users)) { // User level
                        case TentativePermissionType.NotAllowed:
                            return false;
                        case TentativePermissionType.AllowedIfLowerLevelAllowed:
                        case TentativePermissionType.AllowedThroughWhitelistIfLowerLevelAllowed:
                        case TentativePermissionType.AllowedIfLowerLevelWhitelisted:
                            return true;
                    }
                case TentativePermissionType.AllowedIfLowerLevelWhitelisted: // Check lower levels for whitelist allowance
                    switch (allowed_under(message.author.id, permissions.users)) { // User level
                        case TentativePermissionType.AllowedThroughWhitelistIfLowerLevelAllowed:
                            return true;
                        case TentativePermissionType.AllowedIfLowerLevelAllowed:
                        case TentativePermissionType.AllowedIfLowerLevelWhitelisted:
                        case TentativePermissionType.NotAllowed:
                            return false;
                    }
            }
        case TentativePermissionType.AllowedIfLowerLevelWhitelisted: // Check lower levels for whitelisted allowance
            switch (allowed_under(message.channel.id, permissions.channels)) { // Channel level
                case TentativePermissionType.AllowedThroughWhitelistIfLowerLevelAllowed:
                    switch (allowed_under(message.author.id, permissions.users)) { // User level
                        case TentativePermissionType.AllowedIfLowerLevelAllowed:
                        case TentativePermissionType.AllowedThroughWhitelistIfLowerLevelAllowed:
                            return true;
                        case TentativePermissionType.AllowedIfLowerLevelWhitelisted:
                        case TentativePermissionType.NotAllowed:
                            return false;
                    }
                case TentativePermissionType.AllowedIfLowerLevelWhitelisted:
                    switch (allowed_under(message.author.id, permissions.users)) { // User level
                        case TentativePermissionType.AllowedThroughWhitelistIfLowerLevelAllowed:
                            return true;
                        case TentativePermissionType.AllowedIfLowerLevelAllowed:
                        case TentativePermissionType.AllowedIfLowerLevelWhitelisted:
                        case TentativePermissionType.NotAllowed:
                            return false;
                    }
                case TentativePermissionType.AllowedIfLowerLevelAllowed: // Not sufficient. Channel must be whitelisted
                case TentativePermissionType.NotAllowed:
                    return false;
            }
    }
}

/**
 * This function checks if two commands with the given permissions could both be used in the same channel by the same user.
 * This is useful to determine whether a function name overlap should be allowed or whether it is okay, because
 * one would always be restricted anyway. Argument order doesn't matter.
 * @param permissions_one A permissions object for one command
 * @param permissions_two A permissions object for the other command
 * @returns Boolean indicating whether the permissions object have overlap.
 */
export const overlap = function(permissions_one: Permissions, permission_two: Permissions)/*: boolean */{
    // TODO: Implement ANY way of doing this
}