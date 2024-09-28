# CreatedAt Limit Guard

> A created_at limit guard plugin for [nostr-relay](https://github.com/CodyTseng/nostr-relay)

## Usage

### Install

```bash
npm install @nostr-relay/created-at-limit-guard
```

### Basic Usage

```typescript
import { CreatedAtLimitGuard } from '@nostr-relay/created-at-limit-guard';

// Create a relay instance
// ...

const createdAtLimitGuard = new CreatedAtLimitGuard({
  upperLimit: 60, // 60 seconds
});

relay.register(createdAtLimitGuard);
```

### Options

- `upperLimit`: The upper limit of the created_at field in seconds.
- `lowerLimit`: The lower limit of the created_at field in seconds.

## Donate

If you like this project, you can buy me a coffee :) ⚡️ codytseng@getalby.com ⚡️

## License

MIT
