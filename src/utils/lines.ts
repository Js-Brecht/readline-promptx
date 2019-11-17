export function lineCount(msg: string | number, perLine = process.stdout.columns): number {
    if (typeof msg === 'number') {
        if (!perLine) return 1;
        return Math.ceil(msg > 0 ? msg / perLine : 1);
    }
    const msgLines = msg.split(/\r?\n/);

    if (!perLine) return msgLines.length;
    return msgLines.map((l) => lineCount(l.length, perLine))
        .reduce((a, b) => a + b);
}

export function lastRowCol(output: string | number, perLine = process.stdout.columns): number {
    const chkLen = typeof output === 'number' ? output : output.length;
    if (!perLine) return chkLen;
    return chkLen - (perLine * (lineCount(chkLen, perLine) - 1));
}

export default lines;
