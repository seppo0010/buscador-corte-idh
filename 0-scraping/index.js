const fs = require('fs');
const path = require('path');
const { connect } = require("puppeteer-real-browser");

const dataDir = path.resolve(process.env.DATA_DIR || './data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const runForURL = async (url) => {
  const { browser, page } = await connect({
    headless: false,
    args: [],
    customConfig: {
      userPrefs: {
        "plugins.always_open_pdf_externally": true,
        "download.default_directory": dataDir,
        "download.prompt_for_download": false,
        "download.directory_upgrade": true,
        "pdfjs.disabled": true
      }
    },
    turnstile: true,
    connectOption: {},
    disableXvfb: true,
    ignoreAllFlags: false,
  });

  const waitForSelectorCustom = async (p, selector, timeout = 60000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const exists = await p.evaluate((s) => !!document.querySelector(s), selector);
      if (exists) return true;
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  };

  try {
    const existingFiles = fs.readdirSync(dataDir);
    
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    
    console.log(`Waiting for selector '.search-result a' (custom)...`);
    await waitForSelectorCustom(page, '.search-result a', 60000);

    console.log('Searching for links...');
    const resultsSelector = '.search-result a';
    
    const linksToDownload = await page.evaluate((selector, existing) => {
      const anchors = Array.from(document.querySelectorAll(selector));
      return anchors
        .map(a => {
          const segments = a.href.split('/');
          const filename = segments[segments.length - 1];
          // Force HTTPS to avoid 403 errors on direct HTTP requests
          const href = a.href.replace(/^http:\/\//, 'https://');
          return { href, filename };
        })
        .filter(item => {
          const matchesCriteria = 
            (
              item.href.startsWith('https://www.corteidh.or.cr/docs/casos/articulos/seriec_') ||
              item.href.startsWith('https://www.corteidh.or.cr/docs/opiniones/seriea_')
            ) &&
            item.href.endsWith('_esp.pdf');
          return matchesCriteria && !existing.includes(item.filename);
        });
    }, resultsSelector, existingFiles);

    console.log(`Found ${linksToDownload.length} new files to download.`);

    const BATCH_SIZE = 5;
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const cookies = await page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    for (let i = 0; i < linksToDownload.length; i += BATCH_SIZE) {
      const batch = linksToDownload.slice(i, i + BATCH_SIZE);
      console.log(`Downloading batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} files)...`);
      
      await Promise.all(batch.map(async (item) => {
        try {
          const response = await fetch(item.href, {
            headers: {
              'User-Agent': userAgent,
              'Cookie': cookieString,
              'Referer': url
            }
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const arrayBuffer = await response.arrayBuffer();
          const filePath = path.join(dataDir, item.filename);
          fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
          console.log(`Downloaded: ${item.filename}`);
        } catch (err) {
          console.error(`Failed to download ${item.filename}: ${err.message}`);
        }
      }));

      if (i + BATCH_SIZE < linksToDownload.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log(`Finished processing for ${url}`);
    await browser.close();
  } catch (e) {
    await page.screenshot({
      path: 'failed.jpg'
    });
    throw e;
  }
};
(async () => {
  try {
    console.log('Starting scraping for Casos/Sentencias...');
    await runForURL('https://www.corteidh.or.cr/casos_sentencias.cfm');
    
    console.log('Starting scraping for Opiniones Consultivas...');
    await runForURL('https://www.corteidh.or.cr/opiniones_consultivas.cfm');
  } catch (error) {
    console.error('Fatal error during execution:', error);
    process.exit(1);
  }
})()
