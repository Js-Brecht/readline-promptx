import { IPlainState, IRenderState } from '../model';
import { lastRowCol, lineCount } from './lines';

/** @hidden
 * Determines if the `chr` parameter is a printable character
 * @param {string | number} chr The string, or ascii decimal value, representation of a character
 * @returns {boolean} Is the character printable?
 */
export function isPrintable(chr?: string | number): boolean {
    const code = chr === undefined ?
        0 :
        typeof chr === 'string' ?
            chr.charCodeAt(0) :
            chr;
    return code >= 32 && code <= 126;
}

/** @hidden */
// eslint-disable-next-line no-control-regex
export const ansiPattern = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqrsuy=><]/;

/** @hidden
 * This will split the defined `procText` into pieces; specifically, the plain text representation, the rendered
 * text representation, and the cursor positioning (if found).
 * @param {string} procText The text to process
 * @param {string} preWrapInput Wrap the input line, if it exceeds `maxWidth`?
 * @param {number} maxWidth The maximum width to count lines/wrap text based on
 * @returns {[IPlainState, IRenderState, number]} The input data split into plain text, rendered text,
 * and the determined input cursor position.  Cursor position will be -1 if not found on this line.
 */
export const splitVTString = (
    procText: string,
    preWrapInput = false,
    maxWidth = process.stdout.columns,
): [IPlainState, IRenderState, number] => {
    let cursorX = -1;
    let matched: RegExpExecArray | null;
    let rendered: IRenderState = '';
    const plain: IPlainState = [1, ''];
    // Parse the ANSI codes on each line of input
    while (null !== (matched = ansiPattern.exec(procText))) {
        const ansiCode = matched[0];
        const terminator = ansiCode[ansiCode.length - 1];
        const startIdx = matched.index;
        const endIdx = startIdx + ansiCode.length;
        if (startIdx > 0) {
            const procTextSect = procText.slice(0, startIdx);
            plain[1] += procTextSect;
            rendered += procTextSect;
        }
        // Only allow ANSI style codes to feed into the output
        if (terminator === 'm') rendered += ansiCode;
        // Process cursor input position
        if (terminator === '7' || terminator === 's') {
            cursorX = plain[1].length;
        }
        procText = procText.slice(endIdx);
    }
    plain[1] += procText;
    rendered += procText;
    if (preWrapInput && cursorX > -1 && lastRowCol(plain[1]) === maxWidth) {
        plain[1] += '\n';
    }
    plain[0] = lineCount(plain[1]);
    return [plain, rendered, cursorX];
};
