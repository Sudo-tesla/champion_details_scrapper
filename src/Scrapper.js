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
//const sourceLink = "https://ayumilove.net/raid-shadow-legends-list-of-champions-by-ranking/";
const sourceLink = "https://ayumilove.net/category/raid-shadow-legends/";

class Champion {
    constructor(name, url) {
        this.name = name;
        this.url = url;
    }
}

class Class {
    constructor({faction,rarity,role,affinity}) {
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

class Stats{

    constructor({hp,atk,def,spd,crate,cdmg,resist,acc}) {
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
    constructor(cd,mincd,dmgscaling,multiplier,abilityname,description,books) {
        this.cd = cd;
        this.mincd = mincd
        this.dmgscaling = dmgscaling;
        this.multiplier =multiplier;
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

const olChampionList = new  Promise(async (resolve,reject) => {

    try {
        let championList = [];
        const { data } = await axios.get(sourceLink);

        const dom = new JSDOM(data);
        const { document } = dom.window;
        const u1 = document.querySelector("ol");
        const champs  = u1.querySelectorAll("li");

        for(let champ of champs) {
                //Extracts the champions name from the listing. Champions name is always the first element before the '|'
               // console.log(champ);
                if(!(champ.textContent.includes('Champion List') || champ.textContent.includes('Guide') || champ.textContent.startsWith('Raid Shadow Legends'))) {
                    //console.log(champ.textContent);
                    championList[championList.length] = new Champion(champ.textContent.split('|')[0].trim(),champ.querySelector("a")?.href);
                }
            }
        console.log(championList.length);
        resolve(championList);

    } catch (error) {
        reject(error)
    }
});

function filterHrefFromChampionDetails(lists) {

    for(let champion of lists) {
        try {
            let championObject = getChampionFromFile(champion.name)
            championObject = removeSkillTags(championObject);
            storeChampion(championObject);
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

async function storeSimulatorChampionInfoList() {
    let files = fs.readdirSync(directories.details);
    let championBaseInfoMap = {};
    for (let fileName of files) {

        let champion =championBaseInfoFromFile({dir: directories.details, name: fileName});
        championBaseInfoMap[champion.name] = { affinity: champion.details.affinity, rarity: champion.details.rarity};
    }

    fs.writeFile('../simulator-champions-base-info.json',JSON.stringify(championBaseInfoMap,null, 4), function(err) {
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

      //  console.log(name);
        const champion = JSON.parse(jsonString);

        let details = champion.class;
        details.avatarUrl = champion.avatarUrl;
        details.detailsUrl = 'https://github.com/Sudo-tesla/champion_details_scrapper/blob/master/champion-details/'+name+'?raw=true'
        return {name : champion.name, details : details};
    } catch(err) {
        console.log(err)

    }
}


function getChampionFromFile(name) {
    let filename = fileUtil.formatFileName({name:name,extension:extensions.JSON,dir:directories.details});
    return fileUtil.fileToJson(filename);

}

function removeSkillTags(champion) {

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
    let src = null;
    let dataSrc = null;
    let imageUrl;

    try {
        if(columns[0].querySelector("img").hasAttribute('data-src')) {
            console.log('data - src')
            imageUrl = columns[0].querySelector("img").getAttribute('data-src').substr(2);
        }  else if(columns[0].querySelector("img").hasAttribute('src')) {
            console.log('src')
            imageUrl = columns[0].querySelector("img").getAttribute('src').substr(2);

        } else {
            imageUrl = 'https://www.pinclipart.com/picdir/middle/559-5592431_pokemon-unown-exclamation-mark-unknown-pokemon-question-mark.png';
        }
        console.log(imageUrl);

    }catch (err) {
        imageUrl = 'https://www.pinclipart.com/picdir/middle/559-5592431_pokemon-unown-exclamation-mark-unknown-pokemon-question-mark.png';
    }

    let overview = columns[1].querySelector('p').outerHTML;

    let championClass = extractChampionClass(overview).toJSON();
    let statsOver = columns[1].querySelectorAll('p')[1].outerHTML;


    let championStats = extractChampionStats(statsOver);

    const p1 = document.querySelectorAll("p");
    console.log(p1);
    let flag = false;
    let skills = []

    for(let p of p1) {

        let inner = p.innerHTML;
        let end_flag = false;

        end_flag = p.querySelector('input')?p.querySelector('input').getAttribute('name') ==='IL_IN_ARTICLE':false;



        if(p.textContent.startsWith("✰") || p.textContent.startsWith("★") || p.textContent.startsWith("RAID Shadow Legends")) {

            flag=true;

        } else if(
            flag & isNaN(p.textContent.charAt(0)) & !p.textContent.startsWith(championObject.name)& p.querySelector('strong') !== null &&  !(p.textContent.includes("Equipment") || p.textContent.includes(' set') || p.textContent.includes('RAID Shadow Legends –'))){

            skills[skills.length] = extractSkill(p).toJSON();

        } else if(end_flag &flag) {
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
    //website format has the first 4 as the champion overview
    let splitData = outerHTML.split('<br>').slice(0,5);
    let overView = splitData.map((data)=>overViewTrim(data));
/*    console.log('overview')
    console.log(overView);*/
    overView = overView.filter(r=>(r.trim()).length>1);

    console.log(overView);
    return new Class({
            faction: overView[0],
            rarity : overView[1],
            role : overView[2],
            affinity : overView[3]
    });
}

function extractChampionStats(outerHTML) {

    let championStats = outerHTML.substr(3,outerHTML.length-7).split('<br>');
    championStats = championStats.map((stat) => stat.split(":")[1].trim());

    return new Stats(
        {
            hp:championStats[0],
            atk:championStats[1],
            def:championStats[2],
            spd:championStats[3],
            crate:championStats[4],
            cdmg:championStats[5],
            resist:championStats[6],
            acc:championStats[7]
        }
    );

}

function overViewTrim(dataSlice) {
    let dataSplit = dataSlice.split('>');
    dataSplit = dataSplit[dataSplit.length-2];
    return dataSplit.substr(0,dataSplit.length-3);
}

function cleansInputs( {text} ) {
    let skillDescription = textUtil.removeReference(text,textUtil.tagDetails);
    return textUtil.removeReference(skillDescription,textUtil.spanDetails);
}

function extractSkill(paragraph) {

    let ability = paragraph.querySelector('strong').textContent;

    let coolDown= getCooldown(ability);
    let minCD = coolDown;
    let dmgScalng = getDamageScaling(ability);
    let skillName = getName(ability);
    let multiplier = [];
    //let skillData = paragraph.outerHTML.split('<br>');
    //sanitize input from spans
    let skillData =textUtil.removeReference(paragraph.outerHTML,textUtil.spanDetails).split('<br>');
    let skillDescription = '';
    let books = [];
    let bookIndex = 0;

    if(skillData.length>1) {
        for(let i = 1;i<skillData.length;i++) {
            if(skillData[i].includes('Multiplier')){
                //console.log(getMultipliers(skillData[i]));
                multiplier.push(getMultipliers(skillData[i]).trim());
                continue
            } else if (skillData[i].includes('Note:')) {
                continue;
            } else if (skillData[i].includes('Level')) {
                books[bookIndex] = skillData[i].trim();
                if(books[bookIndex].includes('Cooldown')){
                    minCD--;
                }
                bookIndex++;
            } else {

                skillDescription = `${skillDescription}\n${cleansInputs({text:skillData[i].trim()})}`;
            }
        }
        //only lines is a multiplier exception

        if(bookIndex>0 ) {
            if( books[bookIndex-1].includes("</p>")) {
                books[bookIndex-1] =books[bookIndex-1].substr(0,books[bookIndex-1].length-4) ;
            }
        }

    }

    if(skillDescription.includes("</p>")) {
        skillDescription = skillDescription.substr(0,skillDescription.length-4);
    }


    skillDescription = skillDescription.replace('\n',' ');

    return new Skills(
        coolDown,
        minCD,
        dmgScalng,
        multiplier,
        skillName,
        skillDescription,
        books
    );

}

/**
 * Extract <integer> from a skillText string
 * @param skillText in the form (Cooldown: <integer> turns)
 * @returns {number} representing a Cooldown
 */

function getCooldown(skillText) {

    const regex = /\d+/g;
    const cd = skillText.match(regex);
    if(cd==null) {
        return 0;
    }

    return parseInt(cd[0]);
}

/***
 * @param skillText a string in the form <skillName> [<dmgScaling>][<dmgScaling>]
 * @returns {*[]|*} an array with in the form  [<dmgScaling>][<dmgScaling>]
 */
function getDamageScaling(skillText) {

    const regex = /(?<=\[).+?(?=\])/g;
    const scaling = skillText.match(regex);
    if(scaling ===null) {
        return [];
    }

    return scaling;
}

/***
 * @param ability a string in the form <skillName> [<dmgScaling>][<dmgScaling>]
 * @returns {string} <skillName>
 */
function getName(ability) {
    let skillSplit = ability.split("[");
    if(skillSplit.length>1) {
        return skillSplit[0].trim();
    } else{
        return ability.split("(")[0].trim();
    }

}
function getMultipliers(multiplierString) {
    //let res = multiplierString.split(':')[1].split('</')[0];
    return  multiplierString.split('</')[0]
        .replace(/Total Buffs/g, 'Buffs')
        .replace(/Enemy MAX HP/g, 'Emax')
        .replace('Damage Multiplier','Multiplier');

}
function upsertChampionDetails(champ ) {
    try{
        let hasStoredResources = fileUtil.fileExists({filename: champ.name, isImage: false, isJson: true}).jsonExists;

        hasStoredResources = !champ.name.trim().startsWith('J');

        if(hasStoredResources === false) {
            //console.log(champ.name);

            try {
                extractChampionDetails(champ).then((res) =>{

                    storeChampion(res);
                    storeImage(res);

                }).catch((error) => {
                    console.log(error.message);
                });

            }catch (err) {
                console.log(err);
            }
        }

    }catch (err) {
        console.log(err);
    }
}
async function main() {

    olChampionList.then((list) =>{
        console.log(list.length);
        list.forEach(upsertChampionDetails);
        //storeBaseChampionInfoList()
        //storeSimulatorChampionInfoList()
        }
    ).catch((error) => {
        console.log(error.message);
    });

}











let seer =  {
    name: 'Deathknight',
    url: 'https://ayumilove.net/raid-shadow-legends-deathknight-skill-mastery-equip-guide/'
}





/*

extractChampionDetails(seer).then((res) =>{

    storeChampion(res);
   //storeImage(res);

    console.log(res.skills);

}).catch((error) => {
    console.log(error.message);
});


*/




main().then().catch((error) => {
    console.log(error.message);
});




storeBaseChampionInfoList()
storeSimulatorChampionInfoList()


