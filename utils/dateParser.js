const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require("dayjs/plugin/utc");
dayjs.extend(customParseFormat);

dayjs.extend(utc);
const SUPPORTED_FORMATS = ["DD/MM/YYYY", "DD/MM/YY", "YYYY-MM-DD","DD-MM-YYYY"];

function parseBirthDate(dateString){
    if(!dateString) return null;

    for(const format of SUPPORTED_FORMATS){
        const parsedDate =  dayjs.utc(dateString, format, true);
        if(parsedDate.isValid()){
            return parsedDate.toDate();
        }
    }

    const isoParsed = dayjs.utc(dateString, "YYYY-MM-DD", true);
    if(isoParsed.isValid()){
        return isoParsed.toDate();
    }

    return null;


}

module.exports = {
    parseBirthDate
}


