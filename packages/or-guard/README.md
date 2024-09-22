# Or Guard

An OR operator guard plugin. The OR operator guard plugin is a security guard plugin that allows multiple guards to be combined with the OR operator. If any of the guards pass, the OR operator guard plugin will pass.

## Usage

### Install

```bash
npm install @nostr-relay/or-guard
```

### Basic Usage

```typescript
import { OrGuard } from '@nostr-relay/or-guard';

// Create a relay instance
// ...

const orGuard = new OrGuard(guard1, guard2, guard3);

relay.register(orGuard);
```

## Donate

If you like this project, you can buy me a coffee :) ⚡️ codytseng@getalby.com ⚡️

## License

MIT
