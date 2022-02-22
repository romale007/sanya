const path = require('path');
const puppeteer = require('puppeteer')

const args = [
	'--window-size=1280,1000',
	'--no-sandbox',
	'--disable-setuid-sandbox',
	'--disable-dev-shm-usage',
];

const selectors = {
	loginPage: {
		username: '#os_username',
		password: '#os_password',
		loginBtn: '#loginButton'
	},
	loggedPage: {
		userLink: '#user-menu-link'
	},
	downloadPage: {
		moreBtn: '#action-menu-link',
		exportToMarkdown: '#export-to-markdown'
		// exportToMarkdown: '#action-export-pdf-link' // for debug
	}
}

const headless = process.env.HEADLESS === 'true';
const init_url = process.env.INIT_URL || 'https://wiki.mos.social';
const download_page_url = process.env.DOWNLOAD_PAGE_URL || 'https://wiki.mos.social/pages/viewpage.action?pageId=275128103';

console.log('HEADLESS: ', headless);
console.log('init_url: ', init_url);
console.log('download_page_url: ', download_page_url);


const downloadPath = path.resolve(process.cwd(), 'downloads');

(async () => {
	const browser = await puppeteer.launch(
		{
			headless: headless,
			// slowMo: 30,
			ignoreHTTPSErrors: true,
			args: args
		}
	);
	const page = await browser.newPage();
	await page.setViewport({
		width: 1280,
		height: 1000
	});
	await page.goto(init_url);

	await page.waitForSelector(selectors.loginPage.username);

	await page.type(selectors.loginPage.username, process.env.LOGIN);
	await page.type(selectors.loginPage.password, process.env.PASSWORD);
	await page.click(selectors.loginPage.loginBtn);

	await page.waitForSelector(selectors.loggedPage.userLink);

	await page.goto(download_page_url);

	await page.waitForSelector(selectors.downloadPage.moreBtn);
	await page.click(selectors.downloadPage.moreBtn);

	const client = await page.target().createCDPSession();
	await client.send('Browser.setDownloadBehavior', {
		behavior: "allow",
		downloadPath: downloadPath,
		eventsEnabled: true,
	});

	client.on('Browser.downloadWillBegin', (res) =>
		console.log("[Browser.downloadWillBegin]", res)
	);
	client.on('Browser.downloadProgress', async (res) => {
		console.log("[Browser.downloadProgress]", res);
		res.state === 'completed' ? await browser.close() : null
	}

	);
	await page.click(selectors.downloadPage.exportToMarkdown);
})()

