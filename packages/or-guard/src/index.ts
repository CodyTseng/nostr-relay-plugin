import {
  BeforeHandleEventPlugin,
  BeforeHandleEventResult,
  Event,
} from '@nostr-relay/common';

export class OrGuard implements BeforeHandleEventPlugin {
  private readonly guards: BeforeHandleEventPlugin[];

  constructor(...guards: BeforeHandleEventPlugin[]) {
    this.guards = guards;
  }

  addGuard(guard: BeforeHandleEventPlugin) {
    this.guards.push(guard);
  }

  async beforeHandleEvent(event: Event): Promise<BeforeHandleEventResult> {
    let result: BeforeHandleEventResult = { canHandle: false };
    for (const guard of this.guards) {
      result = await guard.beforeHandleEvent(event);
      if (result.canHandle) {
        return result;
      }
    }
    return result;
  }
}
