# WoT Guard

> A Web of Trust (WoT) security guard plugin for [nostr-relay](https://github.com/CodyTseng/nostr-relay)

## Usage

### Install

```bash
npm install @nostr-relay/wot-guard
```

### Basic Usage

```typescript
import { WotGuard } from '@nostr-relay/wot-guard';

// Create a relay instance
// ...

const wotGuard = new WotGuard({
  trustAnchorPubkey:
    '0000000000000000000000000000000000000000000000000000000000000000',
  trustDepth: 2,
  eventRepository,
});

relay.register(wotGuard);
```

### Options

- `trustAnchorPubkey`: (Required) The trust anchor public key in hex string.
- `trustDepth`: (Required) The depth of the Web of Trust. 1 means trust anchor and anchor's following, 2 means trust anchor, anchor's following, and anchor's following's following. The maximum depth is 2 for now.
- `refreshInterval`: The interval to refresh the trust graph in milliseconds. Default is 3600000 (1 hour).
- `enabled`: Enable or disable the plugin. Default is `true`.
- `eventRepository`: The event repository instance. It is the same as the one passed to `NostrRelay`. The plugin will find following events from the repository if you provide it.
- `relayUrls`: The relay URLs to fetch the following events. If you provide it, the plugin will fetch the following events from the relay URLs.
- `skipFilters`: An filter array. The events that match the skip filters can skip the WoT guard.
- `logger`: Custom logger instance.

> Note: The `eventRepository` and `relayUrls` can be provided together. And you must provide at least one of them.

## TODO

- [ ] Add tests
- [ ] Improve the algorithm to build the trust graph

## Donate

If you like this project, you can buy me a coffee :) ⚡️ codytseng@getalby.com ⚡️

## License

MIT
