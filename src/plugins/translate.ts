import fs from 'fs'
import path from 'path'

import jsonFormat from 'json-format'
import changeCase from 'change-case'

import models from '@/store/plugins/store-orm.dva'

const languages = [
  {
    key: 'en',
    title: 'English',
    flag: './america.svg'
  },
  {
    key: 'cn',
    title: '中文',
    flag: './china.svg'
  },
  {
    key: 'es',
    title: 'Spanish',
    flag: './spain.svg'
  }
]

const defaultLanguage = 'en'

const locales = {}

languages.forEach(language => {
  // locales[language.key] = require(`@/locales/${language.key}.json`)
  // iterate models
  Object.keys(models).forEach(model => {
    const fieldsArray = models[model].fields()
    fieldsArray.map(field => {
      locales[language.key][field] = field
    })
  })
})

const transform = async ({ from, to, locales, outputPath }) => {
  for (const key in locales[from]) {
    if (locales[to][key]) {
      console.log(`add to skip: ${key}`)
    } else {
      let sentence = key.replace(/\./, ' ')
      let res = changeCase.sentenceCase(sentence)

      if (res !== key) {
        locales[to][key] = res
        console.log(`Changed: ${from} -> ${to}: ${key} -> ${res}`)
      } else {
        console.log(`same: ${from} -> ${to}:  ${key}`)
      }
    }
  }
  await fs.writeFileSync(
    path.resolve(__dirname, outputPath),
    jsonFormat(locales[to], {
      type: 'space',
      size: 2
    })
  )
}

export async function translate () {
  const tasks = languages
    .map(item => ({
      from: defaultLanguage,
      to: item.key
    }))
    .filter(item => item.from !== item.to)

  for (const item of tasks) {
    console.log(`start: ${item.from} -> ${item.to}`)
    await transform({
      from: item.from,
      to: item.to,
      locales,
      outputPath: `../locales/${item.to}.youdao.json`
    })
    console.log(`completed: ${item.from} -> ${item.to}`)
  }

  console.log('All translations have been completed.')
}
