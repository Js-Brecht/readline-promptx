import { cursor, erase } from 'sisteransi';
import { lineCount, lastRowCol, getEmptyState, splitVTString } from './utils';
import { IInputPos, IState, IRenderState, IPlainState } from './model';
import { RLInterface } from './RLInterface';

/**
 * #### Description
 * A renderer that will optimize the output to the terminal socket, by
 * only drawing lines that have changed.
 * Current and previous output state are tracked using internal state,
 * in order to make comparisons, and determine if any row needs to be
 * drawn.
 *
 * If initialized with an RLInterface instance, that instance will
 * be used for tracking input cursor position.  When using an RLInterface in
 * tandem with this Renderer, collecting and processing user input will be handled
 * automatically, with all the power of `readline` extended with optimized
 * rendering, among other features that RLInterface provides.
 *
 * Text/data printing before/after an input/prompt row is supported.
 *
 * ---
 *
 * @class Renderer
 * @param {RLInterface} rlInterface Define this if you want to track input automatically,
 * using `readline` as the core.
 *
 * ---
 * #### Methods
 * * `print()`: The main entry point for consuming the features of this class.
 *              Draws desired text to the screen
 * * `registerInterface()`: Register an `RLInterface` instance for automatic
 *                          input handling.
 * * `hideCursor()`: Tell the Renderer that the cursor should not be shown, even
 *                   after rendering
 * * `showCursor()`: Reverse changes made by `hideCursor()`
 * * `restoreCursor()`: Restore the cursor to the input position
 */
export class Renderer {
    private rlInterface?: RLInterface;
    private out: NodeJS.WriteStream = process.stdout;
    /** Tracks whether this has rendered for the first time */
    private firstRender = true;
    /** Tracks how many rows the cursor will need to be moved from its current position
	 *  when a line is about to be rendered */
    private moveOffset?: number;
    /**
	 * The actual offset of the cursor, in relation to 0-index, at any given time
	 * This gets set in a couple of ways:
	 * * It's set to the inputPos.offsetY when `print()` is called
	 * * As lines are rendered, it is updated to the last row of the last line
	 * rendered
	 * * When the cursor position is "restored" (cursor moved to where it needs to appear
	 * in the input), this is set to the inputPos.offsetY.
	 */
    private cursorOffset = 0;
    private _cursor = 0;
    private cursorVisible = true;
    /** Tracks where the input line lands in comparison to the 0-index of the output */
    private inputPos: IInputPos = {
        /**
		 * * If cursor is handled automatically, this marks where the cursor was
		 * initially placed on the input row (using `cursor.save`), marking the end
		 * of the prompt and beginning of the input.
         *   * If being handled automatically, after the initial render, this does
         *     not change.
		 * * If not, this marks the position of the `cursor.save` character.
		 */
        X: 0,
        /** This marks the which row of the render state the input line lands on */
        Y: 0,
        /**
		 * This indicates what column on the screen the cursor needs to land on to be in the
		 * correct position for input.
		 */
        offsetX: 0,
        /**
		 * This indicates what row, offset from the first output row, the cursor needs to land on
		 * to be in the correct position for input
		 */
        offsetY: 0,
    };
    /** Keeps track of what the last render looked like */
    private prevState: IState = getEmptyState();
    /** Tracks the current rendering process */
    private curState: IState = getEmptyState();
    /** Gets set when the output from the current row, down, needs to be drawn.
	 * This can happen in a few instances:
	 * * When it's the first render
	 * * When the currently rendering row exceeds the number of previously rendered rows
     *   for this line in the state.
	 * * When the number of drawn rows (includes wrapped lines) has changed
	 * * When the input line has wrapped (number of drawn rows has changed).
	 */
    private drawAll = false;

    /**
     * @param {RLInterface} rlInterface This should be an instance of `RLInterface`.  If it is defined here,
     * then that instance will be used to track cursor input position.
     *
     * This can be done later, using `registerInterface()`
     */
    public constructor(rlInterface?: RLInterface) {
        this.out = process.stdout;
        if (rlInterface) {
            this.registerInterface(rlInterface);
        }
    }

    /**
     * Register an `RLInterface` class instance for automatic input handling
     * @param {RLInterface} rlInterface The RLInterface instance to register with this Renderer
     */
    public registerInterface(rlInterface: RLInterface): void {
        this.rlInterface = rlInterface;
        if (!rlInterface.hasRenderer(this))
            this.rlInterface.registerRenderer(this);
    }
    public hasInterface(rlInterface?: RLInterface): boolean {
        if (rlInterface) return rlInterface === this.rlInterface;
        return !!this.rlInterface;
    }

    /**
     * @private
     * Get the current cursor position
     * * If an `RLInterface` is registered, then its cursor position will be retrieved
     * * Otherwise, return the cursor pos saved by this class instance
     */
    private get cursor(): number {
        return this.rlInterface?.cursor || this._cursor;
    }
    /**
     * @private
     * Allow this class instance to save the cursor position, for drawing purposes
     *
     * * the X offset is relative to the beginning of the input string, not column 0,
     * so the length of the prompt should not included.
     * * This will be ignored if an `RLInterface` is registered
     * @param {number} x the X offset to set the cursor to
     */
    private set cursor(x: number) {
        if (this.rlInterface) return;
        this._cursor = x;
    }
    /**
     * Issues a `cursor.hide` command to the terminal, and remembers the
     * setting.
     * During drawing, the cursor will be turned off; if this is used, it
     * will not be turned back on at the end.
     */
    public hideCursor(): void {
        this.out.write(cursor.hide);
        this.cursorVisible = false;
    }
    /**
     * Issues a `cursor.show` command to the terminal.
     * During drawing, the cursor will be turned off; if this is used, it
     * will be turned back on after drawing is complete
     */
    public showCursor(): void {
        this.out.write(cursor.show);
        this.cursorVisible = true;
    }
    /**
     * @private
     * Returns the columns count for the current output stream.
     * If additional calculations need to be made to limit the output width,
     * they can be done here.
     */
    private get maxWidth(): number {
        return this.out.columns;
    }

    /**
     * Calculates where the cursor needs to land, considering a couple of factors
     * * The current row offset, which is determined by:
     *     * How many rows have been drawn,
     *     * What row of the input string the cursor needs to be positioned at
     *       (depends on how long the input string/if it has wrapped)
     * * The offset from position 0,0 of the drawn output.
     */
    private calcInputOffset(): void {
        const offsetX = this.inputPos.X + this.cursor;
        this.inputPos.offsetX = lastRowCol(offsetX);
        this.inputPos.offsetY = this.getOffsetFrom0(this.inputPos.Y - 1, offsetX);
        if (this.inputPos.offsetX === this.maxWidth) {
            this.inputPos.offsetX = 0;
            this.inputPos.offsetY += 1;
        }
    }

    /**
     * Moves the cursor to the row & column it needs to be for input.
     */
    public restoreCursor(): void {
        this.calcInputOffset();
        const offset = this.inputPos.offsetY - this.cursorOffset;
        this.out.write(cursor.move(0, offset) + cursor.to(this.inputPos.offsetX));
        this.cursorOffset = this.inputPos.offsetY;
    }

    /**
	 * Determines how many ACTUAL rows from the origin row (0 index) the desired
	 * index of the `curState` is, including line wrapping
	 * @param {number} idx The index of the current state to calculate offset for
     * @param {string | number} countOutput Additional output to count
     * @returns {number} The offset from 0 your chosen index + additional output
     * lands at
	 */
    private getOffsetFrom0(idx: number, countOutput?: string | number): number {
        let offset = 0;
        if (this.curState && this.curState.plain.length > 0) {
            const plainState = this.curState.plain;
            if (idx > plainState.length - 1) idx = plainState.length - 1;
            for (let x = 0; x <= idx; ++x) {
                offset += this.curState.plain[x][0];
            }
        }
        if (countOutput) offset += (lineCount(countOutput) - 1);
        return offset;
    }

    /**
	 * This will drop the cursor down to the last row, last column, of the
	 * output, and then issue a CLEAR-END-OF-SCREEN ANSI code.
	 */
    private clearAfterEnd(): void {
        const lastIdx = this.curState.virtualRows;
        const lastRow = this.curState.actualRows;
        const lastLineCol = lastRowCol(this.curState.plain[lastIdx][1].length);
        // const offset = (lastRow - 1) - this.cursorOffset;
        const offset = this.cursorOffset - (lastRow + 1);
        // if (offset !== 0) this.out.write();
        this.out.write(
            cursor.move(0, offset) +
            cursor.to(lastLineCol) +
            erase.down(1) +
            '\n',
        );
    }

    /**
     * Process & `sprintf()` a pre-styled text blob
     *
     * ---
     * Notes on cursor positioning:
     *
     * * If an RLInterface is registered, it will be used to determine the cursor position
     * * Otherwise, the cursor position can be determined one of two ways
     *   * Manually, by marking the position in the string using `\x1B7` (cursor.save)
     *   * By tracking the cursor position manually, and passing it in as `cursorPos`.
     *
     *
     * * If you define `cursorPos`, it will be used as an X+ offset from the `cursor.save` position.
     * * If there is no `cursor.save`, then this function will not know where the input string is,
     *   which will cause the cursor to be placed at the last known input position
     *   (If it was never set before, then the cursor will be returned to 0,0, relative to the first printed line)
     * ---
     * @param {string} data The text to draw to screen
     * @param {number} cursorPos If this class instance does not have a registered
     * RLInterface, then `cursorPos` can be used to indicate where the cursor should
     * land in the input string.
     */
    public print(data: string, cursorPos?: number): void {
        const renderLines = data.split('\n');
        this.curState = getEmptyState();
        this.cursorOffset = this.inputPos.offsetY;
        if (cursorPos !== undefined) this.cursor = cursorPos;

        if (this.cursorVisible) this.out.write(cursor.hide);
        for (const [idx, ln] of renderLines.entries()) {
            const [plain, rendered, cursorX] = splitVTString(ln, !!this.rlInterface, this.maxWidth);
            if (cursorX > -1 && (!this.rlInterface || this.firstRender)) {
                this.inputPos = {
                    X: plain[1].length,
                    Y: idx,
                    offsetX: 0,
                    offsetY: 0,
                };
            }
            this.curState.plain[idx] = plain;
            this.curState.render[idx] = rendered;
            this.curState.virtualRows += 1;
            this.curState.actualRows += plain[0];
            this.sprintf(plain, rendered);
        }
        // Clear to the end of the screen, if we haven't rendered
        // past the end of the previous output
        if (this.curState.actualRows < this.prevState.actualRows)
            this.clearAfterEnd();

        // Reset the input cursor to where it needs to be
        this.restoreCursor();
        if (this.cursorVisible) this.out.write(cursor.show);

        // Reset some variables for next run
        this.firstRender = false;
        this.prevState = this.curState;
        this.moveOffset = undefined;
    }

    /**
	 * Spool Print Formatted - Spool output into state, and selectively draw formatted
	 * output to screen.
	 * @param {IPlainState} plain The plain text representation of the rendered output
	 * @param {IRenderState} render The styled/formatted text to draw
     * @returns {void}
	 */
    private sprintf(plain: IPlainState, render: IRenderState): void | any {
        const idx = this.curState.virtualRows;
        if (this.moveOffset === undefined) this.moveOffset = -this.inputPos.offsetY;
        if (this.inputPos.Y === idx) this.calcInputOffset();

        if (this.prevState.plain[idx] && this.prevState.plain[idx][0] !== plain[0])
            this.drawAll = true;
        const drawLine = this.drawAll ||
            idx > this.prevState.virtualRows ||
            this.prevState.render[idx] !== render;

        // If not drawing this line, then track the number of output rows the cursor
        // will need to be moved to draw the next line that does need to be drawn
        if (!drawLine) return this.moveOffset += plain[0];

        if (drawLine) {
            this.out.write(
                cursor.move(0, this.moveOffset) + cursor.to(0) +
                render +
                erase.lineEnd +
                '\n',
            );
            // Set cursorOffset to match where the moveOffset caused drawing to occur
            if (this.moveOffset !== 0) this.cursorOffset += this.moveOffset;
            // Account for extra rows, due to wrapping in the output
            this.cursorOffset += plain[0] - 1;
            // Account for the new line at the end
            this.cursorOffset += 1;
            this.moveOffset = 0;
        }
    }

}

export default Renderer;
