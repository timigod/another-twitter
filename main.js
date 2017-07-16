const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const notify = require('electron-main-notification')

const path = require('path')
const url = require('url')
const Menu = electron.Menu;

const dialog = require('electron').dialog;
const OauthTwitter = require('electron-oauth-twitter')
const keytar = require('keytar')
const Twitter = require('twitter')
const fs = require('fs');
const consumerKey = 'OyWHz72pjHN2BU6CmIx5mg1LX'
const consumerSecret = 'BwdaNngCpIAeEOYTYWGniW40dGXAPMQer3fqjW9HYsyLPRMOdY'
const Store = require('electron-store');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({width: 500, height: 775, 'minHeight': 500, 'minWidth': 350})

  mainWindow.loadURL(url.format({
    pathname: 'mobile.twitter.com',
    protocol: 'https:',
    slashes: true
  }))

  // mainWindow.webContents.openDevTools()

  const oauth = new OauthTwitter({
    key: consumerKey,
    secret: consumerSecret
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
            if (error) throw error;
            store.set('id', obj.id_str)
            store.set('screenName', obj.screen_name)
            startStream()
          });
        }


      }
    })

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


        stream.on('data', (tweet) => {
          console.log(tweet.text)
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

    if (tweet.user.id_str != id && tweet.user.screen_name != screenName) {
      notify(tweet.user.screen_name, {body: tweet.text}, () => {

      })
    }
  }

}


const menuTemplate = [
  {
    label: 'Twitter',
    submenu: [
      {
        label: 'Enable Notifications',
        click(){
          credentials()
            .then(([accessToken, secret]) => {
              if (accessToken && secret) {
                dialog.showErrorBox('Enable Notifications', 'Notifications have already been enabled')
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


