const fs = require('fs');
const extentions = require('../Constants/Extensions');

const directories = require('../Constants/Directories');
class fileExists {
    constructor(imageExists,jsonExists) {
        this.imageExists = imageExists;
        this.jsonExists = jsonExists;
    }
}
const  formatFileName = ({name,extension,dir}) => {
    let filename = name;
    filename=filename.replace(/\s/g, '_');
    filename=filename.replace(/-/g, '_');

    return dir + filename + extension;
}

exports.formatFileName = formatFileName;

exports.fileExists = ({filename,isImage,isJson}) => {

    let exists = new fileExists(false,false);

    if(isImage) {

        let path = formatFileName({name:filename,extension:extentions.PNG,dir:directories.avatar});

        exists.imageExists = fs.existsSync(path);
    }
    if(isJson) {
        let path = formatFileName({name:filename,extension:extentions.PNG,dir:directories.details});

        exists.jsonExists = fs.existsSync(path);
    }

    return exists;

}


