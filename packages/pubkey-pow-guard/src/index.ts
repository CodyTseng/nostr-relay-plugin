import {
  BeforeHandleEventPlugin,
  BeforeHandleEventResult,
  Event,
} from '@nostr-relay/common';

export class PubkeyPowGuard implements BeforeHandleEventPlugin {
  private difficulty: number;

  constructor(difficulty: number) {
    this.difficulty = difficulty;
  }

  setDifficulty(difficulty: number) {
    this.difficulty = difficulty;
  }

  getDifficulty() {
    return this.difficulty;
  }

  beforeHandleEvent(event: Event): BeforeHandleEventResult {
    if (this.difficulty <= 0) {
      return { canHandle: true };
    }

    const difficulty = countPowDifficulty(event.pubkey);
    if (difficulty < this.difficulty) {
      return {
        canHandle: false,
        message: 'pubkey pow difficulty is too low',
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
