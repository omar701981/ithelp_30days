const fb_username = process.env.FB_USERNAME
const fb_userpass = process.env.FB_PASSWORD
const { By, until } = require('selenium-webdriver') // 從套件中取出需要用到的功能
exports.crawlerFB = crawlerFB;//讓其他程式在引入時可以使用這個函式

// FB有經典版以及新版的區分，兩者的爬蟲路徑不同，我們藉由函式取得各自的路徑
const { fb_head_path, fb_trace_path } = getCrawlerPath();

function getCrawlerPath () {
    if (process.env.FB_VERSION === 'new') {//如果是新版FB
        return {
            "fb_head_path": `//*[contains(@class,"fzdkajry")]`,
            "fb_trace_path": `//*[contains(@class,"knvmm38d")]`
        }
    } else {//如果為設定皆默認為舊版
        return {
            "fb_head_path": `//*[contains(@class,"_1vp5")]`,
            "fb_trace_path": `//*[@id="PagesProfileHomeSecondaryColumnPagelet"]//*[contains(@class,"_4bl9")]`
        }
    }
}

async function crawlerFB(driver) {    
    await loginFacebook(driver)
    const fanpage = "https://www.facebook.com/baobaonevertell/"
    await goFansPage(driver, fanpage)
    await driver.sleep(3000)
    await getTrace(driver)
}

async function loginFacebook(driver) {
    const web = 'https://www.facebook.com/login';//我們要前往FB
    await driver.get(web)//在這裡要用await確保打開完網頁後才能繼續動作

    //填入fb登入資訊
    const fb_email_ele = await driver.wait(until.elementLocated(By.xpath(`//*[@id="email"]`)));
    fb_email_ele.sendKeys(fb_username)
    const fb_pass_ele = await driver.wait(until.elementLocated(By.xpath(`//*[@id="pass"]`)));
    fb_pass_ele.sendKeys(fb_userpass)

    //抓到登入按鈕然後點擊
    const login_elem = await driver.wait(until.elementLocated(By.xpath(`//*[@id="loginbutton"]`)))
    login_elem.click()

    //因為登入這件事情要等server回應，你直接跳轉粉絲專頁會導致登入失敗
    await driver.wait(until.elementLocated(By.xpath(fb_head_path)))//用登入後才有的元件，來判斷是否登入
}

async function goFansPage(driver, web_url) {
    //登入成功後要前往粉專頁面
    await driver.get(web_url)
}

async function getTrace(driver) {
    let fb_trace = 0;//這是紀錄FB追蹤人數
    //因為考慮到登入之後每個粉專顯示追蹤人數的位置都不一樣，所以就採用全抓在分析
    
    const fb_trace_eles = await driver.wait(until.elementsLocated(By.xpath(fb_trace_path)))
    for (const fb_trace_ele of fb_trace_eles) {
        const fb_text = await fb_trace_ele.getText()
        if (fb_text.includes('人在追蹤')) {
            fb_trace = fb_text.replace(/\D/g, '')//只取數字
            break
        }
    }
    console.log(`FB追蹤人數：${fb_trace}`)
}