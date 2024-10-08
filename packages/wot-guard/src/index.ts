import {
  BeforeHandleEventPlugin,
  BeforeHandleEventResult,
  ConsoleLoggerService,
  Event,
  EventRepository,
  EventUtils,
  Filter,
  Logger,
  Pubkey,
} from '@nostr-relay/common';
import { Agent } from 'http';
import { Observable } from 'rxjs';
import { Pool } from './pool';

export type WotGuardOptions = {
  enabled?: boolean;
  trustAnchorPubkey?: Pubkey;
  trustDepth?: number;
  logger?: Logger;
  eventRepository?: EventRepository;
  relayUrls?: string[];
  skipFilters?: Filter[];
  agent?: Agent;
};

export class WotGuard implements BeforeHandleEventPlugin {
  private readonly logger: Logger;
  private readonly eventRepository?: EventRepository;
  private enabled: boolean;
  private trustAnchorPubkey?: Pubkey;
  private trustDepth: number;
  private relayUrls: string[];
  private skipFilters: Filter[];
  private intervalId: NodeJS.Timeout | null = null;
  private trustedPubkeySet = new Set<string>();
  private lastRefreshedAt = 0;
  private agent?: Agent;

  constructor({
    trustAnchorPubkey,
    trustDepth,
    enabled,
    logger,
    eventRepository,
    relayUrls,
    skipFilters,
    agent,
  }: WotGuardOptions) {
    this.enabled = enabled ?? true;
    if (this.enabled && !trustAnchorPubkey) {
      throw new Error('trustAnchorPubkey is required to enable WotGuard');
    }

    this.trustAnchorPubkey = trustAnchorPubkey;
    this.trustDepth = trustDepth ? Math.min(trustDepth, 2) : 1; // maximum trust depth is 2 now
    this.logger = logger ?? new ConsoleLoggerService();
    this.eventRepository = eventRepository;
    this.relayUrls = relayUrls ?? [];
    this.skipFilters = skipFilters ?? [];
    this.agent = agent;
  }

  async init(): Promise<void> {
    await this.refreshTrustedPubkeySet();
  }

  setEnabled(enabled: boolean): void {
    if (!this.trustAnchorPubkey) {
      throw new Error('trustAnchorPubkey is required to enable WotGuard');
    }
    this.enabled = enabled;
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  setTrustAnchorPubkey(pubkey: Pubkey): void {
    this.trustAnchorPubkey = pubkey;
  }

  setTrustDepth(depth: number): void {
    this.trustDepth = Math.min(depth, 2);
  }

  setAgent(agent: Agent): void {
    this.agent = agent;
  }

  getLastRefreshedAt(): number {
    return this.lastRefreshedAt;
  }

  getTrustedPubkeyCount(): number {
    return this.trustedPubkeySet.size;
  }

  checkPubkey(pubkey: Pubkey): boolean {
    return this.trustedPubkeySet.has(pubkey);
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.trustedPubkeySet.clear();
  }

  beforeHandleEvent(event: Event): BeforeHandleEventResult {
    if (
      !this.enabled ||
      this.skipFilters.some(filter =>
        EventUtils.isMatchingFilter(event, filter),
      ) ||
      this.trustedPubkeySet.has(event.pubkey)
    ) {
      return { canHandle: true };
    }

    return {
      canHandle: false,
      message: 'block: you are not in the trusted public keys list',
    };
  }

  async refreshTrustedPubkeySet(): Promise<void> {
    if (!this.enabled || !this.trustAnchorPubkey) {
      return;
    }

    const start = Date.now();
    this.logger.info('Refreshing trusted pubkey set...');
    // Initialize a set to store pubkeys within the specified trust depth
    const newTrustedPubkeySet = new Set<Pubkey>([this.trustAnchorPubkey]);

    // Start with the trust anchor as the current depth users
    let currentDepthPubkeySet = newTrustedPubkeySet;

    // Initialize the pool of relays
    const pool = new Pool(this.relayUrls, { agent: this.agent });
    const connectedRelayUrls = await pool.init();
    this.logger.info(
      `Connected to relays: ${connectedRelayUrls.length ? connectedRelayUrls.join(', ') : 'none'}`,
    );

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
    this.lastRefreshedAt = Date.now();
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
