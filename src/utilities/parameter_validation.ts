import { log, LogType } from "./log";
import { is_valid_Snowflake } from "./permissions";
import { is_string, is_number, is_boolean, safe_serialize } from "./typeutils";

export enum ParameterTypeCheckResult {
    InvalidParameterType, IncorrectType, InvalidValue, Correct
}

const UINT4 = 4294967296
const UINT8 = 18446744073709551616n

export enum ParamValueType {
    String = "string", // string
    Number = "number", // number
    Boolean = "boolean", // boolean
    NumberLike = "number, safe-sized BigInt, or number-convertible string", // number
    IntegerLike = "integer, safe-sized BigInt, or integer-convertible string", // number
    UnsignedIntegerLike = "positive integer, safe-sized BigInt, or likewise convertible string", // number
    Snowflake = "snowflake", // string
    UInt4S = "4-byte-limited string-represented positive integer", // number
    UInt4N = "4-byte-limited number-represented positive integer", // number
    UInt4Like = "4-byte-limited positive BigInt, safe-sized integer Number, or likewise convertible string", // number
    DateAsUInt4Like = "time since UNIX epoch in seconds represented by 4-byte-limited positive BigInt, safe-sized integer Number, or likewise convertible string",
    UInt8S = "8-byte-limited string-represented positive integer", // bigint
    UInt8B = "8-byte-limited positive BigInt", // bigint
    UInt8Like = "8-byte-limited positive BigInt, safe-sized integer Number, or likewise convertible string", // bigint
    BigInt = "BigInt", // bigint
    BigIntLike = "BigInt, safe-sized Integer Number, or BigInt convertible string", // bigint
    KingdomIndexS = "positive string-represented integer less than 19", // number
    KingdomIndexN = "positive number-represented integer less than 19" // number
}

export interface OptionalParamType {
    type: ParamValueType;
    accepts_null: boolean;
    accepts_undefined: boolean;
}

export type ParamType = ParamValueType | OptionalParamType

export interface NotRequiredCondition {
    property: string,
    equals: any
}

export interface Parameter {
    type: ParamType,
    name: string,
    not_required_condition?: NotRequiredCondition,
    must_equal?: any
}

enum ParamTypeValidationResult {
    Invalid = 0, Optional, Value
}

export type NormalizedParameterValue = string | number | boolean | bigint | Date | null

export interface ParameterValidationResult {
    type_check: ParameterTypeCheckResult;
    normalized_value?: NormalizedParameterValue
}

const is_ParamValueType = function (object?: unknown): object is ParamValueType {
    // @ts-expect-error
    return Object.values(ParamValueType).includes(object);
}

export const validate_ParamType = function (object?: unknown): ParamTypeValidationResult {
    if (typeof object !== "string") {
        if (typeof object !== "object") {
            return ParamTypeValidationResult.Invalid
        }
        else if (object === null || ("type" in object && "accepts_null" in object && "accepts_undefined") === false) {
            return ParamTypeValidationResult.Invalid
        }
        // @ts-expect-error
        else if (is_ParamValueType(object.type) && is_boolean(object.accepts_null) && is_boolean(object.accepts_undefined)) {
            return ParamTypeValidationResult.Optional
        }
        else {
            return ParamTypeValidationResult.Invalid
        }
    }
    else {
        if (is_ParamValueType(object)) {
            return ParamTypeValidationResult.Value
        }
        else {
            return ParamTypeValidationResult.Invalid
        }
    }
}

export const meets_not_required_condition = function(body: any, not_required_condition?: NotRequiredCondition) {
    if (not_required_condition instanceof Object === false || not_required_condition === undefined) {
        return false;
    }
    else {
        if (is_string(not_required_condition?.property)) {
            return body[not_required_condition.property] === not_required_condition.equals
        }
        else {
            return false
        }
    }
}

export const validate_parameter = function (property: unknown, type: ParamType): ParameterValidationResult {
    const type_classification = validate_ParamType(type);
    
    const value = (val: NormalizedParameterValue): ParameterValidationResult => { return { type_check: ParameterTypeCheckResult.Correct, normalized_value: val }}
    const bad_type: ParameterValidationResult = { type_check: ParameterTypeCheckResult.IncorrectType }
    const bad_value: ParameterValidationResult = { type_check: ParameterTypeCheckResult.InvalidValue }
    
    switch (type_classification) {
        case ParamTypeValidationResult.Invalid: {
            return { "type_check": ParameterTypeCheckResult.InvalidValue };
        }
        case ParamTypeValidationResult.Optional: {
            const optional_type = type as OptionalParamType;
            if (property === null) {
                if (optional_type.accepts_null) {
                    return value(null);
                }
                else {
                    return bad_type;
                }
            }
            else if (property === undefined) {
                if (optional_type.accepts_undefined) {
                    return value(null);
                }
                else {
                    return bad_type;
                }
            }
            else {
                return validate_parameter(property, optional_type.type);
            }
        }
        case ParamTypeValidationResult.Value: {
            const value_type = type as ParamValueType;

            switch (value_type) {
                case ParamValueType.Boolean: {
                    if (is_boolean(property)) return value(property);
                    else return bad_type;
                }
                case ParamValueType.String: {
                    if (is_string(property)) return value(property);
                    else return bad_type;
                }
                case ParamValueType.Snowflake: {
                    if (is_string(property) === false) return bad_type;
                    else if (is_valid_Snowflake(property)) return value((property as string).toString());
                    else return bad_value;
                }
                case ParamValueType.Number: {
                    if (is_number(property)) return value(property);
                    else return bad_type;
                }
                case ParamValueType.NumberLike: {
                    if (is_number(property)) return value(property);
                    else if (typeof property === "bigint") {
                        if (property <= Number.MAX_SAFE_INTEGER && property >= Number.MIN_SAFE_INTEGER) return value(Number(property));
                        else return bad_value;
                    }
                    else if (is_string(property)) {
                        const converted = Number(property);
                        if (isNaN(converted) === false && isFinite(converted)) return value(converted);
                        else return bad_value;
                    }
                    else return bad_type;
                }
                case ParamValueType.IntegerLike: {
                    if (is_number(property)) {
                        if (Number.isInteger(property)) return value(property);
                        else return bad_value;
                    }
                    else if (typeof property === "bigint") {
                        if (property <= Number.MAX_SAFE_INTEGER && property >= Number.MIN_SAFE_INTEGER) return value(Number(property));
                        else return bad_value;
                    }
                    else if (is_string(property)) {
                        const converted = Number(property);
                        if (Number.isInteger(converted)) return value(converted);
                        else return bad_value;
                    }
                    else return bad_type;
                }
                case ParamValueType.UnsignedIntegerLike: {
                    if (is_number(property)) {
                        if (Number.isSafeInteger(property) && property >= 0) return value(property);
                        else return bad_value;
                    }
                    else if (typeof property === "bigint") {
                        if (property >= 0n && property <= Number.MAX_SAFE_INTEGER) return value(Number(property));
                        else return bad_value;
                    }
                    else if (is_string(property)) {
                        const converted = Number(property);
                        if (Number.isSafeInteger(converted) && converted >= 0) return value(converted);
                        else return bad_value;
                    }
                    else return bad_type;
                }
                case ParamValueType.UInt4N: {
                    if (is_number(property)) {
                        if (Number.isInteger(property) && property >= 0 && property < UINT4) return value(property);
                        else return bad_value;
                    }
                    else return bad_type;
                }
                case ParamValueType.UInt4S: {
                    if (is_string(property)) {
                        const converted = Number(property);
                        if (Number.isInteger(converted) && converted >= 0 && converted < UINT4) return value(converted);
                        else return bad_value;
                    }
                    else return bad_type;
                }
                case ParamValueType.UInt4Like: {
                    if (is_number(property)) {
                        if (Number.isInteger(property) && property >= 0 && property < UINT4) return value(property);
                        else return bad_value;
                    }
                    else if (typeof property === "bigint") {
                        if (property <= UINT4 && property >= 0) return value(Number(property));
                        else return bad_value;
                    }
                    else if (is_string(property)) {
                        const converted = Number(property);
                        if (Number.isInteger(converted) && converted >= 0 && converted < UINT4) return value(converted);
                        else return bad_value;
                    }
                    else return bad_type;
                }
                case ParamValueType.DateAsUInt4Like: {
                    if (is_number(property)) {
                        if (Number.isInteger(property) && property >= 0 && property < UINT4) return value(new Date(property * 1000));
                        else return bad_value;
                    }
                    else if (typeof property === "bigint") {
                        if (property <= UINT4 && property >= 0) return value(new Date(Number(property) * 1000));
                        else return bad_value;
                    }
                    else if (is_string(property)) {
                        const converted = Number(property);
                        if (Number.isInteger(converted) && converted >= 0 && converted < UINT4) return value(new Date(converted * 1000));
                        else return bad_value;
                    }
                    else return bad_type;
                }
                case ParamValueType.UInt8S: {
                    if (is_string(property)) {
                        try {
                            const converted = BigInt(property);
                            if (converted >= 0n && converted < UINT8) return value(converted);
                            else return bad_value;
                        }
                        catch (err) {
                            return bad_value;
                        }
                    }
                    else return bad_type;
                }
                case ParamValueType.UInt8B: {
                    if (typeof property === "bigint") {
                        if ((property as bigint) >= 0n && (property as bigint) < UINT8) return value(property);
                        else return bad_value;
                    }
                    else return bad_type;
                }
                case ParamValueType.UInt8Like: {
                    if (typeof property === "bigint") {
                        if ((property as bigint) >= 0n && (property as bigint) < UINT8) return value(property);
                        else return bad_value;
                    }
                    else if (is_number(property)) {
                        if (Number.isSafeInteger(property) && property >= 0) return value(BigInt(property));
                        else return bad_value;
                    }
                    else if (is_string(property)) {
                        try {
                            const converted = BigInt(property);
                            if (converted >= 0n && converted < UINT8) return value(converted);
                            else return bad_value;
                        }
                        catch (err) {
                            return bad_value;
                        }
                    }
                    else return bad_type;
                }
                case ParamValueType.BigInt: {
                    if (typeof property === "bigint") return value(property);
                    else return bad_type;
                }
                case ParamValueType.BigIntLike: {
                    if (typeof property === "bigint") {
                        return value(property);
                    }
                    else if (is_number(property)) {
                        if (Number.isSafeInteger(property)) return value(BigInt(property));
                        else return bad_value;
                    }
                    else if (is_string(property)) {
                        try {
                            const converted = BigInt(property);
                            return value(converted);
                        }
                        catch (err) {
                            return bad_value;
                        }
                    }
                    else return bad_type;
                }
                case ParamValueType.KingdomIndexN: {
                    if (is_number(property)) {
                        if (Number.isInteger(property) && property < 19) return value(property);
                        else return bad_value;
                    }
                    else return bad_value;
                }
                case ParamValueType.KingdomIndexS: {
                    if (is_string(property)) {
                        const converted = Number(property);
                        if (Number.isInteger(converted) && converted < 19) return value(converted);
                        else return bad_value;
                    }
                    else return bad_value;
                }
                default: {
                    return { type_check: ParameterTypeCheckResult.InvalidParameterType }
                }
            }
        }
        default: {
            return { type_check: ParameterTypeCheckResult.InvalidParameterType }
        }
    }
}

/**
 * Returns the properties required if the object has all the proper requirements.
 * Returns false if the body does not meet the requirements or if there were none.
 * Logs the reasons it returned false also.
 * @param object The request object to check
 * @param properties The required properties the request must have
 */
 export const require_properties = function(object: any, function_name: string, ...properties: Parameter[]): Record<string, NormalizedParameterValue> | false {

    if (properties.length < 1) {
        return false;
    }
    else if (!object) {
        log(`require_properties: missing object entirely!`, LogType.Status)
        return false;
    }

    let has_all_required = true;

    let record: Record<string, NormalizedParameterValue> = {}

    for (const required_param of properties) {
        if (meets_not_required_condition(object, required_param.not_required_condition) === false) {
            if (!!required_param.must_equal && required_param.must_equal !== object[required_param.name]) {
                log(`${function_name}: require_properties - incorrect value for ${required_param.type} parameter ${required_param.name} - body does not have correct value.`, LogType.Status)
                has_all_required = false;
            }
            else if (!!required_param.must_equal && required_param.must_equal === object[required_param.name]) {
                record[required_param.name] = required_param.must_equal
            }
            else {
                const value = object[required_param.name]
                const result = validate_parameter(value, required_param.type);
                switch (result.type_check) {
                    case ParameterTypeCheckResult.Correct: {
                        if (result.normalized_value === undefined) {
                            log(`${function_name}: require_properties - validate_parameter - property ${required_param.name} gave out a ParameterValidationResult that indicated the type was correct, but passed undefined as the normalized value! Returning false.`, LogType.Mismatch);
                            return false;
                        }
                        else record[required_param.name] = result.normalized_value;
                        continue;
                    }
                    case ParameterTypeCheckResult.InvalidParameterType: {
                        log(`${function_name}: require_properties - property ${required_param.name} had an invalid type requirement! Returning false.`, LogType.Error);
                        return false;
                    }
                    case ParameterTypeCheckResult.IncorrectType: {
                        switch (validate_ParamType(required_param.type)) {
                            case ParamTypeValidationResult.Invalid: {
                                log(`${function_name}: require_properties - property ${required_param.name} had an invalid type requirement! Returning false.`, LogType.Error);
                                return false;
                            }
                            case ParamTypeValidationResult.Optional: {
                                // Spaghetti code but its ok
                                const accepts = [(required_param.type as OptionalParamType).accepts_null, (required_param.type as OptionalParamType).accepts_undefined].map((val, index) => val ? ["null", "undefined"][index] : false).filter(val => val !== false).join(" and ")
                                log(`${function_name}: require_properties - incorrect type for optional ${required_param.type} (also accepts ${accepts}) property of type ${required_param.type} named ${required_param.name} - got ${typeof value} from body`, LogType.Status);
                                has_all_required = false;
                                continue;
                            }
                            case ParamTypeValidationResult.Value: {
                                log(`${function_name}: require_properties - incorrect type for property of type ${required_param.type} named ${required_param.name} - got ${typeof value} from body`, LogType.Status);
                                has_all_required = false;
                                continue;
                            }
                        }
                    }
                    case ParameterTypeCheckResult.InvalidValue: {
                        switch (validate_ParamType(required_param.type)) {
                            case ParamTypeValidationResult.Invalid: {
                                log(`${function_name}: require_properties - property ${required_param.name} had an invalid type requirement! Returning false.`, LogType.Error);
                                return false;
                            }
                            case ParamTypeValidationResult.Optional: {
                                const accepts = [(required_param.type as OptionalParamType).accepts_null, (required_param.type as OptionalParamType).accepts_undefined].map((val, index) => val ? ["null", "undefined"][index] : false).filter(val => val !== false).join(" and ")
                                log(`${function_name}: require_properties - incorrect value for optional ${required_param.type} (also accepts ${accepts}) property ${required_param.name} - got ${safe_serialize(value)} from body`, LogType.Status);
                                has_all_required = false;
                                continue;
                            }
                            case ParamTypeValidationResult.Value: {
                                log(`${function_name}: require_properties - incorrect value for ${required_param.type} property ${required_param.name} - got ${safe_serialize(value)} from body`, LogType.Status);
                                has_all_required = false;
                                continue;
                            }
                        }
                    }
                }
            }
        }
        else {
            log(`${function_name}: require_properties - property ${required_param.name} of type ${required_param.type} may or may not have been present, but it is not required due to body meeting the not-required condition.`)
        }
    }

    if (has_all_required === false) {
        return false;
    }
    else {
        return record;
    }
}