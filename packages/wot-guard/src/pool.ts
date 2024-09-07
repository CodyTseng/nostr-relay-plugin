import { Filter, Event } from '@nostr-relay/common';
import { Relay } from './relay';

export class Pool {
  private relays: Relay[] = [];

  constructor(private urls: string[]) {}

  async init(): Promise<string[]> {
    if (this.relays.length) {
      this.relays.forEach(relay => relay.destroy());
      this.relays = [];
    }

    await Promise.allSettled(
      this.urls.map(async url => {
        const relay = new Relay(url);
        await relay.init();
        this.relays.push(relay);
      }),
    );

    return this.relays.map(relay => relay.url);
  }

  destroy(): void {
    this.relays.forEach(relay => relay.destroy());
    this.relays = [];
  }

  async fetchEvents(filter: Filter): Promise<Event[]> {
    const events: Event[] = [];

    await Promise.allSettled(
      this.relays.map(async relay => {
        const res = await relay.fetchEvents(filter);
        events.push(...res);
      }),
    );

    const eventIdSet = new Set<string>();
    const uniqueEvents: Event[] = [];
    events.forEach(event => {
      if (eventIdSet.has(event.id)) {
        return;
      }

      eventIdSet.add(event.id);
      uniqueEvents.push(event);
    });

    return uniqueEvents;
  }
}
