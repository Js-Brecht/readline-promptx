import { EventEmitter } from 'events';
declare const assignmentCompatibilityHack: unique symbol;
type ListenerType<T> = [T] extends [(...args: infer U) => any]
    ? U
    : [T] extends [void] ? [] : [T];

export type InnerEEMethodReturnType<T, TValue, FValue> = T extends (
    ...args: any[]
) => any
    ? ReturnType<T> extends void | undefined ? FValue : TValue
    : FValue;

export type EEMethodReturnType<
    T,
    S extends string,
    TValue,
    FValue = void
> = S extends keyof T ? InnerEEMethodReturnType<T[S], TValue, FValue> : FValue;

export interface ExtendedEventEmitter<TEventRecord> {
    on<P extends keyof TEventRecord, T>(
        this: T,
        event: P,
        listener: (...args: ListenerType<TEventRecord[P]>) => void
    ): EEMethodReturnType<EventEmitter, 'on', T>;
    on(
        event: typeof assignmentCompatibilityHack,
        listener: (...args: any[]) => any
    ): void;

    addListener<P extends keyof TEventRecord, T>(
        this: T,
        event: P,
        listener: (...args: ListenerType<TEventRecord[P]>) => void
    ): EEMethodReturnType<EventEmitter, 'addListener', T>;
    addListener(
        event: typeof assignmentCompatibilityHack,
        listener: (...args: any[]) => any
    ): void;

    addEventListener<P extends keyof TEventRecord, T>(
        this: T,
        event: P,
        listener: (...args: ListenerType<TEventRecord[P]>) => void
    ): EEMethodReturnType<EventEmitter, 'addEventListener', T>;
    addEventListener(
        event: typeof assignmentCompatibilityHack,
        listener: (...args: any[]) => any
    ): void;

    removeListener<P extends keyof TEventRecord, T>(
        this: T,
        event: P,
        listener: (...args: any[]) => any
    ): EEMethodReturnType<EventEmitter, 'removeListener', T>;
    removeListener(
        event: typeof assignmentCompatibilityHack,
        listener: (...args: any[]) => any
    ): void;

    removeEventListener<P extends keyof TEventRecord, T>(
        this: T,
        event: P,
        listener: (...args: any[]) => any
    ): EEMethodReturnType<EventEmitter, 'removeEventListener', T>;
    removeEventListener(
        event: typeof assignmentCompatibilityHack,
        listener: (...args: any[]) => any
    ): void;

    once<P extends keyof TEventRecord, T>(
        this: T,
        event: P,
        listener: (...args: ListenerType<TEventRecord[P]>) => void
    ): EEMethodReturnType<EventEmitter, 'once', T>;
    once(
        event: typeof assignmentCompatibilityHack,
        listener: (...args: any[]) => any
    ): void;

    emit<P extends keyof TEventRecord, T>(
        this: T,
        event: P,
        ...args: ListenerType<TEventRecord[P]>
    ): EEMethodReturnType<EventEmitter, 'emit', T>;
    emit(event: typeof assignmentCompatibilityHack, ...args: any[]): void;
}

export class ExtendedEventEmitter<TEventRecord> extends EventEmitter { }
