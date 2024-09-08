import {
  ClientContext,
  ConsoleLoggerService,
  Event,
  EventRepository,
  EventUtils,
  Filter,
  HandleMessagePlugin,
  HandleMessageResult,
  IncomingMessage,
  Logger,
  MessageType,
  Pubkey,
} from '@nostr-relay/common';
import { Observable } from 'rxjs';
import { Pool } from './pool';

export type WotGuardOptions = {
  trustAnchorPubkey: Pubkey;
  trustDepth: number;
  enabled?: boolean;
  refreshInterval?: number;
  logger?: Logger;
  eventRepository?: EventRepository;
  relayUrls?: string[];
  skipFilters?: Filter[];
};

export class WotGuard implements HandleMessagePlugin {
  private readonly logger: Logger;
  private readonly eventRepository?: EventRepository;
  private enabled: boolean;
  private trustAnchorPubkey: Pubkey;
  private trustDepth: number;
  private refreshInterval: number;
  private relayUrls: string[];
  private skipFilters: Filter[];
  private intervalId: NodeJS.Timeout | null = null;
  private trustedPubkeySet = new Set<string>();

  constructor({
    trustAnchorPubkey,
    trustDepth,
    enabled,
    refreshInterval,
    logger,
    eventRepository,
    relayUrls,
    skipFilters,
  }: WotGuardOptions) {
    this.trustAnchorPubkey = trustAnchorPubkey;
    this.trustDepth = Math.min(trustDepth, 2); // maximum trust depth is 2 now
    this.enabled = enabled ?? true;
    this.logger = logger ?? new ConsoleLoggerService();
    this.eventRepository = eventRepository;
    this.relayUrls = relayUrls ?? [];
    this.skipFilters = skipFilters ?? [];
    this.refreshInterval = refreshInterval ?? 60 * 60 * 1000; // 1 hour by default
  }

  async init(): Promise<void> {
    await this.refreshTrustedPubkeySet();
    this.intervalId = setInterval(
      () => this.refreshTrustedPubkeySet(),
      this.refreshInterval,
    );
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.trustedPubkeySet.clear();
  }

  async handleMessage(
    ctx: ClientContext,
    message: IncomingMessage,
    next: () => Promise<HandleMessageResult>,
  ): Promise<HandleMessageResult> {
    if (!this.enabled) {
      return next();
    }

    // Only check EVENT messages
    if (message[0] !== MessageType.EVENT) {
      return next();
    }

    const event = message[1];
    if (
      this.skipFilters.some(filter =>
        EventUtils.isMatchingFilter(event, filter),
      ) ||
      this.trustedPubkeySet.has(event.pubkey)
    ) {
      return next();
    }

    const msg = 'block: you are not in the trusted public keys list';
    ctx.sendMessage([MessageType.OK, event.id, false, msg]);
    return {
      messageType: MessageType.EVENT,
      success: false,
      message: msg,
    };
  }

  private async refreshTrustedPubkeySet(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const start = Date.now();
    this.logger.info('Refreshing trusted pubkey set...');
    // Initialize a set to store pubkeys within the specified trust depth
    const newTrustedPubkeySet = new Set<Pubkey>([this.trustAnchorPubkey]);

    // Start with the trust anchor as the current depth users
    let currentDepthPubkeySet = newTrustedPubkeySet;

    // Initialize the pool of relays
    const pool = new Pool(this.relayUrls);
    const connectedRelayUrls = await pool.init();
    this.logger.info(`Connected to relays: ${connectedRelayUrls.join(', ')}`);

    // Iterate through each level of depth up to the specified trust depth
    for (let depth = 0; depth < this.trustDepth; depth++) {
      const nextDepthPubkeySet = await this.fetchNextDepthPubkeySet(
        pool,
        currentDepthPubkeySet,
      );

      // Update the set of pubkeys within the specified depth
      nextDepthPubkeySet.forEach(user => newTrustedPubkeySet.add(user));

      // TODO: if the depth more than 2, we need to filter out the duplicated pubkeys
      currentDepthPubkeySet = nextDepthPubkeySet; // Move to the next depth
    }

    pool.destroy();

    // Update the trusted pubkey set
    const oldTrustedPubkeySet = this.trustedPubkeySet;
    this.trustedPubkeySet = newTrustedPubkeySet;
    oldTrustedPubkeySet.clear();

    this.logger.info(
      `Trusted pubkey set updated: ${newTrustedPubkeySet.size} pubkeys, took ${Date.now() - start}ms`,
    );
  }

  private async fetchNextDepthPubkeySet(
    pool: Pool,
    currentDepthPubkeySet: Set<Pubkey>,
  ): Promise<Set<Pubkey>> {
    const nextDepthPubkeySet = new Set<Pubkey>();

    const chunks: Pubkey[][] = [];
    let chunk: Pubkey[] = [];
    for (const pubkey of currentDepthPubkeySet) {
      chunk.push(pubkey);
      if (chunk.length === 100) {
        chunks.push(chunk);
        chunk = [];
      }
    }
    if (chunk.length > 0) {
      chunks.push(chunk);
      chunk = [];
    }

    await Promise.allSettled(
      chunks.map(async authors => {
        const map = new Map<
          Pubkey,
          { following: Pubkey[]; created_at: number }
        >();

        const filter = {
          kinds: [3],
          authors,
        };
        const [eventsFromLocal, events] = await Promise.all([
          this.fetchEventFromLocal(filter),
          pool.fetchEvents(filter),
        ]);
        eventsFromLocal.concat(events).forEach(event => {
          const author = event.pubkey;
          const following = event.tags
            .map(([tagName, tagValue]) => {
              if (tagName !== 'p') return null;
              return /^[0-9a-f]{64}$/.test(tagValue) ? tagValue : null;
            })
            .filter(Boolean) as Pubkey[];

          const exists = map.get(author);
          if (exists && exists.created_at > event.created_at) return;

          map.set(author, { following, created_at: event.created_at });
        });

        for (const [, { following }] of map) {
          following.forEach(pubkey => nextDepthPubkeySet.add(pubkey));
        }
      }),
    );
    return nextDepthPubkeySet;
  }

  private async fetchEventFromLocal(filter: Filter): Promise<Event[]> {
    if (!this.eventRepository) {
      return [];
    }
    const events = await this.eventRepository.find(filter);
    if (events instanceof Observable) {
      return await new Promise<Event[]>((resolve, reject) => {
        const result: Event[] = [];
        events.subscribe({
          next: event => result.push(event),
          error: reject,
          complete: () => resolve(result),
        });
      });
    }
    return events;
  }
}
