const fs = require('fs')
const inquirer = require('inquirer');
const parseString = require('xml2js').parseString;

let crudCode = ''; // The code that will be used for data model
let inputFile = ''; // Raw text from selected input file
let collectionRows = []; // Properties for Collection

readSchema().then((readSuccess) => {
    if (readSuccess) {
        parseFieldData().then((parseSuccess) => {
            if (parseSuccess) {
                prepareClassFile();
                const path = './crud-schema/crud.service.ts';
                fs.writeFile(path, crudCode, err => {
                    if (err) {
                        console.error(err)
                    }
                    console.log('Successfully Created Crud Functions!')
                    })
            }
        });
    }
})

function prepareClassFile() {
    crudCode  = 'export class CrudService {\n\n';
    crudCode += '  private COLLECTION = {\n';

    // fill in collection constants

    collectionRows.forEach(element => {
        crudCode += '    ' + element.constantName + ': \'' + element.collectionName + '\', \n';
    });

    crudCode += '  }\n\n';
    crudCode += '  constructor(private db: AngularFirestore) { }\n\n';
    crudCode += '  classToObject(object) {\n';
    crudCode += '    object = Object.assign({}, object)\n\n';
    crudCode += '    for (var key in object) {\n';
    crudCode += '      if (object[key] === undefined) {\n';
    crudCode += '        delete object[key];\n';
    crudCode += '      }\n';
    crudCode += '    }\n\n';
    crudCode += '    return object;\n';
    crudCode += '  }\n\n';

    // Create

    collectionRows.forEach(element => {

        crudCode += '  // CRUD for ' + element.displayName + '\n\n';
        crudCode += '  // Create ' + element.displayName + '\n\n';
        crudCode += '  create' + element.displayName + '(' + element.lowercaseParamName + ': ' + element.ModelClass + ') {\n';

        // Check Object Arrays

        if (element.ClassObjectArray) {
            element.ClassObjectArray.forEach(value => {
                crudCode += '    const array' + element.index.toString() + ' = [];\n';
                crudCode += '    ' + element.lowercaseParamName + '.' + value.NameForArray + '.forEach((obj' + element.index.toString() + ') => {\n';
                crudCode += '      array' + element.index.toString() + '.push(this.classToObject(obj' + element.index.toString() +'))\n';
                crudCode += '    ' + element.lowercaseParamName + '.' + value.nameOfArray + ' = array' + element.index.toString() + '\n';
            })
        }

        // TODO Check Objects

        // Finish Create
        
        crudCode += '    return new Promise((resolve) => {\n';
        crudCode += '      this.db.collection<' + element.ModelClass + '>(this.COLLECTION.' + element.constantName + ').doc(' + element.lowercaseParamName + '.ID).set(this.classToObject(' + element.lowercaseParamName + ')).then(() => {\n';
        crudCode += '        resolve(true);\n';
        crudCode += '      }).catch(() => {\n';
        crudCode += '        resolve(false)\n';
        crudCode += '      })\n';
        crudCode += '    })\n';
        crudCode += '  }\n\n';

        // Finish Read

        crudCode += '  // Read ' + element.displayName + '\n\n';
        crudCode += '  get' + element.displayName + '(' + element.lowercaseParamName + '_identification: string): Promise<' + element.ModelClass + '> {\n';
        crudCode += '    return new Promise((resolve) => {\n';
        crudCode += '      this.db.collection<' + element.ModelClass + '>(this.COLLECTION.' + element.constantName + ').doc(' + element.lowercaseParamName + '_identification).get().subscribe((value) => {\n';
        crudCode += '        resolve(' + element.ModelClass + '.objectTo' + element.ModelClass + '(value.data()));\n';
        crudCode += '      })\n';
        crudCode += '    })\n';
        crudCode += '  }\n\n';

        // Finish Update
        
        crudCode += '  // Update ' + element.displayName + '\n';
        crudCode += '  update' + element.displayName + '(' + element.lowercaseParamName + ' : ' + element.ModelClass + ') { \n';
        crudCode += '    return new Promise((resolve) => {\n';
        crudCode += '      this.db.collection<' + element.ModelClass + '>(this.COLLECTION.' + element.constantName + ').doc(' + element.lowercaseParamName + '.ID).set(this.classToObject(' + element.lowercaseParamName + ')).then((value) => {\n';
        crudCode += '      resolve(' + element.ModelClass + '.objectTo' + element.ModelClass + '(value.data()));\n';
        crudCode += '       })\n';
        crudCode += '     })\n';
        crudCode += '  }\n\n';

        // Finish Delete

        crudCode += '  // Delete ' + element.displayName + '\n';
        crudCode += '  delete' + element.displayName + '(' + element.lowercaseParamName + '_identification: string) { \n';
        crudCode += '    return new Promise((resolve) => {\n';
        crudCode += '      this.db.collection<' + element.ModelClass + '>(this.COLLECTION.' + element.constantName + ').doc(' + element.lowercaseParamName + '_identification).delete()\n';
        crudCode += '        .then((value) => {\n'; 
        crudCode += '          resolve(true)\n'; 
        crudCode += '        }).catch((error) => {\n'; 
        crudCode += '          resolve(false)\n'; 
        crudCode += '        })\n'; 
        crudCode += '    })\n';
        crudCode += '  }\n\n';
    })

    crudCode += '}\n';
}

function parseFieldData() {
    return new Promise((resolve, reject) => {
        parseString(inputFile, {trim: true}, function (err, result) {
            if (err) {
                reject(false);
            }

            var parsedFields = JSON.parse(JSON.stringify(result.Workbook.Worksheet[0].Table[0].Row))
            parsedFields.forEach((field, inx) => {
                var property = {
                    collectionName: field.Cell[0].Data[0]._,
                    constantName: field.Cell[1].Data[0]._,
                    ModelClass: field.Cell[2].Data[0]._,
                    displayName: field.Cell[3].Data[0]._,
                    lowercaseParamName: field.Cell[4].Data[0]._,
                    ClassObjectArray: field.Cell[5].Data !== undefined ? JSON.parse(field.Cell[5].Data[0]._) : null,
                    ClassObject: field.Cell[6].Data !== undefined ? JSON.parse(field.Cell[6].Data[0]._) : null,
                    index: inx,
                };
                console.dir(property)
                collectionRows.push(property);
            });
            resolve(true);
        });
    });
}

function readSchema() {
    return new Promise((resolve, reject) => {
        const path = './crud-schema/schema.xml';
        fs.readFile(path, 'utf-8', function (err, rawText) {
            if (err) {
                reject(false);
            }
            inputFile = rawText;
            resolve(true)
        });
    });
}

/* TODO
1. Get all file names ~
2. Select a file from ./crud-schema/schema.xml ~
3. Parse file and set class properties ~
4. Write class code into a type script file
*/