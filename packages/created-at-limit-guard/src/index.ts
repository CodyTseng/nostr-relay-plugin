import {
  BeforeHandleEventPlugin,
  BeforeHandleEventResult,
  Event,
} from '@nostr-relay/common';

export type CreatedAtLimitGuardOptions = {
  upperLimit?: number;
  lowerLimit?: number;
};

export class CreatedAtLimitGuard implements BeforeHandleEventPlugin {
  constructor(private readonly options: CreatedAtLimitGuardOptions = {}) {}

  beforeHandleEvent(event: Event): BeforeHandleEventResult {
    const now = Math.floor(Date.now() / 1000);
    if (
      !isNil(this.options.upperLimit) &&
      event.created_at - now > this.options.upperLimit
    ) {
      return {
        canHandle: false,
        message: `invalid: created_at must not be later than ${this.options.upperLimit} seconds from the current time`,
      };
    }

    if (
      !isNil(this.options.lowerLimit) &&
      now - event.created_at > this.options.lowerLimit
    ) {
      return {
        canHandle: false,
        message: `invalid: created_at must not be earlier than ${this.options.lowerLimit} seconds from the current time`,
      };
    }
    return { canHandle: true };
  }
}

const isNil = (val: any): val is null | undefined =>
  typeof val === 'undefined' || val === null;
