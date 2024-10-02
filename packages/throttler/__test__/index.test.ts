import { MessageType } from '@nostr-relay/common';
import { Throttler } from '../src';

describe('Throttler', () => {
  let throttler: Throttler;

  beforeEach(() => {
    throttler = new Throttler({
      [MessageType.EVENT]: {
        ttl: 100,
        limit: 1,
        blockDuration: 100,
      },
      [MessageType.REQ]: {
        ttl: 100,
        limit: 1,
        blockDuration: 100,
      },
      [MessageType.AUTH]: {
        ttl: 100,
        limit: 1,
        blockDuration: 100,
      },
    });
  });

  afterEach(() => {
    throttler.destroy();
  });

  it('should be defined', () => {
    expect(throttler).toBeDefined();
  });

  it('should block the message if the limit is reached (EVENT)', async () => {
    const ctx = { ip: '::1', sendMessage: jest.fn() } as any;
    const msg = [MessageType.EVENT, {}] as any;
    const mockNext = jest.fn();

    await throttler.handleMessage(ctx, msg, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    expect(await throttler.handleMessage(ctx, msg, mockNext)).toEqual({
      messageType: MessageType.EVENT,
      success: false,
      message: 'rate-limited: slow down there chief',
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(ctx.sendMessage).toHaveBeenCalledTimes(1);

    await sleep(100);

    await throttler.handleMessage(ctx, msg, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);
  });

  it('should block the message if the limit is reached (AUTH)', async () => {
    const ctx = { ip: '::1' } as any;
    const msg = [MessageType.AUTH, {}] as any;
    const mockNext = jest.fn();

    await throttler.handleMessage(ctx, msg, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    expect(await throttler.handleMessage(ctx, msg, mockNext)).toEqual({
      messageType: MessageType.AUTH,
      success: false,
    });
    expect(mockNext).toHaveBeenCalledTimes(1);

    await sleep(100);

    await throttler.handleMessage(ctx, msg, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);
  });

  it('should block the message if the limit is reached (REQ)', async () => {
    const ctx = { ip: '::1', sendMessage: jest.fn() } as any;
    const msg = [MessageType.REQ, 'test', {}] as any;
    const mockNext = jest.fn();

    await throttler.handleMessage(ctx, msg, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    expect(await throttler.handleMessage(ctx, msg, mockNext)).toEqual({
      messageType: MessageType.REQ,
      events: [],
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(ctx.sendMessage).toHaveBeenCalledTimes(1);

    await sleep(100);

    await throttler.handleMessage(ctx, msg, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);
  });

  it('should return directly if the message type is not in the config', async () => {
    const ctx = { ip: '::1' } as any;
    const msg = [MessageType.CLOSE, 'test'] as any;
    const mockNext = jest.fn();

    await throttler.handleMessage(ctx, msg, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should refresh the limit after the ttl', async () => {
    const ctx = { ip: '::1', sendMessage: jest.fn() } as any;
    const msg = [MessageType.REQ, 'test', {}] as any;
    const mockNext = jest.fn();

    await throttler.handleMessage(ctx, msg, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    await sleep(100);

    await throttler.handleMessage(ctx, msg, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);
  });
});

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
