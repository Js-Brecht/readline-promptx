import { Key, Interface, createInterface, emitKeypressEvents } from 'readline';
import { Renderer } from './Renderer';
import { beep, cursor } from 'sisteransi';
import {
    isPrintable,
    getKeysList,
    getPrintCharList,
    BypassStream,
    keyMatches,
} from './utils';
import {
    IValidInputs,
    IFilterKeys,
    IEvents,
    ExtendedEventEmitter,
    IIgnoreKeys,
    IKeysList,
    IPrintList,
    IInputLen,
} from './model';

interface IRLInterfaceOpts {
    /**
     * See {@link IValidInputs} for details
     */
    validInputs?: IValidInputs;
    /**
     * See {@link IFilterKeys} for details
     */
    filterKeys?: IFilterKeys;
    /**
     * See {@link IIgnoreKeys} for details
     */
    ignoreKeys?: IIgnoreKeys;
    /** See {@link IInputLen} for details */
    inputLen?: IInputLen;
}

export class RLInterface extends ExtendedEventEmitter<IEvents> {
    private rl: Interface;
    private readonly stdout = process.stdout;
    private readonly stdin = process.stdin;
    private readonly readStream = new BypassStream();

    private _paused = false;
    private _renderer?: Renderer;

    private validInput?: IPrintList;
    private filterKeys?: IKeysList;
    private ignoreKeys?: IKeysList;
    public constructor(stdin?: NodeJS.ReadStream, opts?: IRLInterfaceOpts) {
        super();
        if (stdin) this.stdin = stdin;

        if (!this.stdin.isTTY) {
            throw new Error('Input stream must be a TTY!');
        }

        if (opts) {
            if (opts.validInputs) this.validInput = getPrintCharList(opts.validInputs);
            if (opts.filterKeys) this.filterKeys = getKeysList(opts.filterKeys);
            if (opts.ignoreKeys) this.ignoreKeys = getKeysList(opts.ignoreKeys);
        }

        this.rl = createInterface({
            input: this.readStream,
            terminal: true,
        });

        const wasRaw = this.stdin.isRaw;
        this.stdin.setRawMode(true);
        emitKeypressEvents(this.stdin, this.rl);

        this.handleKeypress = this.handleKeypress.bind(this);
        this.stdin.on('keypress', this.handleKeypress);

        this.rl.on('line', (d) => {
            this.value = d;
            this.emit('submit', d);
        });
        this.rl.once('close', () => {
            this.stdin.setRawMode(wasRaw);
            this.stdin.removeListener('keypress', this.handleKeypress);
            this.rl.removeAllListeners();
        });

    }
    private handleKeypress(chr: any, key: Key): void {
        if (this._paused) return;
        const oldCursor = this.cursor;
        const oldValue = this.value;
        if (this.validInput && isPrintable(key.sequence)) {
            if (!this.isValid(key.sequence)) return this.ding();
        }
        if (this.filterKeys) {
            if (this.hasMatchingKey(this.filterKeys, key)) return this.ding();
        }
        if (!this.ignoreKeys || !this.hasMatchingKey(this.ignoreKeys, key)) {
            this.readStream.emit('keypress', chr, key);
        }
        this.emit('keypress', chr, key);
        if (oldValue !== this.value) this.emit('change', this.value);
        if (oldCursor !== this.cursor) {
            if (this._renderer) this._renderer.restoreCursor();
            this.emit('cursor', this.cursor);
        }
    }
    public pause(): this {
        this._paused = true;
        this.stdin.pause();
        return this;
    }
    public resume(): this {
        this._paused = false;
        this.stdin.resume();
        return this;
    }
    public close(): void {
        this.rl.close();
        this.emit('close');
        this.removeAllListeners();
    }
    public isPaused(): boolean {
        return this._paused;
    }

    public get cursor(): number {
        return this.rl.cursor;
    }
    public hideCursor(): void {
        if (this._renderer) return this._renderer.hideCursor();
        this.stdout.write(cursor.show);
    }
    public showCursor(): void {
        if (this._renderer) return this._renderer.showCursor();
        this.stdout.write(cursor.show);
    }
    public ding(): void {
        this.stdout.write(beep);
    }

    public get value(): string {
        return this.rl.line;
    }
    public set value(newVal: string) {
        this.rl.line = newVal;
        this.rl.cursor = this.value.length;
        this.emit('change', newVal);
    }
    public reset(): void {
        this.value = '';
    }
    public get inputLen(): number {
        return this.value.length;
    }

    public registerRenderer(newRenderer: Renderer): void {
        this._renderer = newRenderer;
        if (!newRenderer.hasInterface(this))
            newRenderer.registerInterface(this);
    }
    public hasRenderer(renderer?: Renderer): boolean {
        if (renderer) return this._renderer === renderer;
        return !!this._renderer;
    }

    private isValid(chr?: string): boolean {
        if (!this.validInput || chr === undefined) return true;
        // We're not going to check non-printable characters against valid inputs
        if (!isPrintable(chr)) return true;
        const code = chr.charCodeAt(0);
        for (const inputCheck of this.validInput) {
            if (inputCheck instanceof RegExp && inputCheck.test(chr)) return true;
            if (inputCheck instanceof Array) {
                if (code >= inputCheck[0] && code <= inputCheck[1]) return true;
            }
            if (typeof inputCheck === 'number' && code === inputCheck) return true;
        }
        return false;
    }
    private hasMatchingKey(keyList: IKeysList, key: Key): boolean {
        if (!keyList || keyList.length === 0) return false;
        for (const keyCheck of keyList) {
            if (keyMatches(keyCheck, key)) return true;
        }
        return false;
    }
}

export default RLInterface;
