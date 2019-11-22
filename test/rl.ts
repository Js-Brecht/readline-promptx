import readline, { Key } from 'readline';
import { Writable } from 'stream';
import { cursor, erase } from 'sisteransi';
import printf from 'printf';
// const pattern = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/;

const esc = '\x1B';
const csi = `${esc}[`;
const term = {
    clear: () => { process.stdout.write(erase.screen); },
    setScroll: (start = 0, end = process.stdout.rows) => {
        process.stdout.write(printf(`${csi}%d%sr`, start, end < process.stdout.rows ? printf(';%d', end) : ''));
    },
    reset: () => {
        process.stdout.write(`${csi}!p`);
    },
};
const debugOutput = (key: string | Key): void => {
    process.stdout.write(
        cursor.save +
        cursor.to(0, process.stdout.rows - 2) +
        JSON.stringify(key) + '\n' +
        //eslint-disable-next-line @typescript-eslint/no-use-before-define
        (rl as any).line +
        erase.lineEnd + '\n' +
        cursor.restore,
    );
};

term.clear();
term.setScroll(process.stdout.rows - 2);

class CustomWrite extends Writable {
    private lines: string[];
    private line: string;
    constructor() {
        super();
        this.on('line', (val: string) => {
            console.log(`line: ${val}`);
            debugOutput(`line: ${val}`);
        });
        this.lines = [];
        this.line = '';
    }
    private newLine(val: string): void {
        this.lines.push(val);
        this.line = '';
        this.emit('line', val);
    }
    public _write(chunk: Buffer, enc: string, next: () => void): void {
        // debugOutput(chunk.toString());
        const data = chunk.toString().split(/\r?\n/);
        if (data.length === 1) {
            this.line += data[0];
            debugOutput(this.line);
        } else {
            for (const [i, l] of data.entries()) {
                if (i === 0) {
                    this.line += l;
                    this.newLine(this.line);
                } else if (i < data.length - 1) {
                    this.newLine(l);
                } else if (i === data.length - 1) {
                    this.line = l;
                }
            }
        }
        next();
    }
    public get isTTY(): boolean { return true; }
}

const rl = readline.createInterface(process.stdin, new CustomWrite());

rl.setPrompt('Test input: ');
rl.prompt();

// process.stdin.on('keypress', (c, k) => {
//     debugOutput(k);
// });
// rl.on('line', () => {
// rl.output.write('I was here!!! \n skdfjadgjasglj \n!kjlweqjkl1\n');
// });
rl.on('close', () => {
    process.exit(0);
});
rl.on('SIGINT', () => {
    console.log('SIGINT');
    rl.close();
});
process.on('exit', () => {
    term.reset();
});
