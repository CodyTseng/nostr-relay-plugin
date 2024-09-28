import {
  BeforeHandleEventPlugin,
  BeforeHandleEventResult,
  Event,
} from '@nostr-relay/common';

export class PowGuard implements BeforeHandleEventPlugin {
  constructor(private minPowDifficulty: number) {}

  beforeHandleEvent(event: Event): BeforeHandleEventResult {
    const difficulty = countPowDifficulty(event.id);
    if (difficulty < this.minPowDifficulty) {
      return {
        canHandle: false,
        message: `pow: difficulty ${difficulty} is less than ${this.minPowDifficulty}`,
      };
    }
    return { canHandle: true };
  }
}

function zeroBits(b: number): number {
  let n = 0;

  if (b == 0) {
    return 8;
  }

  while ((b >>= 1)) {
    n++;
  }

  return 7 - n;
}

function countPowDifficulty(hexStr: string): number {
  const buf = Buffer.from(hexStr, 'hex');
  let bits = 0,
    total = 0;

  for (let i = 0; i < buf.length; i++) {
    bits = zeroBits(buf[i]);
    total += bits;

    if (bits != 8) {
      break;
    }
  }

  return total;
}
