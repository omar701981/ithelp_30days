const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const dateFormat = require('dateformat');
require('dotenv').config({ path: '../../.env' }) //載入.env環境檔
exports.updateGoogleSheets = updateGoogleSheets;//讓其他程式在引入時可以使用這個函式

// If modifying these scopes, delete token.json.
// 原本的範本是有readonly，這樣只有讀取權限，拿掉後什麼權限都有了
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'tools/google_sheets/token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize (credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken (oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

async function getSheets (auth) {//取得Google Sheets所有的sheet
  const sheets = google.sheets({ version: 'v4', auth });
  const request = {
    spreadsheetId: process.env.SPREADSHEET_ID,
    includeGridData: false,
  }
  try {
    let response = (await sheets.spreadsheets.get(request)).data;
    const sheets_info = response.sheets
    return sheets_info
  } catch (err) {
    console.error(err);
  }
}

function genSheetId (sheet_id_array) {
  let sheet_id = parseInt(Math.random() * 10000)
  while (sheet_id_array.includes(sheet_id)) {//如果存在就要在產生一次
    sheet_id = parseInt(Math.random() * 10000)
  }
  return sheet_id
}

async function addSheet (title, sheet_id, auth) {//新增一個sheet到指定的Google Sheets
  const sheets = google.sheets({ version: 'v4', auth });
  const request = {
    // The ID of the spreadsheet
    "spreadsheetId": process.env.SPREADSHEET_ID,
    "resource": {
      "requests": [{
        "addSheet": {//這個request的任務是addSheet
          // 你想給這個sheet的屬性
          "properties": {
            "sheetId": sheet_id,//必須為數字，且這個欄位是唯一值
            "title": title
          }
        },
      }]
    }
  };
  try {
    await sheets.spreadsheets.batchUpdate(request)
    console.log('added sheet:' + title)
  }
  catch (err) {
    console.log('The API returned an error: ' + err);
  }
}

async function getFBIGSheet (auth) {// 確認Sheet是否都被建立，如果還沒被建立，就新增
  const sheets = [//我們Google Sheets需要的sheet
    { title: 'FB粉專', id: null },
    { title: 'IG帳號', id: null }
  ]
  const online_sheets = await getSheets(auth)//抓目前存在的sheet
  let sheet_id_array = []
  online_sheets.forEach(online_sheet => {//抓出已經存在的sheet_id避免產生出一樣的id
    sheet_id_array.push(online_sheet.properties.sheetId)
  })

  for (sheet of sheets) {
    online_sheets.forEach(online_sheet => {
      if (sheet.title == online_sheet.properties.title) {// 如果線上已經存在相同的sheet title就直接使用相同id
        sheet.id = online_sheet.properties.sheetId
      }
    })
    if (sheet.id == null) {//如果該sheet尚未被建立，則建立
      console.log(sheet.title + ':not exsit')
      let sheet_id = genSheetId(sheet_id_array)
      sheet_id_array.push(sheet_id)
      try {
        await addSheet(sheet.title, sheet_id, auth)//如果不存在就會新增該sheet
        sheet.id = sheet_id
      } catch (e) {
        console.error(e)
      }
    }
  }
  return sheets;
}

async function writeSheet (title, result_array, auth) {
  // 先在第一欄寫入title(粉專名稱)
  let title_array = result_array.map(fanpage => [fanpage.title]);
  // 填上名稱
  title_array.unshift([title])//unshift是指插入陣列開頭
  await writeTitle(title, title_array, auth)

  // 取得目前最後一欄
  let lastCol = await getLastCol(title, auth)

  // 再寫入trace(追蹤人數)
  let trace_array = result_array.map(fanpage => [fanpage.trace]);
  // 抓取當天日期
  const datetime = new Date()
  trace_array.unshift([dateFormat(datetime, "GMT:yyyy/mm/dd")])
  await writeTrace(title, trace_array, lastCol, auth)
}

async function writeTitle (title, title_array, auth) {//title都是寫入第一欄
  const sheets = google.sheets({ version: 'v4', auth });
  const request = {
    spreadsheetId: process.env.SPREADSHEET_ID,
    valueInputOption: "USER_ENTERED",// INPUT_VALUE_OPTION_UNSPECIFIED|RAW|USER_ENTERED
    range: [
      `'${title}'!A:A`
    ],
    resource: {
      values: title_array
    }
  }
  try {
    await sheets.spreadsheets.values.update(request);
    console.log(`updated ${title} title`);
  } catch (err) {
    console.error(err);
  }
}

async function getLastCol (title, auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const request = {
    spreadsheetId: process.env.SPREADSHEET_ID,
    ranges: [
      `'${title}'!A1:ZZ1`
    ],
    majorDimension: "COLUMNS",
  }
  try {
    let values = (await sheets.spreadsheets.values.batchGet(request)).data.valueRanges[0].values;
    // console.log(title + " StartCol: " + toColumnName(values.length + 1))
    return toColumnName(values.length + 1)
    // return web_name_array
  } catch (err) {
    console.error(err);
  }
}

function toColumnName (num) {//Google Sheets無法辨認數字欄位，需轉為英文才能使用
  for (var ret = '', a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
    ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret;
  }
  return ret;
}

async function writeTrace (title, trace_array, lastCol, auth) {//填入追蹤者人數
  const sheets = google.sheets({ version: 'v4', auth });
  const request = {
    spreadsheetId: process.env.SPREADSHEET_ID,
    valueInputOption: "USER_ENTERED",// INPUT_VALUE_OPTION_UNSPECIFIED|RAW|USER_ENTERED
    range: [
      `'${title}'!${lastCol}:${lastCol}`
    ],
    resource: {
      values: trace_array
    }
  }
  try {
    await sheets.spreadsheets.values.update(request);
    console.log(`updated ${title} trace`);
  } catch (err) {
    console.error(err);
  }
}
function getAuth () {
  return new Promise((resolve, reject) => {
    try {
      const content = JSON.parse(fs.readFileSync('tools/google_sheets/credentials.json'))
      authorize(content, auth => {
        resolve(auth)
      })
    } catch (err) {
      console.error('憑證錯誤');
      reject(err)
    }
  })
}
async function updateGoogleSheets (ig_result_array, fb_result_array) {
  try {
    const auth = await getAuth()
    let sheets = await getFBIGSheet(auth)//取得線上FB、IG的sheet資訊
    for (sheet of sheets) {
      if (sheet.title === 'FB粉專') {
        await writeSheet(sheet.title, fb_result_array, auth)
      } else if (sheet.title === 'IG帳號') {
        await writeSheet(sheet.title, ig_result_array, auth)
      }
    }
    console.log('成功更新Google Sheets');
  } catch (err) {
    console.error('更新Google Sheets失敗');
    console.error(err);
  }
}