/**
 * Scrapper for https://ayumilove.net/ to extract champion data
 * Developed by <sudotesla@gmail.com> 2020
 */

const { JSDOM } = require("jsdom")
const axios = require('axios')
const fs = require('fs');
const http = require('https'); // or 'https' for https:// URLs

const sourceLink = "https://ayumilove.net/raid-shadow-legends-list-of-champions-by-ranking/";
const extensions = {json : '.json',image : '.png'}
const directories = {details: '../champion-details/',avatar : '../images/avatar/'}

class Champion {
    constructor(name, url) {
        this.name = name;
        this.url = url;
    }
}

class Class {
    constructor(faction,rarity,role,affinity) {
        this.faction =faction;
        this.rarity = rarity;
        this.role = role;
        this.affinity = affinity;

    }
    toJSON() {
        return Object.getOwnPropertyNames(this).reduce((a, b) => {
            a[b] = this[b];
            return a;
        }, {});
    }

}

const ayumiloveChampionList = async () => {

    try {
        let championList = [];
        const { data } = await axios.get(sourceLink);
        const dom = new JSDOM(data);
        const { document } = dom.window;
        const u1 = document.querySelectorAll("ul");

        let tierIndex =0;

        for(let tier of u1) {
            const champs  = tier.querySelectorAll("li");
            for(let champ of champs) {
                championList[championList.length] = new Champion(champ.textContent.split('|')[0].trim(),champ.querySelector("a")?.href);
            }
            if(++tierIndex>24) {
                break;
            }
        }

        //fixChampionDetailsURLError();

       try {
            for(let trackingIndex = 0;trackingIndex<championList.length;trackingIndex++) {
                console.log(trackingIndex);
                console.log(championList[trackingIndex].name);

                let existsState = fileExists({filename:championList[trackingIndex].name,isImage:true,isJson:true});
                console.log(existsState);
                if(existsState.jsonExists ===false) {

                    let extractedChamp = await extractChampionDetails(championList[trackingIndex]);
                    storeChampion(extractedChamp);
                    if(existsState.imageExists ===false) {
                        storeImage(extractedChamp);
                    }
                } else {
                    console.log("Skipped")
                }

            }
        }
        catch(err) {
            console.log(err.message);
        }
        await storeBaseChampionInfoList();

        return championList;

    } catch (error) {
        throw error;
    }
};

ayumiloveChampionList().then(list =>{ console.log(list.length)
}
);
async function storeBaseChampionInfoList() {
    let files = fs.readdirSync(directories.details);
    let championBaseInfoMap = {};
    for (let fileName of files) {
        let champion =championFromFile({dir: directories.details, name: fileName});
        championBaseInfoMap[champion.name] = champion.details;
    }
    console.log(championBaseInfoMap);
    fs.writeFile('../champions-base-info.json',JSON.stringify(championBaseInfoMap,null, 4), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });


}
//one time tool used to fix an error without polling the server for every fix
//error fixed : included https:// prefix to champion avatar url
function fixChampionDetailsURLError() {
    let files = fs.readdirSync(directories.details);

    for (let fileName of files) {

        const jsonString = fs.readFileSync(directories.details+fileName);
        const champion = JSON.parse(jsonString);
        champion.avatarUrl = 'https://'+champion.avatarUrl;
        storeChampion(champion);

    }
}
function championFromFile({dir,name}){
    try {
        const jsonString = fs.readFileSync(dir+name);
        const champion = JSON.parse(jsonString);
        let details = champion.class;
        details.avatarUrl = champion.avatarUrl;
        details.detailsUrl = 'https://github.com/Sudo-tesla/champion_details_scrapper/blob/master/champion-details/'+name+'?raw=true'
        return {name : champion.name, details : details};
    } catch(err) {
        console.log(err)

    }
}

function storeImage(championObject) {

    const file = fs.createWriteStream( generateFileName(championObject.name,extensions.image,directories.avatar));

    const request = http.get(championObject.avatarUrl, function(response) {
        response.pipe(file);
    });


}
function storeChampion(championObject) {

    fs.writeFile(generateFileName(championObject.name,extensions.json,directories.details), JSON.stringify(championObject,null, 4), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}

function generateFileName(name,extension,dir) {
    let filename = name;
    filename=filename.replace(/\s/g, '_');
    filename=filename.replace(/-/g, '_');

    return dir + filename + extension;
}



async function extractChampionDetails(championObject) {

    const { data } = await axios.get(championObject.url);
    const dom = new JSDOM(data);
    const { document } = dom.window;
    const u1 = document.querySelector("tbody");

    let columns = u1.querySelectorAll('td');
    console.log(columns.outerHTML);

    let imageUrl = columns[0].querySelector("img").getAttribute('src').substr(2);

    let overview = columns[1].querySelector('p').outerHTML;

    let championClass = extractChampionClass(overview).toJSON();
    let statsOver = columns[1].querySelectorAll('p')[1].outerHTML;

    let championStats = extractChampionStats(statsOver);


    const p1 = document.querySelectorAll("p");

    let flag = false;
    let skills = []

    for(let p of p1) {

        if(p.textContent.startsWith("✰") || p.textContent.startsWith("★")) {
            flag=true;
        } else if(flag & isNaN(p.textContent.charAt(0)) & p.querySelector('strong') !== null &&  !(p.textContent.includes("Equipment") || p.textContent.includes('set'))){

            skills[skills.length] = extractSkill(p).toJSON();
        } else if(flag) {
            break
        }
    }
    //console.log(skills);

    let details = {};
    details.name = championObject.name;
    details.class = championClass;
    details.stats = championStats.toJSON();
    details.skills = skills;
    details.avatarUrl = 'https://'+imageUrl;


    return details;


}

function extractChampionClass(outerHTML) {
    let splitData = outerHTML.split('<br>');

    return new Class(
        overViewTrim(splitData[0]),
        overViewTrim(splitData[1]),
        overViewTrim(splitData[2]),
        overViewTrim(splitData[3]));
}

function extractChampionStats(outerHTML) {
    let splitData = outerHTML.split('<br>');
    return new Stats(
        splitData[0].split(":")[1].trim(),
        splitData[1].split(":")[1].trim(),
        splitData[2].split(":")[1].trim(),
        splitData[3].split(":")[1].trim(),
        splitData[4].split(":")[1].trim(),
        splitData[5].split(":")[1].trim(),
        splitData[6].split(":")[1].trim(),
        splitData[7].split(":")[1].split('<')[0].trim()


    );

}

function overViewTrim(dataSlice) {
    let dataSplit = dataSlice.split('>');
    dataSplit = dataSplit[dataSplit.length-2];
    return dataSplit.substr(0,dataSplit.length-3);
}

class Stats{

    constructor(hp,atk,def,spd,crate,cdmg,resist,acc) {
        this.hp = hp;
        this.atk =atk;
        this.def = def;
        this.spd = spd;
        this.crate = crate;
        this.cdmg = cdmg;
        this.resist = resist;
        this.acc = acc;

    }
    toJSON() {
        return Object.getOwnPropertyNames(this).reduce((a, b) => {
            a[b] = this[b];
            return a;
        }, {});
    }

}

class Skills {
    constructor(cd,mincd,dmgscaling,abilityname,description,books) {
        this.cd = cd;
        this.mincd = mincd
        this.dmgscaling = dmgscaling;
        this.abilityname = abilityname;
        this.description = description;
        this.books = books;
    }

    toJSON() {
        return Object.getOwnPropertyNames(this).reduce((a, b) => {
            a[b] = this[b];
            return a;
        }, {});
    }

}

function extractSkill(paragraph) {
    console.log(paragraph.outerHTML);
    let ability = paragraph.querySelector('strong').textContent;
    let cooldown= getCooldown(ability);
    let minCD = cooldown;
    let dmgScalng = getDamageScaling(ability);


    let skillName = getName(ability);

    let skillData = paragraph.outerHTML.split('<br>');
    let skillDescription = skillData[1];
    let books = [];
    let bookIndex = 0;

    if(skillData.length>2) {
        for(let i = 2;i<skillData.length;i++) {
            if(skillData[i].includes('Multiplier')){
                continue
            }

            books[bookIndex] = skillData[i].trim();
            if(books[bookIndex].includes('Cooldown')){
                minCD--;
            }
            bookIndex++;
        }
        //only lines is a multiplier exception
        if(bookIndex>0 ) {
            //console.log(books[bookIndex - 1], "before trim");
            if( books[bookIndex-1].includes("</p>")) {
                books[bookIndex-1] =books[bookIndex-1].substr(0,books[bookIndex-1].length-4) ;
            }
            //console.log(books[bookIndex - 1], "after trim");

        }

    } else {

        skillDescription = skillDescription.substr(0,skillDescription.length-4);

    }

    return new Skills(
        cooldown,
        minCD,
        dmgScalng,
        skillName,
        skillDescription,
        books
    );

}

function fileExists({filename,isImage,isJson}) {
    let exists = {imageExists : false,jsonExists : false};

    if(isImage) {
        let path = generateFileName(filename,extensions.image,directories.avatar);
        console.log(path);
        exists.imageExists = fs.existsSync(path);
    }
    if(isJson) {
        let path = generateFileName(filename,extensions.json,directories.details);

        exists.jsonExists = fs.existsSync(path);
    }

    return exists;

}

function getCooldown(skillText) {

    const regex = /\d+/g;
    const cd = skillText.match(regex);
    if(cd==null) {
        return 0;
    }

    return parseInt(cd[0]);
}

function getDamageScaling(skillText) {

    const regex = /(?<=\[).+?(?=\])/g;
    const scaling = skillText.match(regex);
    if(scaling ===null) {
        return [];
    }

    return scaling;
}

function getName(ability) {
    let skillsplit = ability.split("[");
    if(skillsplit.length>1) {
        return skillsplit[0].trim();
    } else{
        return ability.split("(")[0].trim();
    }

}


