module.exports = [
  {
    type: 'input',
    name: 'name',
    message: 'Name (Like [user]):',
    validate (value) {
      if (!value.length) {
        return 'Router must have a name, better capitalized.'
      }
    }
  }
]
