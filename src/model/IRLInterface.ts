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
 * See {@link IPrintTypes} and {@link @IPrintTypeTuples} for more detail
 */
export type IValidInputs = IPrintTypes | (IPrintTypes | IPrintTypeTuples)[];
/**
 * Valid types for matching Key inputs
 */
export type IKeyTypes = string | Key | RegExp;
/** See {@link IKeyTypes} for more detail */
export type IFilterKeys = IKeyTypes | IKeyTypes[];
/** See {@link IKeyTypes} for more detail */
export type IIgnoreKeys = IKeyTypes | IKeyTypes[];
/** Constraints to put on input */
export type IInputLen = {
    /** If defined: Once this many characters are reached, input will auto-submit */
    min?: number;
    /** If defined: Total characters that can be input before it will stop accepting more */
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
