// 获取模型
import * as Vuex from 'vuex'
import { Model } from '@vuex-orm/core'
import { BaseModel } from '@/models/BaseModel'
import { lowerFirst, tail, last } from 'lodash'

// entity interface
export interface Entity {
  name: string
  model: typeof Model
  module: Vuex.Module<any, any>
}

export interface Models {
  [name: string]: typeof BaseModel | typeof Model
}

const requiredModels: RequireContext = require.context('../pages', true, /.*\/models\/.*\.ts$/)
const models: Models = {}

requiredModels.keys().forEach((fileName: string) => {
  const fileNameMeta = last(tail(fileName.split('/')))
  const modelName = lowerFirst(fileNameMeta.replace(/(\.\/|\.ts)/g, ''))
  models[modelName] = requiredModels(fileName).default
})

console.log(models)

export default models
