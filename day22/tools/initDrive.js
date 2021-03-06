exports.initDrive = initDrive;//讓其他程式在引入時可以使用這個函式
const path = require('path');//用於處理文件路徑的小工具
const fs = require("fs");//讀取檔案用
const webdriver = require('selenium-webdriver') // 加入虛擬網頁套件
const chrome = require('selenium-webdriver/chrome');
const options = new chrome.Options();
options.setUserPreferences({ 'profile.default_content_setting_values.notifications': 1 });//因為FB會有notifications干擾到爬蟲，所以要先把它關閉
options.addArguments('blink-settings=imagesEnabled=false')//不加載圖片提高效率
options.addArguments('--headless')//瀏覽器不提供頁面觀看，linux下如果系統是純文字介面不加這條會啓動失敗
options.addArguments('--log-level=3')//這個option可以讓你跟headless時網頁端的console.log說掰掰
//下面參數能提升爬蟲穩定性
options.addArguments('--disable-dev-shm-usage')//使用共享內存RAM
options.addArguments('--disable-gpu')//規避部分chrome gpu bug


async function initDrive() {
    if (!checkDriver()) {// 檢查Driver是否是設定，如果無法設定就結束程式
        return
    }


    let driver = await new webdriver.Builder().forBrowser("chrome").withCapabilities(options).build();// 建立這個browser的類型
    //考慮到ig在不同螢幕寬度時的Xpath不一樣，所以我們要在這裡設定統一的視窗大小
    await driver.manage().window().setRect({ width: 1280, height: 800, x: 0, y: 0 });

    return driver
}

function checkDriver() {
    try {
        chrome.getDefaultService()//確認是否有預設
    } catch {
        console.warn('找不到預設driver!');
        const file_path = '../../chromedriver.exe'//請注意因為改到tools底下執行，所以chromedriver.exe的相對位置需要變更
        console.log(path.join(__dirname, file_path));//請確認印出來日誌中的位置是否與你路徑相同
        if (fs.existsSync(path.join(__dirname, file_path))) {//確認路徑下chromedriver.exe是否存在            
            const service = new chrome.ServiceBuilder(path.join(__dirname, file_path)).build();//設定driver路徑
            chrome.setDefaultService(service);
            console.log('設定driver路徑');
        } else {
            console.error('無法設定driver路徑');
            return false
        }
    }
    return true
}