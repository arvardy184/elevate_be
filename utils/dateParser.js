const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require("dayjs/plugin/utc");
dayjs.extend(customParseFormat);
dayjs.extend(utc);

const SUPPORTED_FORMATS = [
  "DD/MM/YYYY", 
  "DD/MM/YY", 
  "DD-MM-YYYY", 
  "YYYY-MM-DD"
];

function parseBirthDate(dateString) {
  if (!dateString) return null;

  // Coba semua format yang didukung
  for (const format of SUPPORTED_FORMATS) {
    const parsedDate = dayjs.utc(dateString, format, true);
    if (parsedDate.isValid()) {
      console.log(`[parseBirthDate] Parsed "${dateString}" with format "${format}" -> ${parsedDate.format()}`);
      return parsedDate.toDate();
    }
  }

  // Fallback: coba parsing sebagai ISO (tanpa strict format)
  const isoParsed = dayjs.utc(dateString);
  if (isoParsed.isValid()) {
    console.log(`[parseBirthDate] Parsed "${dateString}" as ISO -> ${isoParsed.format()}`);
    return isoParsed.toDate();
  }

  console.log(`[parseBirthDate] Failed to parse "${dateString}"`);
  return null;
}

module.exports = {
  parseBirthDate
};


