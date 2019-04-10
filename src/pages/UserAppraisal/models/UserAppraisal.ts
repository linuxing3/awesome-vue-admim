import { BaseModel } from '@/models/BaseModel'

export default class UserAppraisal extends BaseModel {
  static entity = 'userAppraisal'

  static fields () {
    return {
      _id: this.increment(),
      department: this.string('Business'),
      name: this.string('Daniel'),
      startDate: this.string('male'),
      endDate: this.string('2009-09-09'),
      goals: this.string('han'),
      remarks: this.string('Master'),
      user_id: this.attr(null)
    }
  }
}
