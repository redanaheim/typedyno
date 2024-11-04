import * as FS from "fs";
import { log, LogType } from "./utilities/log";
import { Snowflake } from "./utilities/permissions";
import * as Discord from "discord.js";
import { process_message } from "./message";

export interface Config {
    admins: [Snowflake];
    use: [string],
    event_listeners: [string],
    presence_data?: Discord.PresenceData,
    [key: string]: any
}

export const CONFIG = require("./config.json") as Config;
export const DISCORD_API_TOKEN = process.env.DISCORD_API_TOKEN;
export const GLOBAL_PREFIX = process.env.GLOBAL_PREFIX;
export const BOT_USER_ID = "626223136047628308";

const client = new Discord.Client();
log("Client created. Bot starting up...", LogType.Status);

client.once("ready", () => {
    log(`Bot ready; logged in as ${client.user.tag}.`, LogType.Success);

    // Set status
    if (!CONFIG.presence_data) {
        client.user.setPresence({
            activity: {
                name: "@ for server prefix"
            }
        });
    }
    else {
        client.user.setPresence(CONFIG.presence_data);
    }
})


// Send messages through messages.ts
client.on("message", message => {
    process_message(message, client);
});

// Use event listener files
for (const listener_name of CONFIG.event_listeners) {
    // Import each through a require (the reason it's not .ts is because the listeners will get compiled to .js)
    let listener = require(`./events/${listener_name}.js`)(client);
    // Apply the listener (listener name is actually the event name)
    client.on(listener_name, listener);
}

// Actually log the bot in
client.login(DISCORD_API_TOKEN);

// Listen for errors that require ending the process, instead of sitting idly
const error_listener_function_connection = () => {
    log("Process terminating due to a connection error.", LogType.Error)
    process.exit(0);
}
const error_listener_function_promise_rejection = (error: Error) => {
    log("Process terminating due to an unhandled promise rejection.", LogType.PromiseRejection);
    console.error(error);
    process.exit(0);
}

client.on("disconnect", error_listener_function_connection);
process.on("disconnect", error_listener_function_connection);
process.on("unhandledRejection", error_listener_function_promise_rejection)