import { CreatedAtLimitGuard } from '../src';

describe('CreatedAtLimitGuard', () => {
  let guard: CreatedAtLimitGuard;

  beforeEach(() => {
    guard = new CreatedAtLimitGuard({
      upperLimit: 60,
      lowerLimit: 60,
    });
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should set options correctly', () => {
    guard.setOptions({
      upperLimit: 30,
      lowerLimit: 30,
    });
    expect(guard['options']).toEqual({
      upperLimit: 30,
      lowerLimit: 30,
    });
  });

  it('should return canHandle: true when created_at is within the limits', () => {
    const event = {
      created_at: now(),
    } as any;
    expect(guard.beforeHandleEvent(event)).toEqual({ canHandle: true });
  });

  it('should return canHandle: false when created_at is later than the upper limit', () => {
    const event = {
      created_at: now() + 61,
    } as any;
    expect(guard.beforeHandleEvent(event)).toEqual({
      canHandle: false,
      message:
        'invalid: created_at must not be later than 60 seconds from the current time',
    });
  });

  it('should return canHandle: false when created_at is earlier than the lower limit', () => {
    const event = {
      created_at: now() - 61,
    } as any;
    expect(guard.beforeHandleEvent(event)).toEqual({
      canHandle: false,
      message:
        'invalid: created_at must not be earlier than 60 seconds from the current time',
    });
  });
});

function now() {
  return Math.floor(Date.now() / 1000);
}
