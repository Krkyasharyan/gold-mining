
const fs = require('fs');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fastcsv = require('fast-csv');
const UserAgent = require('user-agents');
puppeteer.use(StealthPlugin());
const { parse_NSBank, parse_SovComBank } = require('./parsers');

async function scrapeBankWebsite(bank_name, url, isImposter) {
  
  try {
    const browser = await puppeteer.launch({ headless: 'new'}); // false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Create a new random user-agent
    const userAgent = new UserAgent({ deviceCategory: 'desktop'});
    const userAgentData = userAgent.data;

    // Set up headers with userAgent data
    const headers = {
      "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
      "Accept-Encoding": 'gzip, deflate, br',
      "Accept-Language": 'ru-RU;q=0.9',
      "Cache-Control": 'max-age=0',
      "Sec-Ch-Ua": `"${userAgentData.vendor};v="${userAgentData.browserVersion}, "Not?A_Brand";v="24"`,
      "Sec-Ch-Ua-Mobile": '?0',
      "Sec-Ch-Ua-Platform": `"${userAgentData.platform}"`,
      "Sec-Fetch-Dest": 'document',
      "Sec-Fetch-Mode": 'navigate',
      "Sec-Fetch-Site": 'same-origin',
      "Sec-Fetch-User": '?1',
      "Upgrade-Insecure-Requests": '1',
      "User-Agent": userAgent.toString(),
    };
    await page.setExtraHTTPHeaders(headers);

    // Set viewport to match the userAgent's viewport dimensions
    await page.setViewport({ 
      width: userAgentData.viewportWidth, 
      height: userAgentData.viewportHeight 
    });

    // Disable WebDriver flag
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    let data;

    if (bank_name === 'NSBank') {
        data = await parse_NSBank(page, url, isImposter);
    } else if (bank_name === 'SovComBank') {
        data = await parse_SovComBank(page, url, isImposter);
    }

    await browser.close();
    return data;
  } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
  }
}

function writeDataToCSV(data, includeHeaders) {
  const csvFilePath = "data.csv";
  const csvStream = fastcsv.format({ headers: includeHeaders, includeEndRowDelimiter: true });

  if (fs.existsSync(csvFilePath) && !includeHeaders) {
    csvStream.pipe(fs.createWriteStream(csvFilePath, { flags: 'a' }));
  } else {
    csvStream.pipe(fs.createWriteStream(csvFilePath));
  }

  data.forEach(row => csvStream.write({ 
    bank_name: row.bank_name, 
    gold_weight: row.grams, 
    price: row.price 
  }));
  csvStream.end();
}

(async () => {
  let banksToScrape = [];
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Reading from bank_list.json...");
    banksToScrape = JSON.parse(fs.readFileSync('bank_list.json', 'utf8'));
  } else {
    const [bankName, bankURL, isImposter] = args;
    banksToScrape.push({ bankName, bankURL, isImposter});
  }

  let includeHeaders = true;
  for (const bank of banksToScrape) {
    const data = await scrapeBankWebsite(bank.bankName, bank.bankURL, bank.isImposter);
    writeDataToCSV(data, includeHeaders);
    includeHeaders = false;
  }
})();
