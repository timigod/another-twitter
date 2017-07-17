const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const notify = require('electron-main-notification')
const path = require('path')
const url = require('url')
const open = require('open')
const fs = require('fs');
const Menu = electron.Menu;
const Store = require('electron-store');
const keytar = require('keytar')
const dialog = require('electron').dialog
const Twitter = require('twitter')
const consumerKey = 'OyWHz72pjHN2BU6CmIx5mg1LX'
const consumerSecret = 'BwdaNngCpIAeEOYTYWGniW40dGXAPMQer3fqjW9HYsyLPRMOdY'
const OauthTwitter = require('electron-oauth-twitter')
const oauth = new OauthTwitter({
  key: consumerKey,
  secret: consumerSecret
})

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let prefsWindow
let isPrefsOpen = false

function createWindow() {

  mainWindow = new BrowserWindow({width: 350, height: 675, 'minHeight': 500, 'minWidth': 350})

  mainWindow.loadURL(url.format({
    pathname: 'mobile.twitter.com',
    protocol: 'https:',
    slashes: true
  }))

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    open(url);
  })

  mainWindow.webContents.on('did-finish-load', function () {

    fs.readFile(__dirname + '/custom.css', "utf-8", function (error, data) {
      if (!error) {
        var formatedData = data.replace(/\s{2,10}/g, ' ').trim()
        mainWindow.webContents.insertCSS(formatedData)
      }
    })
  })

  setUpTwitterClient()

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)


  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

function credentials() {
  return Promise.all([
    keytar.getPassword('TwitterOauth', 'AccessToken'),
    keytar.getPassword('TwitterOauth', 'Secret')
  ])
}

function setUpTwitterClient() {
  credentials()
    .then(([accessToken, secret]) => {
      if (accessToken && secret) {
        const client = new Twitter({
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          access_token_key: accessToken,
          access_token_secret: secret
        })

        const store = new Store();
        const screenName = store.get('screen_name')
        const id = store.get('id')

        if (id && screenName) {
          startStream()
        } else {
          client.get('account/verify_credentials', function (error, obj, response) {
            if (error) console.log(error)
            store.set('id', obj.id_str)
            store.set('screenName', obj.screen_name)
            startStream()
          });
        }

      }
    }).catch((error) => {
    setTimeout(setUpTwitterClient, 960000);
  })
}

function startStream() {
  credentials()
    .then(([accessToken, secret]) => {
      const client = new Twitter({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token_key: accessToken,
        access_token_secret: secret
      })

      const stream = client.stream('user', {
        with: 'user'
      })

      let code = `let notificationsFieldset = document.getElementById('notifications_fieldset');
            let notificationsToggle = document.getElementById('toggle_notifications');
            notificationsToggle.checked = true;
            notificationsFieldset.disabled = false;`

      const store = new Store();
      store.set('notifications?', 'on')

      if (prefsWindow) {
        prefsWindow.webContents.executeJavaScript(code)
      }

      stream.on('data', (tweet) => {
        displayNotification(tweet)
      })

      stream.on('error', (error) => {
        throw(error);
      })
    })
}


function displayNotification(tweet) {
  const store = new Store()
  const screenName = store.get('screenName')
  const id = store.get('id')
  const isOn = store.get('notifications?')

  if (tweet.user.id_str != id && tweet.user.screen_name != screenName && isOn == "on") {
    notify(tweet.user.screen_name, {body: tweet.text}, () => {

    })
  }
}


const menuTemplate = [
  {
    label: 'Twitter',
    submenu: [
      {
        label: 'Preferences',
        click(){
          openPreferences();
        }
      },
      {
        label: "Quit", accelerator: "Command+Q",
        click() {
          app.quit();
        }
      }
    ]
  },
  {
    label: "Edit",
    submenu: [
      {label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:"},
      {label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:"},
      {type: "separator"},
      {label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:"},
      {label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:"},
      {label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:"},
      {label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:"}
    ]
  }
]

function openPreferences() {
  if (!isPrefsOpen) {
    prefsWindow = new BrowserWindow({width: 400, height: 500, 'minHeight': 500, 'minWidth': 400})
    prefsWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'preferences.html'),
      protocol: 'file:',
      slashes: true
    }))

    prefsWindow.webContents.on('did-finish-load', () => {
      isPrefsOpen = true
    })

    prefsWindow.webContents.on('closed', () => {
      isPrefsOpen = false
    })

    // TODO: Remove this
    // prefsWindow.webContents.openDevTools()
  }
}

function isAuthed() {
  return credentials()
    .then(([accessToken, secret]) => {
      if (accessToken && secret) return true
      return false
    })
}

global.isAuthed = isAuthed()
global.auth = function () {
  isAuthed()
    .then((bool) => {
      if (bool) {
        dialog.showErrorBox('Authorize for Notifications', 'You have already authorized this application')
      } else {
        dialog.showErrorBox('Enable Notifications', 'To enable notifications, you will have to grant this application read and write access to your Twitter Account.' +
          'This is completely separate from the initial signing in you did earlier. In the earlier case, you were signing in to Twitter\'s mobile web application directly.')
        oauth.startRequest().then((result) => {
          return Promise.all([
            keytar.setPassword('TwitterOauth', 'AccessToken', result.oauth_access_token),
            keytar.setPassword('TwitterOauth', 'Secret', result.oauth_access_token_secret)
          ])
        }).then(() => {
          setUpTwitterClient();
        }).catch((error) => {
          console.error(error, error.stack);
        })
      }
    })
}


