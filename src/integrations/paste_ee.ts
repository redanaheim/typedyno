import { log, LogType } from "../utilities/log";

export interface Paste {
    id: string;
}

export interface CreatePasteResult {
    paste?: Paste;
    error?: string;
}

export const PASTE_API_TOKEN = process.env.PASTE_API_TOKEN as string;

export const url = function (paste: Paste): string {
    return "https://paste.ee/r/" + paste.id;
};

export const create_paste = async function (
    text: string,
): Promise<CreatePasteResult> {
    let paste = require("paste.ee") as (
        data: string,
        token: string,
    ) => Promise<{ id: string }>;
    try {
        const posted = await paste(text, PASTE_API_TOKEN);
        return {
            paste: posted,
        };
    } catch (err) {
        log("Unexpected error while creating paste:", LogType.Error);
        log(err, LogType.Error);
        return {
            error: String(err),
        };
    }
};
