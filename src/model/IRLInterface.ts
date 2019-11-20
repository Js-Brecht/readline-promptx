import { Key } from 'readline';

/**
 * Valid, single value types for matching printable characters
 */
export type IPrintTypes = string | number | RegExp;
/**
 * Valid, tuple type ranges for matching printable characters
 */
export type IPrintTypeTuples = [string, string] | [number, number];
/**
 * Printable characters that will be considered valid, and allowed to be
 * processed by `readline`.
 *
 * ---
 *
 * * Can be a single value, but any tuples should be enclosed in an array
 *   * e.g. [[32, 126]] = allow all printable characters
 * * If this is an empty array, then no inputs will be considered valid.
 * * A numeric tuple ([number, number]) indicates a range of ascii character
 *   decimal values that will be considered valid.
 * * A string tuple's ([string, string]) members will be converted to their ascii
 *   decimal equivalents, and processed as a range mentioned above
 * * A `RegExp` will be matched against the `key.sequence` of a
 *   `keypress` event's parameter.
 * * A single number will be matched against the `key.sequence`'s ascii
 *   decimal value.  A single string character will be converted to its decimal
 *   value, and compared the same
 */
export type IValidInputs = IPrintTypes | (IPrintTypes | IPrintTypeTuples)[];
/**
 * Valid types for matching Key inputs
 */
export type IKeyTypes = string | Key | RegExp;
/**
 * A collection of keys that will be filtered out, so that they don't reach `readline`
 * or any classes listening for the emitted `keypress` events.
 * * `RegExp` values will be matched against `key.sequence`.
 * * string values will be matched against `key.name`
 *   (e.g. 'delete', 'backspace', 'left', 'right', etc...)
 * * `Key` types are the same as what are emitted by `keypress` events.
 *   * If `key.sequence` is defined and it matches, then no other properties are
 *     checked.
 *   * If `key.name` is defined, and it matches, then `ctrl`, `alt`, and `meta` will
 *     also be checked to ensure they all evaluate to the same boolean value
 */
export type IFilterKeys = IKeyTypes | IKeyTypes[];
/**
 * A collection of keys that should be ignored by `readline`, but passed through
 * to listeners.
 * * `RegExp` values will be matched against `key.sequence`.
 * * string values will be matched against `key.name`
 *   (e.g. 'delete', 'backspace', 'left', 'right', etc...)
 * * `Key` types are the same as what are emitted by `keypress` events.
 *   * If `key.sequence` is defined and it matches, then no other properties are
 *     checked.
 *   * If `key.name` is defined, and it matches, then `ctrl`, `alt`, and `meta` will
 *     also be checked to ensure they all evaluate to the same boolean value
 */
export type IIgnoreKeys = IKeyTypes | IKeyTypes[];
/** Constraints to put on input */
export type IInputLen = {
    /** If defined: Once this many characters are reached, input will auto-submit */
    min?: number;
    /** If defined: Maximum characters that can be input */
    max?: number;

}

export interface IEvents {
    submit: (value: string) => void;
    change: (value: string) => void;
    keypress: (chr: string, key: Key) => void;
    cursor: (curPos: number) => void;
    close: () => void;
}

/** @hidden */
export type IKeyMatch = RegExp | Key;
/** @hidden */
export type IKeysList = IKeyMatch[];
/** @hidden */
export type IPrintMatch = [number, number] | number | RegExp;
/** @hidden */
export type IPrintList = IPrintMatch[];

// These are not exposed in @types/node.  Readline is stable;
// PR submitted for @types/node/readline update
// See issue https://github.com/nodejs/node/issues/30347
// and PR https://github.com/DefinitelyTyped/DefinitelyTyped/pull/40513
/** @hidden */
declare module 'readline' {
    interface Interface {
        line: string;
        cursor: number;
    }
}
