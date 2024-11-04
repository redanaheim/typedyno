import { Snowflake } from "./permissions";
import { Guild } from "discord.js";

export const is_string = function(thing?: any): boolean {
    if (thing === "") {
        return true;
    }
    else if (!thing) {
        return false;
    }
    else if (typeof thing === "string") {
        return true;
    }
    else {
        return false;
    }
}

export const is_number = function(thing?: any): boolean {
    if (!thing) {
        return false;
    }
    else if (typeof thing === "number") {
        if (isNaN(thing as number)) {
            return false;
        }
        else if (!isFinite(thing as number)) {
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return false;
    }
}

export const to_string = function(snowflake: Snowflake): string {
    if (is_number(snowflake)) {
        return (snowflake as number).toString();
    }
    else {
        return snowflake as string;
    }
}

export const is_server = function(guild?: Guild): boolean {
    if (!guild) {
        return false;
    }
    return true;
}

export const escape_reg_exp = function(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}