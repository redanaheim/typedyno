import { Module } from "../../module_loader";
import { InclusionSpecifierType } from "../../utilities/permissions";
import { jumprole_cmd } from "./jumprole/jumprole_cmd";

// Main module export object
const trickjump_module: Module = {
    name: "trickjump",
    servers_are_universes: true,
    hide_when_contradicts_permissions: true,
    tables: ["trickjump_jumps", "trickjump_entries", "trickjump_guilds"],
    permissions: {
        servers: {
            type: InclusionSpecifierType.Whitelist,
            list: ["542766712785862666"],
        },
    },
    functions: [jumprole_cmd],
};

module.exports = trickjump_module;
