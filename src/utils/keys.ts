import { Key } from 'readline';
import { IFilterKeys, IKeysList, IPrintList, IValidInputs, IKeyMatch } from '../model';
import { isPrintable } from './ansi';

/** @hidden
 * Process a collection of [[IFilterKeys]], and turn it into a [[IKeysList]], so that it
 * can be used internally
 * @param {IFilterKeys} keys The list of [[IFilterKeys]] to process; generally received from
 * the consumer of this package.
 * @param {IKeysList} oldValue The original [[IKeysList]].  If defined, the processed
 * collection will be appended.
 * @returns {IKeysList} The processed collection
 */
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

/** @hidden
 * Process a collection of [[IValidInputs]] and returns it as a [[IPrintList]] so that it
 * can be used internally
 * @param {IValidInputs} inputs The collection of [[IValidInputs]] to process.  Generally received
 * from the consumer of this package.
 * @param {IPrintList} oldValue The original [[IPrintList]].  If defined, the new processed collection
 * will be appended.
 * @returns {IPrintList} The processed collection
 */
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

/** @hidden
 * Takes an input type `Key` (from `readline`) and tries to match it against a stored [[IKeyMatch]]
 * @param {IKeyMatch} from The internally stored value from an [[IKeysList]]
 * @param {Key} to The `Key` from `readline` to match against
 * @returns {boolean} Does `from` match `to`?
 */
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
