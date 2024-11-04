import { BinaryLike, createHash } from "node:crypto";
import { Pool, PoolClient } from "pg";
import { log, LogType } from "../../utilities/log";
import { Parameter, ParamValueType, require_properties } from "../../utilities/parameter_validation";
import { is_valid_Snowflake, Snowflake } from "../../utilities/permissions";
import { is_number, is_string } from "../../utilities/typeutils";

export const GET_JUMPROLE_BY_ID = `SELECT * FROM trickjump_jumps WHERE id=$1`
export const GET_JUMPROLE_BY_NAME_AND_SERVER = `SELECT * FROM trickjump_jumps WHERE name=$1 AND server=$2`

type Queryable = Pool | PoolClient

export enum Kingdom {
    Cap = 0, Cascade, Sand, Lake, Wooded, Cloud, Lost, NightMetro, Metro, Snow, Seaside, Luncheon, Ruined, Bowser, Moon, DarkSide, DarkerSide, Mushroom
}

export const KINGDOM_NAMES = ["Cap Kingdom", "Cascade Kingdom", "Sand Kingdom", "Lake Kingdom", "Wooded Kingdom", "Cloud Kingdom", "Lost Kingdom", "Night Metro Kingdom", "Metro Kingdom", "Snow Kingdom", "Seaside Kingdom", "Luncheon Kingdom", "Ruined Kingdom", "Bowser's Kingdom", "Moon Kingdom", "Dark Side", "Darker Side", "Mushroom Kingdom"]

export enum JumproleHandleType {
    Invalid = 0, ID, NameAndServer
}

export type JumproleHandle = number | [string, Snowflake]

export interface Jumprole {
    id: number;
    name: string;
    description: string;
    kingdom: Kingdom | null;
    location: string | null;
    jump_type: string | null;
    link: string | null;
    added_by: Snowflake;
    updated_at: Date;
    server: Snowflake;
    hash: string;
}

export interface PGJumprole {
    id: string;
    name: string;
    description: string;
    kingdom?: string;
    location?: string;
    jump_type?: string;
    link?: string;
    added_by: string;
    updated_at: string;
    server: string;
    hash: string;
}

export const is_valid_jump_id = function(thing?: unknown): boolean {
    if (!thing || is_number(thing) === false) {
        return false
    }
    else if (is_number(thing)) {
        return /^\d{0,11}$/.test(thing.toString())
    }
    else {
        return false;
    }
}
export const is_valid_postgresql_int = is_valid_jump_id

export const check_jumprole_handle = function (thing?: unknown): JumproleHandleType {
    if (!thing && thing !== 0) {
        return JumproleHandleType.Invalid
    }
    else if (is_valid_jump_id(thing)) {
        return JumproleHandleType.ID
    }
    else if (Array.isArray(thing) && 0 in thing && 1 in thing && thing.length === 2) {
        if (is_string(thing[0]) && is_valid_Snowflake(thing[1])) {
            return JumproleHandleType.NameAndServer
        }
    }
    return JumproleHandleType.Invalid
}

export const PGJumproleSPECIFICATION: Parameter[] = [
    { type: ParamValueType.UInt4S, name: "id" },
    { type: ParamValueType.String, name: "name" }, 
    { type: ParamValueType.String, name: "description" }, 
    { type: {type: ParamValueType.KingdomIndexS, accepts_null: true, accepts_undefined: true}, name: "kingdom" }, 
    { type: {type: ParamValueType.String, accepts_null: true, accepts_undefined: true}, name: "location" }, 
    { type: {type: ParamValueType.String, accepts_null: true, accepts_undefined: true}, name: "jump_type" }, 
    { type: {type: ParamValueType.String, accepts_null: true, accepts_undefined: true}, name: "link" }, 
    { type: ParamValueType.Snowflake, name: "added_by" },
    { type: ParamValueType.DateAsUInt4Like, name: "updated_at" },
    { type: ParamValueType.Snowflake, name: "server" },
    { type: ParamValueType.String, name: "hash" }
]

/**
 * Converts the result received from client.query to our Jumprole object.
 * @param object The supposed PGJumprole to convert to our Jumprole object. It is thoroughly type-checked for validity.
 * @returns Jumprole or null if it was invalid.
 */
export const PGJumprole_to_Jumprole = function(object: unknown): Jumprole | null {

    if (!object) {
        return null;
    }
    
    const result = require_properties(object, "PGJumprole_to_Jumprole", ...PGJumproleSPECIFICATION)

    if (result === false) {
        return null;
    }
    // @ts-expect-error
    if (compute_jumprole_hash(result as Jumprole) !== result.hash) {
        log(`PGJumprole_to_Jumprole: PGJumprole.hash unexpectedly did not match computed Jumprole hash value! Returning null.`, LogType.Mismatch)
        return null;
    }
    // If it isn't fully complete, we've already returned null; we're safe to return it
    // @ts-expect-error
    return result as Jumprole;
}

export const string_hash = function (thing: string | number): string {
    const hash = createHash("sha256");
    // dynamic dispatch ;)
    hash.update(thing.toString())
    return hash.digest("base64");
}

export const optional_hashable = function(thing?: string | number | null): BinaryLike[] {
    if (thing === null) {
        return [`null`]
    }
    else if (thing === undefined) {
        return [`undefined`]
    }
    else {
        // throw off attempts to place values that would hash the same way as null or undefined
        return [thing.toString(), string_hash(thing)]
    }
}

export const compute_jumprole_hash = function(jumprole: Jumprole): string {
    const hash = createHash("sha256");
    hash.update(jumprole.id.toString());
    hash.update(jumprole.name);
    hash.update(jumprole.description);
    // Make sure we hash null or undefined different than any string value
    optional_hashable(jumprole.kingdom).forEach(value => hash.update(value));
    optional_hashable(jumprole.location).forEach(value => hash.update(value));
    optional_hashable(jumprole.jump_type).forEach(value => hash.update(value));
    optional_hashable(jumprole.link).forEach(value => hash.update(value));
    hash.update(jumprole.added_by);
    hash.update(jumprole.updated_at.getTime().toString());
    hash.update(jumprole.server);
    return hash.digest("base64");
}

export const get_jumprole = async (handle: JumproleHandle, queryable: Queryable): Promise<Jumprole | null> => {

    const type = check_jumprole_handle(handle);

    switch (type) {
        case JumproleHandleType.Invalid: {
            return null;
        }
        case JumproleHandleType.ID: {
            try {
                const result = await queryable.query(GET_JUMPROLE_BY_ID, [handle as number]);
                const row_result = result.rowCount
                if (row_result > 1) {
                    // Somehow multiple jumps with the same ID, even though it is guaranteed by PostgreSQL to be unique
                    log(`get_jumprole: received ${result.rows.length.toString()} rows when getting jumprole using ID ${handle.toString()}! Returning null...`, LogType.Error)
                    return null;
                }
                else if (row_result === 1) {
                    // Expected case 1
                    return PGJumprole_to_Jumprole(result.rows[0]);
                }
                else {
                    // Expected case 2
                    // No jumps with ID
                    return null;
                }
            }
            catch (error) {
                log(`get_jumprole: unexpected error when getting jumprole with ID ${handle.toString()}. Returning null.`, LogType.Error);
                log(error, LogType.Error)
            }
            return null;
        }
        case JumproleHandleType.NameAndServer: {
            const name = (handle as [string, Snowflake])[0]
            const server_id = (handle as [string, Snowflake])[1]
            try {
                const result = await queryable.query(GET_JUMPROLE_BY_NAME_AND_SERVER, [name, server_id]);
                const row_result = result.rowCount
                if (row_result > 1) {
                    // Somehow multiple jumps with the same name and server, even though they are guaranteed by PostgreSQL to be unique as a pair
                    log(`get_jumprole: received ${result.rows.length.toString()} rows when getting jumprole using name ${name} and server ${server_id}! Returning null...`, LogType.Error)
                    return null;
                }
                else if (row_result === 1) {
                    // Expected case 1
                    return PGJumprole_to_Jumprole(result.rows[0]);
                }
                else {
                    // Expected case 2
                    // No jumps with ID
                    return null;
                }
            }
            catch (error) {
                log(`get_jumprole: unexpected error when getting jumprole using name ${name} and server ${server_id}! Returning null.`, LogType.Error);
                log(error, LogType.Error)
            }
            return null;
        }
    }
}

