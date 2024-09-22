# Pubkey PoW Guard

A public key proof-of-work guard plugin.

## Usage

### Install

```bash
npm install @nostr-relay/pubkey-pow-guard
```

### Basic Usage

```typescript
import { PubkeyPowGuard } from '@nostr-relay/pubkey-pow-guard';

// Create a relay instance
// ...

const pubkeyPowGuard = new PubkeyPowGuard(8);

relay.register(pubkeyPowGuard);
```

### Parameters

- `difficulty`: (Required) The difficulty of the proof-of-work. The difficulty is the number of leading zeros in the hash of the public key.

## Donate

If you like this project, you can buy me a coffee :) ⚡️ codytseng@getalby.com ⚡️

## License

MIT
