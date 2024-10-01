import { PubkeyPowGuard } from '../src';

describe('PubkeyPowGuard', () => {
  it('should return canHandle: true directly when minPowDifficulty is 0', () => {
    const guard = new PubkeyPowGuard(0);
    const event = {} as any;
    expect(guard.beforeHandleEvent(event)).toEqual({ canHandle: true });
  });

  it("should return canHandle: true when the event's difficulty is equal to the minPowDifficulty", () => {
    const guard = new PubkeyPowGuard(21);
    const event = {
      pubkey:
        '000006d8c378af1779d2feebc7603a125d99eca0ccf1085959b307f64e5dd358',
    } as any;
    expect(guard.beforeHandleEvent(event)).toEqual({ canHandle: true });
  });

  it("should return canHandle: true when the event's difficulty is larger than the minPowDifficulty", () => {
    const guard = new PubkeyPowGuard(19);
    const event = {
      pubkey:
        '000006d8c378af1779d2feebc7603a125d99eca0ccf1085959b307f64e5dd358',
    } as any;
    expect(guard.beforeHandleEvent(event)).toEqual({ canHandle: true });
  });

  it("should return canHandle: false when the event's difficulty is less than the minPowDifficulty", () => {
    const guard = new PubkeyPowGuard(22);
    const event = {
      pubkey:
        '000006d8c378af1779d2feebc7603a125d99eca0ccf1085959b307f64e5dd358',
    } as any;
    expect(guard.beforeHandleEvent(event)).toEqual({
      canHandle: false,
      message: 'pubkey pow difficulty is too low',
    });
  });

  it('getter and setter should work', () => {
    const guard = new PubkeyPowGuard(20);
    expect(guard.getDifficulty()).toBe(20);
    guard.setDifficulty(21);
    expect(guard.getDifficulty()).toBe(21);
  });
});
