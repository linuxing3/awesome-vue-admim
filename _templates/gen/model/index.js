module.exports = {
  prompt: ({
    inquirer
  }) => {
    // defining questions in arrays ensures all questions are asked before next prompt is executed
    const questions = [{
      type: 'input',
      name: 'model',
      message: 'Name of model (ex: UserBook)'
    },
    {
      type: 'input',
      name: 'fieldNames',
      message: 'Field Name(separate by comma: "age, gender, title")'
    }
    ]

    return inquirer.prompt(questions).then(answers => {
      console.log(answers)
      return answers
    })
  }
}
