import { Model, BelongsTo } from '@vuex-orm/core'
import { BaseModel } from './BaseModel'
export default class Account extends BaseModel {
  static entity = 'database'

  static fields () {
    return {
      _id: Model.increment(),
      name: Model.string('embajadachina'),
      path: Model.string('embajadachina@gmail.com')
    }
  }
}
