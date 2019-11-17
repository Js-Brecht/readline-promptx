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
} from './model';

interface IRLInterfaceOpts {
    /** Printable characters that will be considered valid, and allowed to be
     * processed by `readline`.
     * * If this is an empty array, then no inputs will be considered valid.
     * * A numeric tuple ([number, number]) indicates a range of ascii decimal
     *   values that will be considered valid.
     * * A string tuple ([string, string]) will be converted to ascii decimal
     *   values, and processed as a range mentioned above
     * * A `RegExp` will be matched against the `key.sequence` of a
     *   `keypress` event.
     * * A single number will be matched against the `key.sequence`'s ascii
     *   decimal value.  A single string character will be converted to its decimal
     *   value, and compared the same
     */
    validInputs?: IValidInputs;
    /**
     * An array of keys that will be filtered out, so that they don't reach `readline`,
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
    filterKeys?: IFilterKeys;
    /**
     * An  array of keys that should be ignored by `readline`, but passed through
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
    ignoreKeys?: IIgnoreKeys;
    /** Constraints to put on input */
    inputLen?: {
        /** Once this many characters are reached, input will auto-submit */
        min?: number;
        /** `max`: Maximum characters that can be input */
        max?: number;
    };
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
