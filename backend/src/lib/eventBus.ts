import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

import type { RealtimeEvent, RealtimeEventPayloadMap, RealtimeEventType } from "@shared";

type EventListener<TType extends RealtimeEventType> = (event: RealtimeEvent<TType>) => void;
type AnyEventListener = (event: RealtimeEvent) => void;

class AppEventBus {
  private readonly emitter = new EventEmitter();

  emit<TType extends RealtimeEventType>(
    type: TType,
    payload: RealtimeEventPayloadMap[TType]
  ): RealtimeEvent<TType> {
    const event: RealtimeEvent<TType> = {
      id: randomUUID(),
      type,
      createdAt: new Date().toISOString(),
      payload
    };

    this.emitter.emit(type, event);
    this.emitter.emit("*", event);
    return event;
  }

  on<TType extends RealtimeEventType>(type: TType, listener: EventListener<TType>): () => void {
    this.emitter.on(type, listener);
    return () => {
      this.emitter.off(type, listener);
    };
  }

  onAny(listener: AnyEventListener): () => void {
    this.emitter.on("*", listener);
    return () => {
      this.emitter.off("*", listener);
    };
  }
}

const globalForEventBus = globalThis as { closingDayEventBus?: AppEventBus };

export const eventBus = globalForEventBus.closingDayEventBus ?? new AppEventBus();

if (!globalForEventBus.closingDayEventBus) {
  globalForEventBus.closingDayEventBus = eventBus;
}
