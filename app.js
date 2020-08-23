const fs = require('fs')
const inquirer = require('inquirer');
const parseString = require('xml2js').parseString;

let classCode = ''; // The code that will be used for data model
let selectedFile = ''; // The selected input file
let extension = ''; // Raw text from input file
let inputFiles = []; // List of input files
let inputFile = ''; // Raw text from selected input file
let inputFields = []; // Properties for Class

getInputFiles().then((files) => {
    inputFiles = files;
    selectInputFile().then((selectSuccess) => {
        if (selectSuccess) {
            readInputFiles().then((readSuccess) => {
                if (readSuccess) {
                    parseFieldData().then((parseSuccess) => {
                        if (parseSuccess) {
                            prepareClassFile();
                            const path = './output/' + selectedFile.toLowerCase() + '.ts';
                            fs.writeFile(path, classCode, err => {
                                if (err) {
                                  console.error(err)
                                }
                                console.log('Successfully Created Class ' + selectedFile + ' !')
                              })
                        }
                    });
                }
            })
        }
    })
})

function prepareClassFile() {
    lowercase = selectedFile.charAt(0).toLowerCase() + selectedFile.slice(1);
    uppercase = selectedFile.charAt(0).toUpperCase() + selectedFile.slice(1);

    classCode = 'export class ' + selectedFile + ' {\n';

    // List Properties

    inputFields.forEach(element,idx => {
		lowercaseProp = element.propertyName.charAt(0).toLowerCase() + element.propertyName.slice(1);
		//classCode += '  ID: ' + element.dataType + ';\n';
        classCode += '  ' + lowercaseProp + ': ' + element.dataType + ';\n';
    });

    // Create to Object Function

    classCode += '\n'
    classCode += '  static objectTo' + uppercase + '(tempObject): ' + uppercase + ' {\n';
    classCode += '    const ' + lowercase + ' = new ' + uppercase + '();\n\n';

    inputFields.forEach(element => {
        lowercaseProp = element.propertyName.charAt(0).toLowerCase() + element.propertyName.slice(1);
        uppercaseProp = element.propertyName.charAt(0).toUpperCase() + element.propertyName.slice(1);
        classCode += '    ' + lowercase + '.' + lowercaseProp + ' = tempObject.' + lowercaseProp + ';\n';
    });

    classCode += '    return ' + lowercase + ';\n';

    classCode += '  }\n\n';
    classCode += '}\n';
}

function parseFieldData() {
    return new Promise((resolve, reject) => {
        parseString(inputFile, {trim: true}, function (err, result) {
            if (err) {
                reject(false);
            }
            resolve(true);
            var parsedFields = JSON.parse(JSON.stringify(result.Workbook.Worksheet[0].Table[0].Row))
            parsedFields.forEach(field => {
                var property = {
                    propertyName: field.Cell[0].Data[0]._,
                    dataType: field.Cell[1].Data[0]._
                };
                inputFields.push(property);
            });
        });
    });
}

function readInputFiles() {
    return new Promise((resolve, reject) => {
        const path = './input/' + selectedFile + '.' + extension
        fs.readFile(path, 'utf-8', function(err, rawText) {
            if (err) {
              reject(false);
            }
            inputFile = rawText;
            resolve(true)
          }); 
    });
}

function selectInputFile() {
    return new Promise((resolve, reject) => {
        inquirer
        .prompt([
            {
                type: 'list',
                name: 'file',
                message: 'Which file would you like to process?',
                choices: inputFiles
            },
        ])
        .then(answer => {
            selectedFile = answer.file.split('.')[0];
            extension = answer.file.split('.')[1];
            resolve(true);
        })
        .catch(error => {
            reject(false);
        }); 
    });
}

function getInputFiles() {
    return new Promise((resolve, reject) => {
        const dirname = './input';
        fs.readdir(dirname, function (err, filenames) {
            if (err) {
                reject(false);
            }
            resolve(filenames);
        });

    });
}

/* TODO
1. Get all file names ~
2. Select a file from ./input ~
3. Parse file and set class properties ~
4. Write class code into a type script file
*/