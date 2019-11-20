/** @hidden
 * Return the line count if the desired output, including the number of lines it wraps and
 * newlines
 * @param {string | number } msg The output to count lines for.  If a number is specified, then it will be
 * assumed that that is the length of the output string.
 * @param {number} maxLineWidth The total number of columns of the terminal output.  Can be overridden
 * if text is wrapping inside of a smaller block
 * @returns {number} The number of lines the current `msg` occupies.
 */
export function lineCount(msg: string | number, maxLineWidth = process.stdout.columns): number {
    if (typeof msg === 'number') {
        if (!maxLineWidth) return 1;
        return Math.ceil(msg > 0 ? msg / maxLineWidth : 1);
    }
    const msgLines = msg.split(/\r?\n/);

    if (!maxLineWidth) return msgLines.length;
    return msgLines.map((l) => lineCount(l.length, maxLineWidth))
        .reduce((a, b) => a + b);
}

/** @hidden
 * Get the column position of the last character on the last row of the desired output.  If a number
 * is specified as the output, it will be assumed that is the length of the output, and calculations
 * will be based on it.
 * @param {string | number} output The desired output string or length.
 * @param {number} maxLineWidth The desired width to base calculations on
 * @returns {number} The column that the last characters lands on for the defined output.
 */
export function lastRowCol(output: string | number, maxLineWidth = process.stdout.columns): number {
    const chkLen = typeof output === 'number' ? output : output.length;
    if (!maxLineWidth) return chkLen;
    return chkLen - (maxLineWidth * (lineCount(chkLen, maxLineWidth) - 1));
}

export default lines;
