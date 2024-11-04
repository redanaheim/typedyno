await new Promise((res, _rej) => {
    setTimeout(res, 5000);
});
import * as Discord from "discord.js";
import { process_message } from "./message.js";
import * as PG from "pg";

import { load_modules } from "./module_loader.js";

import { CONFIG } from "./config.js";

export const DISCORD_API_TOKEN = process.env.DISCORD_API_TOKEN as string;
export const GLOBAL_PREFIX = process.env.GLOBAL_PREFIX as string;
export const BOT_USER_ID = "864326626111913995";
export const STOCK_TABLES = ["prefixes", "users"];
export const MAINTAINER_TAG = "TigerGold59#8729";

import { log, LogType } from "./utilities/log.js";

log("Loading modules...", LogType.Status);
export const MODULES = await load_modules();
log("Module loading complete.", LogType.Success);

const client = new Discord.Client();
log("Client created. Bot starting up...", LogType.Status);

const connection_pool = new PG.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

client.once("ready", () => {
    if (client.user === null) {
        return;
    }

    log(`Bot ready; logged in as ${client.user.tag}.`, LogType.Success);

    // Set status
    if (!CONFIG.presence_data) {
        client.user.setPresence({
            activity: {
                name: "@ for server prefix",
            },
        });
    } else {
        client.user.setPresence(CONFIG.presence_data);
    }
});

// Send messages through messages.ts
client.on("message", message => {
    process_message(message, client, connection_pool);
});

// Use event listener files
export type EventListenerModule = (client: Discord.Client, connection_pool: PG.Pool) => (...args: any) => void;
for (const listener_name of CONFIG.event_listeners) {
    // Import each through a require (the reason it's not .ts is because the listeners will get compiled to .js)
    let listener: EventListenerModule = require(`../events/${listener_name}.js`)(client, connection_pool);
    // Apply the listener (listener name is actually the event name)
    client.on(listener_name, listener);
}

// Actually log the bot in
client.login(DISCORD_API_TOKEN);

// Listen for errors that require ending the process, instead of sitting idly
const error_listener_function_connection = () => {
    log("Process terminating due to a connection error.", LogType.Error);
    process.exit(0);
};
const error_listener_function_promise_rejection = (error: Error) => {
    log("Process terminating due to an unhandled promise rejection.", LogType.PromiseRejection);
    console.error(error);
    process.exit(0);
};

client.on("disconnect", error_listener_function_connection);
process.on("disconnect", error_listener_function_connection);
process.on("unhandledRejection", error_listener_function_promise_rejection);
