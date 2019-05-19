const responseBody = {
  message: '',
  timestamp: 0,
  result: null,
  code: 0,
  status: null,
  headers: null
}

/**
 * 获取数据，包装成axios类似的返回格式
 * @param {any} data Data from request
 * @param {string} message Response messag
 * @param {number} code Response code
 * @param {any} headers Response headers
 */
export const builder = (data, message, code = 0, headers = {}) => {
  responseBody.result = data
  if (message !== undefined && message !== null) {
    responseBody.message = message
  }
  if (code !== undefined && code !== 0) {
    responseBody.code = code
    responseBody.status = code
  }
  if (headers !== null && typeof headers === 'object' && Object.keys(headers).length > 0) {
    responseBody.headers = headers
  }
  responseBody.timestamp = new Date().getTime()
  return responseBody
}

/**
 * 获取url查询参数字符串，包装为json对象
 * @param {any} options Url查询参数字符串
 */
export const getQueryParameters = options => {
  const url = options.url
  const search = url.split('?')[1]
  if (!search) {
    return {}
  }
  return JSON.parse(
    '{"' +
      decodeURIComponent(search)
        .replace(/"/g, '\\"')
        .replace(/&/g, '","')
        .replace(/=/g, '":"') +
      '"}'
  )
}

/**
 * 获取请求体字符串，返回json对象
 * @param {any} options 获取请求体
 */
export const getBody = options => {
  return options.body && JSON.parse(options.body)
}
