
exports.tagDetails = {
    startTag : "<a href",
    endTag :'</a>'
}

exports.removeReference = (text, {startTag, endTag}) => {

    if(!text.includes(startTag)) {
        return text
    }

    let firstIndex = text.indexOf(startTag);
    let endIndex = text.indexOf('>',firstIndex);
    let closeIndex = text.indexOf(endTag);

    return text.substring(0, firstIndex) +
        text.substring(endIndex + 1, closeIndex) +
        text.substring(closeIndex + 4);
}

