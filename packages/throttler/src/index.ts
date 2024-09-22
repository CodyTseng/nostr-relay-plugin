import {
  ClientContext,
  createOutgoingClosedMessage,
  createOutgoingOkMessage,
  HandleMessagePlugin,
  HandleMessageResult,
  IncomingMessage,
  MessageType,
} from '@nostr-relay/common';

type StorageOptions = {
  totalHits: number;
  expiresAt: number;
  isBlocked: boolean;
  blockExpiresAt: number;
};

export type ThrottlerConfig = {
  ttl: number;
  limit: number;
  blockDuration: number;
};

export class Throttler implements HandleMessagePlugin {
  private readonly storage = new Map<string, StorageOptions>();
  private intervalId: NodeJS.Timeout;

  constructor(
    private readonly config: Record<MessageType, ThrottlerConfig | undefined>,
  ) {
    this.intervalId = setInterval(
      () => {
        const now = Date.now();
        for (const [key, storage] of this.storage) {
          if (storage.isBlocked && storage.blockExpiresAt > now) {
            continue;
          }
          if (storage.expiresAt < now) {
            this.storage.delete(key);
          }
        }
      },
      1000 * 60, // 1 minutes
    );
  }

  async handleMessage(
    ctx: ClientContext,
    message: IncomingMessage,
    next: () => Promise<HandleMessageResult>,
  ): Promise<HandleMessageResult> {
    const ip = ctx.ip;
    const messageType = message[0];
    const config = this.config[messageType];
    if (!config) {
      return next();
    }

    const key = `${ip}:${messageType}`;
    const storage = this.increase(
      key,
      config.ttl,
      config.limit,
      config.blockDuration,
    );
    if (!storage.isBlocked) {
      return next();
    }

    const msg = 'rate-limited: slow down there chief';
    if (messageType === MessageType.EVENT) {
      const [, event] = message;
      ctx.sendMessage(createOutgoingOkMessage(event.id, false, msg));
      return {
        messageType: MessageType.EVENT,
        success: false,
        message: msg,
      };
    }
    if (messageType === MessageType.REQ) {
      const [, subId] = message;
      ctx.sendMessage(createOutgoingClosedMessage(subId, msg));
      return {
        messageType: MessageType.REQ,
        events: [],
      };
    }
    return {
      messageType,
      success: false,
    };
  }

  increase(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): StorageOptions {
    const storage = this.storage.get(key);
    if (!storage) {
      const newStorage = {
        totalHits: 1,
        expiresAt: Date.now() + ttl,
        isBlocked: false,
        blockExpiresAt: 0,
      };

      this.storage.set(key, newStorage);
      return newStorage;
    }

    if (storage.isBlocked) {
      if (Date.now() > storage.blockExpiresAt) {
        storage.isBlocked = false;
        storage.totalHits = 1;
        storage.expiresAt = Date.now() + ttl;
        storage.blockExpiresAt = 0;
      }
      return storage;
    }

    if (storage.expiresAt < Date.now()) {
      storage.totalHits = 1;
      storage.expiresAt = Date.now() + ttl;
      return storage;
    }

    storage.totalHits += 1;
    if (storage.totalHits > limit) {
      storage.isBlocked = true;
      storage.blockExpiresAt = Date.now() + blockDuration;
    }
    return storage;
  }

  destroy(): void {
    clearInterval(this.intervalId);
  }
}
