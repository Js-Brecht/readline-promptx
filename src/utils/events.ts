import { IEventRegister, IEventList } from '../model';

export class EventEmitterX<
    EventRegister extends IEventRegister,
    EventKey extends string & keyof EventRegister = string & keyof EventRegister,
    EventListener extends EventRegister[EventKey] = EventRegister[EventKey],
> {
    private eventList: IEventList = {};
    private singleEventList: IEventList = {};

    public on(event: EventKey, listener: EventListener): this {
        this.eventList[event].push(listener);
        return this;
    }
    public addListener = this.on;
    public addEventListener = this.on;

    public once(event: EventKey, listener: EventListener): this {
        this.singleEventList[event].push(listener);
        return this;
    }

    public off(event: EventKey, listener: EventListener): this {
        this.eventList[event] = this.eventList[event].filter((fn) => fn !== listener);
        return this;
    }
    public removeListener = this.off;
    public removeEventListener = this.off;
    public removeAllListeners(): this {
        this.eventList = {};
        this.singleEventList = {};
        return this;
    }

    public emit(event: EventKey)
}
