const axios = require("axios");
const {JSDOM} = require("jsdom");
const {Champion} = require('../classes/Champion')
const champList = async (url) => {

    try {
        let championList = [];
        const { data } = await axios.get(url);

        const dom = new JSDOM(data);
        const { document } = dom.window;
        const u1 = document.querySelector("ol");
        const champs  = u1.querySelectorAll("li");

        for(let champ of champs) {
            //Extracts the champions name from the listing. Champions name is always the first element before the '|'
            if(!(champ.textContent.includes('Champion List') || champ.textContent.includes('Guide') || champ.textContent.startsWith('Raid Shadow Legends'))) {

                championList[championList.length] = new Champion(champ.textContent.split('|')[0].split('(')[0].trim(),`https:${champ.querySelector("a")?.href}`);
            }
        }
        console.log(championList.length);
        return championList;

    } catch (error) {
        console.log(error)
    }
};

exports.champList = champList;
//champList('https://ayumilove.net/raid-shadow-legends-patch-notes-2021/#patch500-20211221').then(r=>console.log(r)).catch(err=>console.log(err))
