import { Guild } from "discord.js";

export const is_string = function(thing?: unknown): thing is string {
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

export const is_number = function(thing?: unknown): thing is number {
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

export const is_boolean = function(thing?: unknown): thing is boolean {
    return thing === true || thing === false;
}

// TODO: Make utility function that checks what type of guild a Guild is (i.e. a server, group DM, etc.)

export const is_server = function(guild?: Guild): boolean {
    if (!guild) {
        return false;
    }
    return true;
}

export const escape_reg_exp = function(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export const safe_serialize = function(value: any): string {
    if (typeof value === "bigint") {
        return `${value.toString(10)}n`;
    }
    else {
        try {
            const result = JSON.stringify(value);
            return result;
        }
        catch (err) {
            return "([circular object])"
        }
    }
}

export type Unknown<T> = Record<keyof T, unknown>