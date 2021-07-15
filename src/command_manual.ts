import { GLOBAL_PREFIX } from "./main"
import { is_string } from "./utilities/typeutils"

/**
 * An interface which describes an argument a command or subcommand takes.
 */
export interface CommandArgument {
    // Concise description of the argument's purpose
    name: string;
    // Whether the argument can be left out
    optional: boolean;
}

const is_valid_CommandArgument = function(thing?: any): boolean {
    if (!thing) {
        return false
    }
    else if (is_string(thing.name) === false) {
        return false
    }
    else if (thing.optional !== true && thing.optional !== false) {
        return false
    }
    else {
        return true;
    }
}

/**
 * A specific entry for one syntax as part of a larger command, i.e. %tj list as part of %tj
 */
export interface SubcommandManual {
    // Name of subcommand, i.e. list in %tj list
    name: string;
    // Syntax string
    // Example: <prefix>proof set | $1 | $2
    // Example with optional: <prefix>proof get{opt $2}[ |] $1{opt $2}[ | $2]
    // In the example with the optional, the pipelines are only required if argument $2 is present.
    syntax: string;
    arguments: [CommandArgument]
    // A description of the subcommand to be added on in the manual.
    description: string;
}


/**
 * A command which only has one syntax, i.e. %xofakind
 */
export type SimpleCommandManual = SubcommandManual

const is_valid_SimpleCommandManual = function(thing?: any): boolean {
    if (!thing) {
        return false
    }
    else if (is_string(thing.name) === false) {
        return false
    }
    else if (is_string(thing.syntax) === false) {
        return false
    }
    else if (!thing.arguments || Array.isArray(thing.arguments) === false) {
        return false
    }
    else if (is_string(thing.description) === false) {
        return false
    }
    
    for (const element of thing.arguments) {
        if (is_valid_CommandArgument(element) === false) {
            return false
        }
    }

    return true
}

const is_valid_SubcommandManual = is_valid_SimpleCommandManual

export interface MultifacetedCommandManual {
    // Name of command, i.e. tj in %tj list
    name: string;
    subcommands: [SubcommandManual],
    // A description of the command to be added on in the manual.
    description: string;
}

const is_valid_MultifacetedCommandManual = function(thing?: any): boolean {

    if (!thing) {
        return false
    }
    else if (is_string(thing.name) === false) {
        return false
    }
    else if (!thing.subcommands || Array.isArray(thing.subcommands) === false) {
        return false
    }
    else if (is_string(thing.description) === false) {
        return false
    }

    for (const element of thing.subcommands) {
        if (is_valid_SubcommandManual(element) === false) {
            return false
        }
    }

    return true;
}

export type CommandManual = SimpleCommandManual | MultifacetedCommandManual

export enum CommandManualType {
    SimpleCommandManual,
    MultifacetedCommandManual,
    Invalid
}

export const get_type = function(command_manual: CommandManual): CommandManualType {
    if (is_valid_SimpleCommandManual(command_manual)) {
        return CommandManualType.SimpleCommandManual
    }
    else if (is_valid_MultifacetedCommandManual(command_manual)) {
        return CommandManualType.MultifacetedCommandManual
    }
    else {
        return CommandManualType.Invalid
    }
}

export const CommandManualValidation = {
    is_valid_CommandArgument: is_valid_CommandArgument,
    is_valid_SimpleCommandManual: is_valid_SimpleCommandManual,
    is_valid_SubcommandManual: is_valid_SubcommandManual,
    is_valid_MultifacetedCommandManual: is_valid_MultifacetedCommandManual,
    get_type: get_type
}

/*
Manual Examples
Command: proof <get/set/remove/list/missing>
Manual:

proof <get/set/remove/list/missing>
    get:
        1. %proof get <jump_name>
        2. %proof get | <jump name> | <user ID>
        Description: Retrieves the link to the proof set by you or the user whose ID you included.

xofakind:
    1. %xofakind <number>
    Description: Simulates rolling the given number of dice until they all come up the same.
*/

export const keying_off_regex = function(argument_number: number): RegExp {
    const argument_identifier = "$" + Math.floor(argument_number).toString()

    return new RegExp(`\\{opt\\s*\\$${argument_identifier}\\}\\s*\\[(.+?)\\]`, 'gi');
}

export const argument_identifier = function(argument_number: number): string {
    return ("$" + Math.floor(argument_number).toString())
}

export const key_off = function(syntax_string: string, argument_number: number, provided: boolean): string {
    const regex = keying_off_regex(argument_number);
    if (provided === false) {
        return syntax_string.replace(regex, "")
    }
    else {
        const matches = syntax_string.matchAll(regex)

        // Replace each match with the content in the braces
        for (const match of matches) {
            syntax_string = syntax_string.replace(match[0], match[1])
        }
        
        return syntax_string
    }
}

/**
 * Used for command manual text generation.
 * @param command_arguments The list of arguments possible to provide to the command or subcommand
 * @param syntax_string A string which provides information about how to format the command and what parts depend on whether optional arguments are provided
 * @param prefix_substitution What to replace the <prefix> placeholder in the syntax string with
 * @returns A list of syntax strings consisting of every possible combination of providing or not providing each optional argument
 */
export const generate_syntaxes = function(command_arguments: CommandArgument[], syntax_string: string, prefix_substitution: string): string[] {
    // List of optional arguments
    let optional_arguments = command_arguments.filter(argument => argument.optional);

    // Array showing which optional arguments we are considering not provided, for making the syntax list
    const state = optional_arguments.map(x => false);

    // We are essentially binary counting. The syntax list goes from no optional argument not provided 
    // to first optional argument and all others provided.

    // This function will perform the binary counting procedure, i.e. increment the value of state as an integer by one
    // Binary counting procedure: flip the last 0 to a 1, if you can, flipping all the 1s after it to 0s
    // 000 to 001 to 010 to 011 to 100 to 101 to 110 to 111
    const flip_last_zero = function() {
        for (let index = state.length - 1; index >= 0; index--) {
            if (state[index] === false) {
                state[index] = true
                return;
            }
            else {
                state[index] = false
                continue;
            }
        }
    }

    let syntaxes: string[] = []

    // Further explanation: state includes booleans, or 1s and 0s, that represent whether...
    // a given optional argument is included. We are using the binary counting algorithm to efficiently and...
    // regularly go through all the possibilities for syntaxes based on whether you include the optional arguments or not.
    // The last syntax in the list will be when all optional arguments are provided, or when the state array includes...
    // no falses. This is why the criteria for continuing the for loop is that at least one false remains.
    // After every iteration of the loop, the binary number [state array] is incremented by one by the flip_last_zero function.
    for (let _i; state.includes(false); flip_last_zero()) {
        let state_dependent_syntax = syntax_string;

        // Replace the parts that key off of whether the optional argument is provided, using the state
        for (let i = 0; i < optional_arguments.length; i++) {
            state_dependent_syntax = key_off(state_dependent_syntax, i, state[i])
        }
        
        // Replace the argument numbers with their descriptions
        for (let i = 0; i < command_arguments.length; i++) {
            state_dependent_syntax = state_dependent_syntax.replace(argument_identifier(i), `<${command_arguments[i].name}>`);
        }

        // Replace the prefix preholder
        state_dependent_syntax.replace("<prefix>", prefix_substitution)

        syntaxes.push(state_dependent_syntax)
    }

    return syntaxes;
}

export const INDENT = "    ";

export const make_simple_command_manual = function(manual: SimpleCommandManual, prefix_substitution: string): string {
    let syntaxes = generate_syntaxes(manual.arguments, manual.syntax, prefix_substitution);

    const syntax_accumulation = syntaxes.map((syntax, index) => {
        return `${indent}${(index + 1).toString()}. ${syntax}`
    }).join("\n")

    return manual.name + ":\n" + syntax_accumulation + "\n" + indent + "Description: " + manual.description 
}

export const indent = function(str: string): string {
    return str.split("\n").map(line => `${indent}${line}`).join("\n")
}

export const create_manual_entry = function(command_manual: CommandManual, prefix_substitution = GLOBAL_PREFIX): string | false {
    const type = get_type(command_manual)

    if (type === CommandManualType.Invalid) {
        return false
    }
    else if (type === CommandManualType.SimpleCommandManual) {
        return make_simple_command_manual(command_manual as SimpleCommandManual, prefix_substitution)
    }
    else if (type === CommandManualType.MultifacetedCommandManual) {
        let manual = command_manual as MultifacetedCommandManual
        const subcommand_list = `${manual.name} <${manual.subcommands.map(subcommand => subcommand.name).join("/")}>\n`
        let accumulator = subcommand_list;
        accumulator += manual.subcommands.map(subcommand => indent(make_simple_command_manual(subcommand, prefix_substitution))).join("\n") + "\n";
        accumulator += `${indent}Description: ${manual.description}`

        return accumulator;
    }
    else {
        return false
    }

}