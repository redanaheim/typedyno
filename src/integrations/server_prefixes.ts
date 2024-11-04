import { Guild } from "discord.js";
import { GLOBAL_PREFIX } from "../main";
import { Pool, PoolClient } from "pg";
import { is_string } from "../utilities/typeutils";
import { log, LogType } from "../utilities/log";

export const CREATE_SERVER_LISTING = "INSERT INTO prefixes (snowflake, prefix) VALUES ($1, $2)"
export const ALTER_SERVER_LISTING = "ALTER TABLE prefixes SET prefix=$1 WHERE snowflake=$2";
export const GET_SERVER_LISTING = "SELECT (prefix) FROM prefixes WHERE snowflake=$1";

export enum NoLocalPrefixEntryReason {
    NoDatabaseEntry = 0,
    InvalidGuildArgument = 1
}

// Overload this function to provide cases for if we are doing successive queries or not.

/**
 * Uses the Heroku postgres server database to get the local prefix, or returns null if it doesn't exist
 * @param server The server to check the prefix for. If a server with no ID (?) is passed, we return null
 * @param pool The Heroku postgres server database connection pool to use when making database queries. Use this when not making a lot of requests in succession.
 */
export async function get_prefix_entry(server: Guild, pool: Pool): Promise<string | NoLocalPrefixEntryReason>
/**
 * Uses the Heroku postgres server database to get the local prefix, or returns null if it doesn't exist
 * @param server The server to check the prefix for. If a server with no ID (?) is passed, we return null
 * @param pool_client The Heroku postgres server database pool client to use when making database queries. The caller is responsible for its release.
 */
export async function get_prefix_entry(server: Guild, pool_client: PoolClient): Promise<string | NoLocalPrefixEntryReason>

export async function get_prefix_entry(server: Guild, query_device: Pool | PoolClient): Promise<string | NoLocalPrefixEntryReason> {
    if (is_string(server.id) === false) {
        return NoLocalPrefixEntryReason.InvalidGuildArgument
    }
    const prefixes = await query_device.query(GET_SERVER_LISTING, [server.id])
    // No entry for the server ID
    if (prefixes.rowCount === 0) {
        return NoLocalPrefixEntryReason.NoDatabaseEntry
    }
    else {
        return prefixes.rows[0];
    }
}

// Overload this function to provide cases for if we are doing successive queries or not.

/**
 * Uses the Heroku postgres server database to get the local prefix, or returns the global prefix if there is no entry
 * in the database
 * @param server Server to check the prefix for
 * @param pool The Heroku postgres server database connection pool to use when making PostgreSQL queries
 * @returns Prefix for the start of commands. Example: '%' in "%info" or "t1" in "t1info"
 */
export async function get_prefix(server: Guild, pool: Pool): Promise<string>
/**
 * Uses the Heroku postgres server database to get the local prefix, or returns the global prefix if there is no entry
 * in the database
 * @param server Server to check the prefix for
 * @param pool_client The Heroku postgres server database pool client to use when making PostgreSQL queries.
 * @returns Prefix for the start of commands. Example: '%' in "%info" or "t1" in "t1info"
 */
export async function get_prefix(server: Guild, pool_client: Pool): Promise<string>

export async function  get_prefix(server: Guild, query_device: Pool | PoolClient): Promise<string> {

    var local_prefix;

    if (query_device instanceof Pool) {
        local_prefix = await get_prefix_entry(server, query_device);
    }
    else {
        local_prefix = await get_prefix_entry(server, query_device as PoolClient);
    }
    
    // Never return an invalid local prefix; we can be sure GLOBAL_PREFIX is valid because it's an environment variable
    if (local_prefix === NoLocalPrefixEntryReason.NoDatabaseEntry) {
        return GLOBAL_PREFIX;
    }
    else if (local_prefix === NoLocalPrefixEntryReason.InvalidGuildArgument) {
        log("Unexpected get_prefix error: Invalid guild argument (get_prefix_entry). Returning global prefix anyway...", LogType.Incompatibility);
        return GLOBAL_PREFIX;
    }
    else if (is_string(local_prefix) === false) {
        log(`Unexpected get_prefix error: Invalid return type '${typeof local_prefix}' (expected string or NoLocalPrefixEntryReason). Returning global prefix anyway...`, LogType.Mismatch)
    }
    else {
        return local_prefix;
    }
}

export enum SetPrefixNonStringResult
 {
    InvalidGuildArgument = 0,
    InvalidPrefixArgument = 1,
    LocalPrefixArgumentSameAsGlobalPrefix = 2,
    CreatedNewRow = 3,
    DatabaseOperationFailed = 4
}

export interface SetPrefixResults {
    result: string | SetPrefixNonStringResult
    did_succeed: boolean
}

/**
 * Sets the local prefix for a guild, creating a database entry if it doesn't exist. If the prefix passed
 * is the same as the global prefix, we will not create an entry for it and will return `SetPrefixNonStringResult.InvalidGuildArgument`.
 * @param server The server to set the prefix for
 * @param pool The Heroku postgres server database connection pool to use when making PostgreSQL queries. 
 * @param prefix The prefix to set
 * @param pool_client The `PoolClient` to use to make the database requests. If left as null or undefined, a new `PoolClient` will be connected. If passed, the caller is responsible for its release.
 * @returns `SetPrefixResults`: `results` will be the previous prefix as a string if it replaced a locally specific one, or a more specific result in the form of `SetPrefixNonStringResult` otherwise; `did_succeed` will be `true` if `get_prefix` will return the prefix passed as an argument from now on and `false` otherwise.
*/
export const set_prefix = async function(server: Guild, pool: Pool, prefix: string, pool_client?: PoolClient): Promise<SetPrefixResults> {

    let client: PoolClient;
    let did_use_passed_pool_client = true;

    if (is_string(server.id) === false) {
        return {
            result: SetPrefixNonStringResult.InvalidGuildArgument,
            did_succeed: false
        }
    }
    else if (prefix === GLOBAL_PREFIX) {
        return {
            result: SetPrefixNonStringResult.LocalPrefixArgumentSameAsGlobalPrefix,
            did_succeed: true
        }
    }
    else if (is_string(prefix) === false) {
        return {
            result: SetPrefixNonStringResult.InvalidPrefixArgument,
            did_succeed: false
        }
    }
    
    // Easy, clean code for releasing if we created our own pool client, and leaving it be if we didn't.
    // IMPORTANT: ALWAYS CALL BEFORE FUNCTION RELEASES
    const conditionally_release_pool_client = function() {
        if (did_use_passed_pool_client === false) {
            client.release();
        }
    }

    // If they didn't pass a PoolClient, connect one.
    if (!pool_client) {
        client = await pool.connect()
        did_use_passed_pool_client = false;
    }
    else {
        // Use the passed pool client
        client = pool_client;
    }

    const local_prefix_entry = await get_prefix_entry(server, pool_client)

    // Create a new row; we don't already have one for this server
    if (local_prefix_entry === NoLocalPrefixEntryReason.NoDatabaseEntry) {
        try {
            await pool.query(CREATE_SERVER_LISTING, [server.id, prefix]);
        }
        catch (err) {
            log(`Unexpected database error: set_prefix failed when creating new row {'snowflake': ${server.id}, 'prefix': ${prefix}}. Message:`, LogType.Error)
            log(err, LogType.Error)

            conditionally_release_pool_client()

            return {
                result: SetPrefixNonStringResult.DatabaseOperationFailed,
                did_succeed: false
            }
        }

        conditionally_release_pool_client()

        return {
            result: SetPrefixNonStringResult.CreatedNewRow,
            did_succeed: true
        }
    }
    else if (local_prefix_entry === NoLocalPrefixEntryReason.InvalidGuildArgument) {
        conditionally_release_pool_client()

        return {
            result: SetPrefixNonStringResult.InvalidGuildArgument,
            did_succeed: false
        }
    }
    else if (is_string(local_prefix_entry)) {
        try {
            await pool.query(ALTER_SERVER_LISTING, [prefix, server.id])
        }
        catch (err) {
            log(`Unexpected database error: set_prefix failed when altering row {'snowflake': ${server.id}, 'prefix': ${prefix}}. Message:`, LogType.Error)
            log(err, LogType.Error)

            conditionally_release_pool_client()

            return {
                result: SetPrefixNonStringResult.DatabaseOperationFailed,
                did_succeed: false
            }
        }

        conditionally_release_pool_client()

        return {
            result: local_prefix_entry,
            did_succeed: true
        }

    }
}