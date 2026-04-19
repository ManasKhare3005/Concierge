import type { RealtimeEventPayloadMap, RealtimeEventType } from "@shared";

import { eventBus } from "../../lib/eventBus";

export function emitRealtimeEvent<TType extends RealtimeEventType>(
  type: TType,
  payload: RealtimeEventPayloadMap[TType]
): void {
  eventBus.emit(type, payload);
}
