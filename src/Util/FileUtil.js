const fs = require('fs');
const extensions = require('../Constants/Extensions');
const directories = require('../Constants/Directories');

class FileExistence {
    constructor(imageExists,jsonExists) {
        this.imageExists = imageExists;
        this.jsonExists = jsonExists;
    }
}

const formatFileName = ({name,extension,dir}) => {
    let filename = name;
    //console.log(name);
    filename=filename.replace(/\s/g, '_');
    filename=filename.replace(/-/g, '_');

    return dir + filename + extension;
}

const fileToJson = (dir) => {

    try{
        const jsonString = fs.readFileSync(dir);
        return  JSON.parse(jsonString);

    }catch (err) {
        console.log(err);
    }
}

const fileExists = ({filename,isImage,isJson}) => {

    let exists = new FileExistence(false,false);

    if(isImage) {

        let path = formatFileName({name:filename,extension:extensions.PNG,dir:directories.avatar});

        exists.imageExists = fs.existsSync(path);
    }
    if(isJson) {
        let path = formatFileName({name:filename,extension:extensions.JSON,dir:directories.details});

        exists.jsonExists = fs.existsSync(path);
    }

    return exists;

}

exports.fileExists =fileExists;
exports.fileToJson = fileToJson;
exports.formatFileName = formatFileName;