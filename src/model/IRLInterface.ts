import { Key } from 'readline';

export type IPrintTypes = string | number | [string, string] | [number, number] | RegExp;
export type IValidInputs = IPrintTypes | IPrintTypes[];
export type IKeyTypes = string | Key | RegExp;
export type IFilterKeys = IKeyTypes | IKeyTypes[];
export type IIgnoreKeys = IKeyTypes | IKeyTypes[];

export interface IEvents {
    submit: (value: string) => void;
    change: (value: string) => void;
    keypress: (chr: string, key: Key) => void;
    cursor: (curPos: number) => void;
    close: () => void;
}

export type IKeyMatch = RegExp | Key;
export type IKeysList = IKeyMatch[];
export type IPrintMatch = [number, number] | number | RegExp;
export type IPrintList = IPrintMatch[];

// These are not exposed in @types/node.  Readline is stable;
// PR submitted for @types/node/readline update
// See issue https://github.com/nodejs/node/issues/30347
// and PR https://github.com/DefinitelyTyped/DefinitelyTyped/pull/40513
declare module 'readline' {
    interface Interface {
        line: string;
        cursor: number;
    }
}
