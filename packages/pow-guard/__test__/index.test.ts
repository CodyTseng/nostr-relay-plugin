import { PowGuard } from '../src';

describe('PowGuard', () => {
  const event = {
    id: '000006d8c378af1779d2feebc7603a125d99eca0ccf1085959b307f64e5dd358',
    pubkey: 'a48380f4cfcc1ad5378294fcac36439770f9c878dd880ffa94bb74ea54a6f243',
    created_at: 1651794653,
    kind: 1,
    tags: [['nonce', '776797', '20']],
    content: "It's just me mining my own business",
    sig: '284622fc0a3f4f1303455d5175f7ba962a3300d136085b9566801bc2e0699de0c7e31e44c81fb40ad9049173742e904713c3594a1da0fc5d2382a25c11aba977',
  };
  let guard: PowGuard;

  it('should return canHandle: true directly when minPowDifficulty is 0', () => {
    guard = new PowGuard(0);
    expect(guard.beforeHandleEvent(event)).toEqual({ canHandle: true });
  });

  it("should return canHandle: true when the event's difficulty is equal to the minPowDifficulty", () => {
    guard = new PowGuard(20);
    expect(guard.beforeHandleEvent(event)).toEqual({ canHandle: true });
  });

  it("should return canHandle: true when the event's difficulty is larger than the minPowDifficulty", () => {
    guard = new PowGuard(19);
    expect(guard.beforeHandleEvent(event)).toEqual({ canHandle: true });
  });

  it("should return canHandle: false when the event's difficulty is less than the minPowDifficulty", () => {
    guard = new PowGuard(22);
    expect(guard.beforeHandleEvent(event)).toEqual({
      canHandle: false,
      message: 'pow: difficulty 21 is less than 22',
    });
  });

  it('should return canHandle: true when the event does not have a nonce tag', () => {
    guard = new PowGuard(20);
    const eventWithoutNonce = { ...event, tags: [] };
    expect(guard.beforeHandleEvent(eventWithoutNonce)).toEqual({
      canHandle: true,
    });
  });

  it('should return canHandle: false when the nonce tag has a lower difficulty than minPowDifficulty', () => {
    guard = new PowGuard(20);
    const eventWithLowerNonce = { ...event, tags: [['nonce', '776797', '19']] };
    expect(guard.beforeHandleEvent(eventWithLowerNonce)).toEqual({
      canHandle: false,
      message: 'pow: difficulty 19 is less than 20',
    });
  });

  it('should return canHandle: false when the nonce tag has a NaN difficulty', () => {
    guard = new PowGuard(20);
    const eventWithNaNNonce = { ...event, tags: [['nonce', '776797', 'NaN']] };
    expect(guard.beforeHandleEvent(eventWithNaNNonce)).toEqual({
      canHandle: false,
      message: 'pow: difficulty NaN is less than 20',
    });
  });

  it('getter and setter should work', () => {
    const guard = new PowGuard(20);
    expect(guard.getMinPowDifficulty()).toBe(20);
    guard.setMinPowDifficulty(21);
    expect(guard.getMinPowDifficulty()).toBe(21);
  });
});
