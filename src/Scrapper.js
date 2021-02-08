/**
 * Scrapper for https://ayumilove.net/ to extract champion data
 * Developed by <sudotesla@gmail.com> 2020
 */
const { JSDOM } = require("jsdom")
const axios = require('axios')
const fs = require('fs');
const http = require('https'); // or 'https' for https:// URLs
const textUtil = require('./Util/TextUtil');
const fileUtil = require('./Util/FileUtil');
const extensions = require('./Constants/Extensions');
const directories = require('./Constants/Directories');
const sourceLink = "https://ayumilove.net/raid-shadow-legends-list-of-champions-by-ranking/";


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

const ayumiloveChampionList = new  Promise(async (resolve,reject) => {

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
                //Extracts the champions name from the listing. Champions name is always the first element before the '|'
                championList[championList.length] = new Champion(champ.textContent.split('|')[0].trim(),champ.querySelector("a")?.href);
            }
            if(++tierIndex>24) {
                break;
            }
        }

        resolve(championList);

    } catch (error) {
        reject(error)
    }
});

ayumiloveChampionList.then((list) =>{
        console.log(list.length);//storeChampion(500,list)
        let result = list.find((champion)=>champion.name.includes('Rotos'));
        console.log(result);
        let existRequest = {filename:result.name+'cow',isImage:true,isJson:true};
        console.log(fileUtil.fileExists(existRequest));

    /*extractChampionDetails(result).then(r => {
        //console.log(r);

    });*/

            //filterHrefFromChampionDetails(list)


    }
).catch((error) => {
    console.log(error.message);
});


function filterHrefFromChampionDetails(lists) {

    for(let champion of lists) {
        try {
            console.log(champion.name);
            let championObject = getChampionFromFile(champion.name)
            championObject = removeTags(championObject);
            console.log(championObject);
            storeChampion(championObject);
            //removeTags(championObject)
        }catch (err) {
            console.log( "Champion : "+ champion.name+" does not have a details file stored");
            return null;
        }

    }


}

function storeExtractedChampions(base =0,championList) {
    try {
        for(let trackingIndex = base;trackingIndex<championList.length;trackingIndex++) {
            let extractedChamp =  extractChampionDetails(championList[trackingIndex]);
            storeChampion(extractedChamp);

        }
    }
    catch(err) {
        console.log(err.message);
    }
}

async function storeBaseChampionInfoList() {
    let files = fs.readdirSync(directories.details);
    let championBaseInfoMap = {};
    for (let fileName of files) {
        let champion =championBaseInfoFromFile({dir: directories.details, name: fileName});
        championBaseInfoMap[champion.name] = champion.details;
    }

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
function championBaseInfoFromFile({dir,name}){
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
function readChampionFromFile(dir) {

    try{
        const jsonString = fs.readFileSync(dir);
        const champion = JSON.parse(jsonString);
        return champion;
    }catch (err) {
        console.log(err);
    }

}

function getChampionFromFile(name) {
    let filename = fileUtil.formatFileName({name:name,extension:extensions.JSON,dir:directories.details});
    return readChampionFromFile(filename);

}

function removeTags(champion) {

    let skills = champion.skills;

    for(let skill of skills) {

        skill.description = textUtil.removeReference(skill.description,textUtil.tagDetails);
        skill.description = textUtil.replaceTag(skill.description,textUtil.spanDetails);

    }

    return champion;

}
function storeImage(championObject) {

    const file = fs.createWriteStream( fileUtil.formatFileName({name:championObject.name,extension:extensions.PNG,dir:directories.avatar}));

    const request = http.get(championObject.avatarUrl, function(response) {
        response.pipe(file);
    });


}
function storeChampion(championObject) {

    fs.writeFile(fileUtil.formatFileName(
        {name:championObject.name,extension:extensions.JSON,dir:directories.details}),
        JSON.stringify(championObject,null, 4),
        function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}




async function extractChampionDetails(championObject) {

    const { data } = await axios.get(championObject.url);
    const dom = new JSDOM(data);
    const { document } = dom.window;
    const u1 = document.querySelector("tbody");

    let columns = u1.querySelectorAll('td');


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
        } else if(flag & isNaN(p.textContent.charAt(0)) & p.querySelector('strong') !== null &&  !(p.textContent.includes("Equipment") || p.textContent.includes(' set'))){

            skills[skills.length] = extractSkill(p).toJSON();
        } else if(flag) {
            break
        }
    }


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

    let ability = paragraph.querySelector('strong').textContent;
    let cooldown= getCooldown(ability);
    let minCD = cooldown;
    let dmgScalng = getDamageScaling(ability);


    let skillName = getName(ability);

    let skillData = paragraph.outerHTML.split('<br>');




    let skillDescription = textUtil.removeReference(skillData[1],textUtil.tagDetails);



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

            if( books[bookIndex-1].includes("</p>")) {
                books[bookIndex-1] =books[bookIndex-1].substr(0,books[bookIndex-1].length-4) ;
            }


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


