const ig_username = process.env.IG_USERNAME
const ig_userpass = process.env.IG_PASSWORD
const { By, until } = require('selenium-webdriver') // 從套件中取出需要用到的功能

exports.crawlerIG = crawlerIG;//讓其他程式在引入時可以使用這個函式

async function crawlerIG (driver) {
    const isLogin = await loginInstagram(driver, By, until)
    if (isLogin) {//如果登入成功才執行下面的動作
        const fanpage = "https://www.instagram.com/baobaonevertell/" // 筆者是寶寶不說的狂熱愛好者
        const isGoFansPage = await goFansPage(driver, fanpage)
        if (isGoFansPage) {
            await driver.sleep(3000)
            const trace = await getTrace(driver)
            console.log(`IG追蹤人數：${trace}`)
        }
    }
}

async function loginInstagram (driver) {
    const web = 'https://www.instagram.com/accounts/login';//前往IG登入頁面
    try {
        await driver.get(web)//在這裡要用await確保打開完網頁後才能繼續動作

        //填入ig登入資訊
        let ig_username_ele = await driver.wait(until.elementLocated(By.css("input[name='username']")), 3000);
        ig_username_ele.sendKeys(ig_username)
        let ig_password_ele = await driver.wait(until.elementLocated(By.css("input[name='password']")), 3000);
        ig_password_ele.sendKeys(ig_userpass)

        //抓到登入按鈕然後點擊
        const login_elem = await driver.wait(until.elementLocated(By.css("button[type='submit']")), 3000)
        login_elem.click()

        //登入後才會有右上角功能列，我們以這個來判斷是否登入
        await driver.wait(until.elementLocated(By.xpath(`//*[@id="react-root"]//*[contains(@class,"_47KiJ")]`)), 5000)
        return true
    } catch (e) {
        console.error('IG登入失敗')
        console.error(e)
        return false
    }
}

async function goFansPage (driver, web_url) {
    //登入成功後要前往粉專頁面
    try {
        await driver.get(web_url)
        return true
    } catch (e) {
        console.error('無效的網址')
        console.error(e)
        return false
    }
}

async function getTrace (driver) {
    let ig_trace = 0;//這是紀錄IG追蹤人數
    try {
        const ig_trace_xpath = `//*[@id="react-root"]/section/main/div/header/section/ul/li[2]/a/span`
        const ig_trace_ele = await driver.wait(until.elementLocated(By.xpath(ig_trace_xpath)), 5000)//我們採取5秒內如果抓不到該元件就跳出的條件    
        // ig因為當人數破萬時文字不會顯示，所以改抓title
        ig_trace = await ig_trace_ele.getAttribute('title')
        ig_trace = ig_trace.replace(/\D/g, '')//只取數字

        return ig_trace
    } catch (e) {
        console.error('無法抓取IG追蹤人數')
        console.error(e)
        return null
    }
}