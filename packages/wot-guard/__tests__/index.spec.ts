import { WotGuard } from '../src';

describe('wot-guard', () => {
  let wotGuard: WotGuard;

  beforeEach(() => {
    wotGuard = new WotGuard({
      trustAnchorPubkey: 'pubkey',
      trustDepth: 2,
    });
  });

  afterEach(() => {
    wotGuard.destroy();
  });

  it('should be defined', () => {
    expect(wotGuard).toBeDefined();
    expect(wotGuard['trustAnchorPubkey']).toBe('pubkey');
    expect(wotGuard['trustDepth']).toBe(2);
  });

  it('should init and destroy', async () => {
    const mockRefreshTrustedPubkeySet = jest
      .spyOn(wotGuard as any, 'refreshTrustedPubkeySet')
      .mockResolvedValue(undefined);

    await wotGuard.init();

    expect(mockRefreshTrustedPubkeySet).toHaveBeenCalledTimes(1);
    expect(wotGuard['intervalId']).not.toBeNull();

    wotGuard['trustedPubkeySet'].add('friend1');
    wotGuard['trustedPubkeySet'].add('friend2');

    await wotGuard.destroy();

    expect(wotGuard['intervalId']).toBeNull();
    expect(wotGuard['trustedPubkeySet'].size).toBe(0);
  });

  describe('handleMessage', () => {
    it('should return next if not EVENT message', async () => {
      const next = () => Promise.resolve('test' as any);
      const ctx = {} as any;

      const result = await wotGuard.handleMessage(
        ctx,
        ['REQ', 'test', {}],
        next,
      );

      expect(result).toBe('test');
    });

    it('should return next if the event is matched with skipFilters', async () => {
      const next = () => Promise.resolve('test' as any);
      const ctx = {} as any;

      wotGuard['skipFilters'] = [{ kinds: [2333] }];

      const result = await wotGuard.handleMessage(
        ctx,
        ['EVENT', { kind: 2333 } as any],
        next,
      );

      expect(result).toBe('test');
    });

    it('should return next if pubkey is trusted', async () => {
      const next = () => Promise.resolve('test' as any);
      const ctx = {} as any;

      wotGuard['trustedPubkeySet'].add('friend1');

      const result = await wotGuard.handleMessage(
        ctx,
        ['EVENT', { pubkey: 'friend1' } as any],
        next,
      );

      expect(result).toBe('test');
    });

    it('should block if pubkey is not trusted', async () => {
      const next = () => Promise.resolve('test' as any);
      const ctx = { sendMessage: jest.fn() } as any;

      const result = await wotGuard.handleMessage(
        ctx,
        ['EVENT', { id: 'testId', pubkey: 'stranger' } as any],
        next,
      );

      expect(result).toEqual({
        messageType: 'EVENT',
        success: false,
        message: 'block: you are not in the trusted public keys list',
      });
      expect(ctx.sendMessage).toHaveBeenCalledWith([
        'OK',
        'testId',
        false,
        'block: you are not in the trusted public keys list',
      ]);
    });
  });
});
