
exports.tagDetails = {
    startTag : '<a href',
    midTag : '>',
    endTag :'</a>'
}
exports.spanDetails = {
    startTag : '<span',
    midTag : '>',
    endTag :'</span>'
}
exports.removeReference = (text, {startTag,midTag, endTag}) => {

    if(!text.includes(startTag)) {
        return text
    }

    let firstIndex = text.indexOf(startTag);
    let endIndex = text.indexOf(midTag,firstIndex);
    let closeIndex = text.indexOf(endTag);

    return text.substring(0, firstIndex) +
        text.substring(endIndex + midTag.length, closeIndex) +
        text.substring(closeIndex + endTag.length);
}

exports.replaceTag = (text, {startTag,midTag, endTag}) => {

    if(!text.includes(startTag)) {
        return text
    }

    let firstIndex = text.indexOf(startTag);
    let endIndex = text.indexOf(midTag,firstIndex);
    let closeIndex = text.indexOf(endTag);

    return text.substring(0, firstIndex) + '['+
        text.substring(endIndex + midTag.length, closeIndex) + ']' +
        text.substring(closeIndex + endTag.length);
}
