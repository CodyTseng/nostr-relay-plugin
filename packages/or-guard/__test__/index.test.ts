import { OrGuard } from '../src';

describe('OrGuard', () => {
  let guard: OrGuard;

  beforeEach(() => {
    guard = new OrGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return canHandle: true when any of the guards return canHandle: true', async () => {
    const guard1 = {
      beforeHandleEvent: jest.fn().mockResolvedValue({ canHandle: false }),
    };
    const guard2 = {
      beforeHandleEvent: jest.fn().mockResolvedValue({ canHandle: true }),
    };
    guard.addGuard(guard1);
    guard.addGuard(guard2);

    const event = {} as any;
    expect(await guard.beforeHandleEvent(event)).toEqual({ canHandle: true });
    expect(guard1.beforeHandleEvent).toHaveBeenCalledWith(event);
    expect(guard2.beforeHandleEvent).toHaveBeenCalledWith(event);
  });

  it('should return canHandle: false when all guards return canHandle: false', async () => {
    const guard1 = {
      beforeHandleEvent: jest.fn().mockResolvedValue({ canHandle: false }),
    };
    const guard2 = {
      beforeHandleEvent: jest.fn().mockResolvedValue({ canHandle: false }),
    };
    guard.addGuard(guard1);
    guard.addGuard(guard2);

    const event = {} as any;
    expect(await guard.beforeHandleEvent(event)).toEqual({ canHandle: false });
    expect(guard1.beforeHandleEvent).toHaveBeenCalledWith(event);
    expect(guard2.beforeHandleEvent).toHaveBeenCalledWith(event);
  });
});
