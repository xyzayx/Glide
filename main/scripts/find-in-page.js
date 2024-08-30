
const { ipcMain, BrowserWindow, BrowserView} = require('electron')

function make_it(){
   // doesnt work quite right without the web prefs below.
   // some combination of these is what makes it work. im not quite sure which.
   // so just let these options be.
   let finder = new BrowserView({
       webPreferences: {
           webSecurity: false,
           allowRunningInsecureContent: true,
           nodeIntegration: true,
           nodeIntegrationInWorker: true,
           nodeIntegrationInSubFrames: true,
           scrollBounce: false,
           contextIsolation: false,
       },
   })

   finder.webContents.loadFile('./renderer/find.html').then(() => {
      finder.webContents.focus()
   })

   return finder
}

function position_it(finder, win){
    finder.setBounds({
        x: Math.max(win.getBounds().width - 300 - 30, 0),
        y: 0,
        width: 300,
        height: 60
    })
}

const open_finder = exports.open_finder = function() {
    let win = BrowserWindow.getFocusedWindow()
    if (!win.finder) {
        let finder = make_it()
        win.addBrowserView(finder)
        position_it(finder, win)
        win.finder = finder

        win.webContents.on('found-in-page', (event, result) => {
            finder.webContents.send('found', result)
        })

        win.on('resize', () => position_it(finder, win))
        
    } else {
        win.addBrowserView(win.finder)
        position_it(win.finder, win)
        win.finder.webContents.focus()
    }
}

const close_finder = exports.close_finder = function(event, text) {
    let win = BrowserWindow.getFocusedWindow()
    win.webContents.stopFindInPage('clearSelection')
    if (win.finder) {
        win.removeBrowserView(win.finder)
        win.webContents.focus()
    }
}

ipcMain.on('find', (event, text) => {
    let win = BrowserWindow.getFocusedWindow()
    if (!win) return // this is needed due to visibility change in find.html. it even fires when you go to a different app than glide and when you come back, the change event fires.
    if (text.length > 0) {
        win.webContents.findInPage(text)
    } else {
        win.webContents.stopFindInPage('clearSelection')
    }
})

ipcMain.on('close_finder', close_finder)