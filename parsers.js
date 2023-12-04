const cheerio = require('cheerio');

async function parse_NSBank(page, url, isImposter) {

    console.log('Navigating to the data URL...');
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Mimic human-like interactions if imposter
    if (isImposter) {
        await randomHumanDelay(page);
    }

    // Existing parsing logic for NSBank
    const data = [];
    const items = await page.$$('body > main > div:nth-child(2) > div:nth-child(2) > div > div > div.row > div.col-md-8.my-3 > div' + ' .currency__item');
    for (let item of items) {
        const grams = await page.evaluate(el => el.querySelector('.currency__operation-name').textContent.trim(), item);
        const price = await page.evaluate(el => el.querySelector('.currency__operation-price').textContent.trim(), item);
        data.push({ bank_name: 'NSBank', grams, price: price.replace(/\s/g, '') });
    }
    return data;
}

async function parse_SovComBank(page, url, isImposter) {
    console.log('Navigating to the data URL...');
    await page.goto(url);

    // Mimic human-like interactions if imposter
    if (isImposter) {
        await randomHumanDelay(page);
    }

    // Wait for the specific selector
    await page.waitForSelector('#table-metals > div:nth-child(3) > div > div > div:nth-child(2)');
    const elementHandle = await page.$('#table-metals > div:nth-child(3) > div > div > div:nth-child(2)');
    const htmlContent = await elementHandle.evaluate(node => node.innerHTML);

    console.log(htmlContent);
    const $ = cheerio.load(htmlContent);
    const data = [];

    // Iterate through each row of the table
    $('div.grid.items-center.grid-cols-5.py-4').each((index, element) => {
        const cells = $(element).find('.leading-snug');
        const grams = cells.eq(0).text().trim(); // Номинал слитка, грамм
        const price = cells.eq(2).text().trim(); // Цена продажи, ₽ за слиток
        data.push({ 
            bank_name: 'SovComBank', 
            grams, 
            price: price.replace(/\s/g, '') 
        });
    
});

async function randomHumanDelay(page) {
    await page.waitForTimeout(Math.random() * 5000 + 3000);
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  }

console.log(data);
return data;
}

module.exports = {
  parse_NSBank,
  parse_SovComBank
};