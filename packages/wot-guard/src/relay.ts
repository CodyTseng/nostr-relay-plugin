import { Event, EventUtils, Filter } from '@nostr-relay/common';
import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';

export class Relay {
  url: string;

  private client: WebSocket | null = null;
  private reqJob = new Map<
    string,
    {
      eventCb: (event: Event) => void;
      eoseCb: () => void;
    }
  >();

  constructor(url: string) {
    this.url = url;
  }

  async init(): Promise<void> {
    if (this.client) {
      return;
    }

    const client = new WebSocket(this.url, {
      timeout: 3000,
    });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Failed to connect to ${this.url}`));
      }, 3000);

      client.on('open', () => {
        clearTimeout(timeout);
        this.client = client;
        resolve();
      });

      client.on('message', (data: string) => {
        this.handleMessage(data);
      });

      client.on('error', err => {
        console.error(err);
      });
    });
  }

  destroy(): void {
    if (this.client) {
      if (this.client.readyState === 1) {
        this.client.terminate();
      }
      this.client = null;
    }
    this.reqJob.clear();
  }

  private handleMessage(data: string): void {
    const [type, ...rest] = JSON.parse(data);
    if (type === 'EVENT') {
      const [subId, event] = rest;
      const job = this.reqJob.get(subId);
      if (job) {
        const isInvalid = !!EventUtils.validate(event);
        if (isInvalid) return;

        job.eventCb(event);
      }
    } else if (type === 'EOSE') {
      const [subId] = rest;
      const job = this.reqJob.get(subId);
      if (job) {
        job.eoseCb();
      }
    }
  }

  async fetchEvents(filter: Filter): Promise<Event[]> {
    if (!this.client || this.client.readyState !== 1) {
      return [];
    }

    return new Promise<any[]>(resolve => {
      const subId = randomUUID();
      const events: Event[] = [];
      const timeout = setTimeout(() => {
        this.reqJob.delete(subId);
        resolve(events);
      }, 5000);

      this.reqJob.set(subId, {
        eventCb: (event: Event) => {
          events.push(event);
        },
        eoseCb: () => {
          this.reqJob.delete(subId);
          clearTimeout(timeout);
          resolve(events);
        },
      });

      this.client!.send(JSON.stringify(['REQ', subId, filter]));
    });
  }
}
