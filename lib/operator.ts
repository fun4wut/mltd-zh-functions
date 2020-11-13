import { Context, Logger } from '@azure/functions'

/**
 * Operator基类，用来操作Ctx，主要是logger
 */
export class Operator {
  protected logger: Logger
  constructor(protected ctx: Context) {
    this.logger = ctx.log
  }
}
