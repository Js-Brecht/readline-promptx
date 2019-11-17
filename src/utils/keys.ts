import { Key } from 'readline';
import { IFilterKeys, IKeysList, IPrintList, IValidInputs, IKeyMatch } from '../model';
import { isPrintable } from './ansi';

export const getKeysList = (
    keys: IFilterKeys,
    oldValue?: IKeysList,
): IKeysList => {
    const curKeys: IKeysList = oldValue || [];
    const procKeys = keys instanceof Array ? keys : [keys];
    for (const key of procKeys) {
        if (key instanceof RegExp) {
            curKeys.push(key);
        } else if (typeof key === 'string') {
            curKeys.push(isPrintable(key) ? { name: key } : { sequence: key });
        } else if (typeof key === 'object') {
            curKeys.push(key);
        }
    }
    return curKeys;
};

export const getPrintCharList = (
    inputs: IValidInputs,
    oldValue?: IPrintList,
): IPrintList => {
    const curInputs: IPrintList = oldValue || [];
    const procInputs = inputs instanceof Array ? inputs : [inputs];
    for (const inp of procInputs) {
        if (inp instanceof RegExp || typeof inp === 'number') {
            curInputs.push((inp as any));
        } else if (inp instanceof Array && inp.length === 2) {
            let thisInp: [number, number] | undefined;
            if (inp.every((val: any) => typeof val === 'string')) {
                thisInp = ((inp as [string, string]).map((val) => val.charCodeAt(0)) as [number, number]);
            } else if (inp.every((val: any) => typeof val === 'number')) {
                thisInp = (inp as [number, number]);
            }
            if (thisInp) curInputs.push(thisInp);
        } else if (typeof inp === 'string') {
            curInputs.push(inp.charCodeAt(0));
        }
    }
    return curInputs;
};

export const keyMatches = (from: IKeyMatch, to: Key): boolean => {
    const altKeys = ['ctrl', 'meta', 'shift'];
    if (from instanceof RegExp) {
        if (to.sequence && from.test(to.sequence)) return true;
    } else {
        if (from.sequence && to.sequence && to.sequence === from.sequence) return true;
        if (from.name && to.name && to.name === from.name) {
            if (altKeys.every((prop) => !!(from as any)[prop] === !!(to as any)[prop]))
                return true;
        }
    }
    return false;
};
