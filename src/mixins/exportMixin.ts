import { join } from 'path'
import { last, uniqueId } from 'lodash'
import { copyFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { remote, shell } from 'electron'
import XLSX from 'xlsx'
import { Document, Paragraph, TextRun, Table, Packer } from 'docx'

import { Model } from '@vuex-orm/core'
import models from '@/models'
import keysDef from '@/locales/cn.json'
import { getFilesByExtentionInDir, GenerateCSV, ImportCSV, changeHeaderOfCSV } from '@/util'

interface IExportHelper {
  importFileMeta?: any
  outputDocFile?: string
  workbook?: any
  document?: any
  attachFile?: string | object
  fileFormat?: string
  needChangeCSVHeader?: boolean
  keepOriginalHeader?: boolean
  reverseTranslate?: boolean
  onlyKeepStringValue?: boolean
  needMergeWord?: boolean
}

export default {
  data (): IExportHelper {
    return {
      importFileMeta: {},
      outputDocFile: 'template',
      workbook: null,
      document: null,
      attachFile: '',
      fileFormat: 'csv',
      needChangeCSVHeader: false,
      keepOriginalHeader: true,
      reverseTranslate: false,
      onlyKeepStringValue: true,
      needMergeWord: false
    }
  },
  computed: {
    Model (): typeof Model {
      return models[this.modelName]
    },
    keysDef: () => keysDef, // 翻译定义
    userHomeDir: (): string => remote.app.getPath('home'), // 用户模板目录
    userDataDir: (): string => remote.app.getPath('userData'), // 用户数据目录
    templateDir: function (): string {
      return join(this.userHomeDir, '/Documents/template') // 用户模板目录
    },
    attachDir: function (): string {
      return join(this.userHomeDir, '/Documents/attach') // 用户模板目录
    },
    realDataDir: function (): string {
      return join(this.userDataDir, 'data') // 用户数据目录
    },
    // 获取模板目录下的doc文件
    templateDocs: function (): string[] {
      return getFilesByExtentionInDir({ path: this.templateDir, ext: 'doc' })
    },
    // 获取模板目录下的当前模型对应csv文件
    modelDatasource: function (): string {
      return this.resolvePath(this.modelName, 'csv')
    },
    // 获取模板目录下的默认csv文件
    defaultDatasource: function (): string {
      return this.resolvePath('db', 'csv')
    },
    // 获取模板目录下默认Word模板
    defaultTemplate: function (): string {
      return this.resolvePath('template', 'doc')
    },
    // 获取模板目录下自选Word模板
    modelTemplate: function (): string {
      return this.resolvePath(this.outputDocFile, 'doc')
    }
  },
  mounted () {
    if (!existsSync(this.templateDir)) {
      mkdirSync(this.templateDir)
    }
    if (!existsSync(this.attachDir)) {
      mkdirSync(this.attachDir)
    }
    if (!existsSync(this.realDataDir)) {
      mkdirSync(this.realDataDir)
    }
  },
  methods: {
    resolvePath (fileName, fileExt): string {
      return join(this.templateDir, `${fileName}.${fileExt}`)
    },
    /**
     * 获取导入文件的宏信息，设置当前文件格式
     * @param e 事件
     */
    getImportFile (e) {
      if (e.target.files) {
        this.importFileMeta = e.target.files[0]
      } else {
        const openedFiles = remote.dialog.showOpenDialog({ properties: ['openFile'] })
        // 文件对象
        this.importFileMeta.path = openedFiles[0]
      }
      console.log(this.importFileMeta.path)
      // 文件格式，csv， xls， docx
      this.fileFormat = last(this.importFileMeta.path.split('.'))
      this.$forceUpdate()
    },
    /**
     * 根据文件扩展名，导入数据
     */
    attemptImport () {
      if (this.fileFormat === 'csv') {
        // this.importCSV()
        this.importExcel()
      } else if (this.fileFormat === 'xls' || this.fileFormat === 'xlsx') {
        this.importExcel()
      }
      this.importFileMeta = {}
    },
    /**
     * 导入csv文件的数据，并执行持久化
     */
    async importCSV () {
      console.log(`导入${this.modelName}.csv文件...`)
      let data: any[] = await ImportCSV({
        file: this.importFileMeta,
        keysDef: this.keysDef
      })
      console.table(data)
      if (data.length) this.persistData(data)
    },
    /**
     * 将数据持久化，这里是存到本地indexDb中
     * @param data 需要持久化的数据
     */
    persistData (data) {
      if (!Array.isArray(data)) return
      if (this.modelName === '') return
      try {
        console.log(`保存${this.modelName}...`)
        // 逐个插入数据到数据存储文件
        data.forEach(item => {
          this.Model.$create({ data: item })
        })
      } catch (error) {
        throw new Error(error)
      }
    },
    /**
     * 根据数据集，删除持久化内容
     * @param data 数据集
     */
    resetData (data) {
      // Delete all data
      if (!Array.isArray(data)) return
      try {
        console.log(`删除${this.modelName}全部数据`)
        let count = 0
        // 逐个插入数据到数据存储文件
        data.forEach(item => {
          let id = item._id || item.id
          this.Model.$delete(id)
          count = count + 1
        })
        console.log(`共删除数据数: ${count}`)
      } catch (error) {
        throw new Error(error)
      }
    },

    /**
     * 根据文件格式，尝试导出数据
     */
    attemptExport (item) {
      let data = this.checkItem(item)
      if (this.fileFormat === 'csv') {
        this.exportCSV(data)
      } else if (this.fileFormat === 'xls' || this.fileFormat === 'xlsx') {
        this.exportExcel(data)
      } else if (this.fileFormat === 'docx') {
        this.exportDocx()
      }
    },
    checkItem (item) {
      if (Array.isArray(item)) return item
      return [item]
    },
    /**
     * 导出数据项目，可以选择是否保留原来的标题行，或者需要翻译
     * @param item 数据项目
     */
    exportCSV (item) {
      console.log(`导出到${this.modelDatasource}文件...`)
      try {
        GenerateCSV({
          data: item,
          targetFilePath: this.modelDatasource,
          keysDef: this.keysDef,
          needTranslateHeader: this.needChangeCSVHeader, // 这里不转换，待生成CSV文件后，更改CSV文件
          onlyKeepStringValue: this.onlyKeepStringValue // 这里转换[对象类]键值为[字符串类]键值
        })
        // 选择是否保留原有标题
        if (this.keepOriginalHeader) {
          setTimeout(async () => {
            let r = confirm(
              '请选择是否保留原有标题。\n因为数据标题行为外文，需要添加中文对应标题。\n你可以随意删除无用标题'
            )
            if (r) {
              this.changeCSVHeader()
            } else {
              alert('跳过...')
            }
          }, 3000)
        }
        // 打开文件所在目录并定位到文件
        setTimeout(() => {
          shell.showItemInFolder(this.modelDatasource)
          console.log(`导出${this.modelDatasource}文件成功`)
        }, 5000)
      } catch (error) {
        throw new Error(error)
      }
    },
    /**
     * 修改导出csv文件的标题，插入或不插入标题翻译行
     */
    changeCSVHeader () {
      console.log(`更新${this.modelDatasource}文件的列标题...`)
      if (existsSync(this.modelDatasource)) {
        try {
          changeHeaderOfCSV({
            targetFilePath: this.modelDatasource,
            keysDef: this.keysDef,
            reverse: this.reverseTranslate,
            keepOriginalHeader: this.keepOriginalHeader
          })
          alert('完成标题对应，可以使用了')
        } catch (error) {
          throw new Error(error)
        }
      }
    },
    /**
     * 将导出的csv文件备份为db文件
     */
    copyModelNameCSV () {
      console.log('备份为db.csv文件...')
      if (existsSync(this.modelDatasource)) {
        try {
          copyFileSync(this.modelDatasource, this.defaultDatasource)
        } catch (error) {
          throw new Error(error)
        }
      }
    },
    /**
     * 导出文件到Word，打印合并
     */
    async mergeWordApp () {
      this.copyModelNameCSV()
      if (existsSync(this.modelTemplate)) {
        shell.showItemInFolder(this.modelTemplate)
        // shell.openItem(this.modelTemplate)
      } else {
        throw new Error('无法找到Word模板文件，请查看手册。')
      }
    },
    /**
     * 将数据项目导出到Excel文件
     */
    exportExcel (item) {
      /* show a file-open dialog and read the first selected file */
      let workbook = this.workbook
      let filename = this.importFileMeta.path
      let sheetName = 'data'
      try {
        this.writeExcelFile({
          workbook,
          filename,
          data: item,
          sheetName
        })
      } catch (error) {
        throw new Error(error)
      }
    },
    /**
     * 导入Excel文件，从用户选取的文件中
     */
    importExcel () {
      // 电子表对象
      try {
        this.workbook = XLSX.readFile(this.importFileMeta.path)
        let sheetName = this.workbook.SheetNames[0]
        let worksheet = this.workbook.Sheets[sheetName]
        let data = XLSX.utils.sheet_to_json(worksheet)
        console.table(data)
        if (data.length) this.persistData(data)
      } catch (error) {
        throw new Error(error)
      }
      console.log('打开Excel文件，已读取数据')
    },
    /**
     * 写入Excel文件
     * @param param0 Excel文件的参数
     */
    writeExcelFile ({ workbook, filename, sheetName, data, options }) {
      // 创建新的电子表格
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data)
      // 添加电子表格到文件中
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
      // 写入文件
      XLSX.writeFile(workbook, filename, options)
    },
    /**
     * 保存Excel文件为csv
     * @param worksheet 电子试算表
     * @param type 文件类型
     */
    saveExcelAs (worksheet: XLSX.WorkSheet, type = 'csv') {
      let output
      if (type === 'csv') {
        output = XLSX.utils.sheet_to_csv(worksheet, {
          FS: ',',
          blankrows: false
        })
      }
      return output
    },
    /**
     * 拖放导入
     */
    async handleDrop (e) {
      e.stopPropagation()
      e.preventDefault()
      const reader = (window as any).reader
      let rABS = true
      let files = e.dataTransfer.files
      this.importFileMeta = files[0]
      reader.onload = async function (e) {
        let data = e.target.result
        if (!rABS) data = new Uint8Array(data)
        let workbook = XLSX.read(data, { type: rABS ? 'binary' : 'array' })
        console.log('打开了Excel文件')
        /* DO SOMETHING WITH workbook HERE */
        return workbook
      }
      if (rABS) reader.readAsBinaryString(this.importFileMeta.path)
      else reader.readAsArrayBuffer(this.importFileMeta.path)
    },
    ensureAttachFile () {
      let uuid = uniqueId(`${this.modelName}_attach_`)

      let fileIdRef = this.editedItem._id.toString() || uniqueId().toString()
      let moduleAttachDir = join(this.attachDir, this.modelName)
      let moduleAttachDirWithId = join(this.attachDir, this.modelName, fileIdRef)
      if (!existsSync(moduleAttachDir)) {
        mkdirSync(moduleAttachDir)
      }
      if (!existsSync(moduleAttachDirWithId)) {
        mkdirSync(moduleAttachDirWithId)
      }

      if (this.importFileMeta.path !== undefined) {
        this.attachFile = this.importFileMeta.path
      } else {
        this.attachFile = join(moduleAttachDir, `${uuid}.docx`)
      }
      console.log(this.attachFile)
    },
    /**
     * 自动生成附件
     * @param data string 写入附件的内容
     */
    exportDocx (content) {
      this.ensureAttachFile()

      try {
        // 创建新的文档或使用默认文档
        this.document = new Document({
          creator: 'cnve',
          description: `Attachment of model ${this.modelName}`,
          title: this.modelName
        })

        // 添加数据到正文
        Object.keys(content).map(key => {
          this.document.addParagraph(new Paragraph(key).heading3())
          this.document.addParagraph(new Paragraph(content[key]).heading3())
        })

        console.log(this.document)
        // 写入文件
        const packer = new Packer()
        packer
          .toBuffer(this.document)
          .then(buffer => {
            writeFileSync(this.attachFile, buffer)
            this.attachFile = ''
            this.document = null
          })
          .catch(error => {
            throw new Error(error)
          })
        shell.showItemInFolder(this.attachFile)
      } catch (error) {
        throw new Error(error)
      }
    }
  }
}
