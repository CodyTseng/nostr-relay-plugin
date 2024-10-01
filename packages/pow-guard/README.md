# Pow Guard

> A Proof of Work (PoW) guard plugin for [nostr-relay](https://github.com/CodyTseng/nostr-relay)

## Usage

### Install

```bash
npm install @nostr-relay/pow-guard
```

### Basic Usage

```typescript
import { PowGuard } from '@nostr-relay/pow-guard';

// Create a relay instance
// ...

const powGuard = new PowGuard(8); // 8 is the minimum difficulty

relay.register(powGuard);
```

### API

#### `getMinPowDifficulty()`

Get the minimum difficulty of the PoW guard.

#### `setMinPowDifficulty(difficulty: number)`

Set the minimum difficulty of the PoW guard.

## Donate

If you like this project, you can buy me a coffee :) ⚡️ codytseng@getalby.com ⚡️

## License

MIT
