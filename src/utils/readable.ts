import { EventEmitter } from 'events';

export class BypassStream extends EventEmitter implements NodeJS.ReadableStream {
    private _paused = false;

    public pause(): this {
        this._paused = true;
        return this;
    }
    public isPaused(): boolean {
        return this._paused;
    }
    public resume(): this {
        this._paused = false;
        return this;
    }
    public get readable(): boolean {
        return this._paused;
    }
    public read(): string {
        this.resume();
        return '';
    }
    public setEncoding(encoding: string): this {
        return this;
    }
    public unshift(chunk: string | Uint8Array, encoding?: BufferEncoding): void {
        return;
    }
    public pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T {
        throw new Error('Stream pipes are not supported!');
    }
    public unpipe(destination?: NodeJS.WritableStream): this {
        throw new Error('Stream pipes are not supported!');
    }
    public wrap(oldStream: NodeJS.ReadableStream): this {
        throw new Error('Stream wrapping is not supported!');
    }

    public [Symbol.asyncIterator](): AsyncIterableIterator<string> {
        const iterator: AsyncIterableIterator<string> = {
            [Symbol.asyncIterator]: () => iterator,
            next: () => new Promise((resolve) => resolve({done: true, value: undefined })),
        };
        return iterator;
    }

}
