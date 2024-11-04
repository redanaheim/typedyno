import * as Chalk from "chalk";

export enum LogType {
    None,
    Status,
    Error,
    Success,
    System,
    Mismatch,
    Incompatibility,
    FixedError,
    PromiseRejection
}

export const chalkify = function(message: string, color: LogType): string {
    switch (color) {
        case LogType.Error:
            return Chalk.red(message)
            break;
        case LogType.Success:
            return Chalk.green(message)
            break;
        case LogType.System:
            return Chalk.blue(message);
            break;
        case LogType.Mismatch:
            return Chalk.magenta(message);
            break;
        case LogType.None:
            return message;
            break;
        case LogType.Status:
            return Chalk.yellow(message);
            break;
        case LogType.Incompatibility:
            return Chalk.gray(message)
            break;
        case LogType.FixedError:
            return Chalk.cyan(message);
            break;
        case LogType.PromiseRejection:
            return Chalk.redBright(message);
            break;
    }
}

export const get_timestamp = function(): string {
    let date = new Date()
    return `(${date.getDate().toString()}/${(date.getMonth() + 1).toString()}/${date.getFullYear().toString()} ${date.getHours().toString()}:${date.getMinutes().toString()}) `
}

export const log = function (message: string, type: LogType = LogType.None, no_timestamp: boolean = false) {
    let timestamp = "";
    if (no_timestamp === false) {
        timestamp = get_timestamp() + " ";
    }

    console.log(timestamp + chalkify(message, type));
}