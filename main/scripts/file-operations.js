
const {app, BrowserWindow, BrowserView, dialog, ipcMain} = require('electron')

const fs = require('fs')

var config = require('./config')

// For some reason Browserview doesnt have an inspectElement function.
// From https://github.com/electron/electron/blob/44491b023ac2653538b7ac36bb73f3085a938666/lib/browser/api/browser-window.ts you can see line 134 essentially aliases the webcontents inspectElement to the browserWindow prototype.
// I need this function on the browserView prototype because electron-context-menu expects inspectelement function on the window that is passed to it whether it is a browserview or a browserwindow. See https://github.com/sindresorhus/electron-context-menu/blob/798b616103a950c8d72dee3a9ad4c951a33b90f7/index.js
// so provide this api for electron context menu and it works.
BrowserView.prototype.inspectElement = function (...args) {
  return this.webContents.inspectElement(...args);
};

//======================================================================================================================

const new_file  = exports.new_file = () => {
  create_window()
}

let WEB_PREFS = {
  webSecurity: false,
  allowRunningInsecureContent: true,
  nodeIntegration: true,
  nodeIntegrationInWorker: true,
  nodeIntegrationInSubFrames: true,
  scrollBounce: true,
  contextIsolation: false,
  backgroundThrottling: false, // otherwise timers and even network downloads, slow down or misbehave when app is bg.
  v8CacheOptions: (app.isPackaged ? 'code' : 'none'),
}

function create_window() {

  let tutils = require('./theme-utils')
  let window_bg = tutils.get_effective_theme_bg_for_window(config.settings.theme, config) // recalc so no flash on new windows.

  console.log(window_bg)
  let new_win_opts = {
    width: 1200,
    height: 750,
    backgroundColor: window_bg, // this is to prevent flash occuring.
    webPreferences: WEB_PREFS,
  }

  let current_win = BrowserWindow.getFocusedWindow()
  if (!!current_win && current_win.isNormal()){ // not in maxed, minimized, or full screen.
    let pos = current_win.getPosition()
    new_win_opts.x = pos[0] + 20
    new_win_opts.y = pos[1] + 20
  }
  const win = new BrowserWindow(new_win_opts)
  win.on('close', e => {e.sender = win; 
    try{
      handle_closing(e)
    }catch(err){
      console.log(err)
    }
  })
  win.loadFile('./renderer/index.html') 

  if (!app.isPackaged){// development
    // win.webContents.openDevTools()
    // win.webContents.on('devtools-opened', () => {
    //   win.webContents.focus()
    // })
  }

  win.webContents.on('did-finish-load', () => {

    add_results_view(win)
    
    ensure_links_open_in_browser(win)
    ensure_links_open_in_browser(win.results)

    // Reload default-config and config on each load of page, so that any changes in default config is reflected on page reload. The reload itself is orchestrated from the main/index.js file by watching for file changes.
    delete require.cache[require.resolve('./default-config')]
    delete require.cache[require.resolve('./config')]
    config = require('./config')
    effective_theme = tutils.get_effective_theme(config.settings.theme, config)

    win.webContents.send('theme', effective_theme) // send this first to avoid restyling visibly
    win.webContents.send('config', config)
    win.webContents.send('app_is_packaged', app.isPackaged)

    win.results.webContents.loadFile('./renderer/results_view.html').then(() => {
      win.results.webContents.send('theme', effective_theme) // also send to results view
    }).catch(console.log)

    // win.results.webContents.openDevTools()

  })

  return win
}

const add_results_view = exports.add_results_view = (win) => {
    const results = new BrowserView({webPreferences: WEB_PREFS})
    win.addBrowserView(results)
    import('electron-context-menu').then(ctx => ctx.default({window: results, showInspectElement: true}))
    win.results = results
    win.top_browser_view = results
}

function ensure_links_open_in_browser(win){
  win.webContents.on('will-navigate', (event, url) => {
      event.preventDefault()
      require('electron').shell.openExternal(url) // open in your browser, not in electron
    })
}

// there is a bug in electron that makes this necessary, at least for now. it maybe be fixed
// in the future, when this might create issues. will have to unfix this fix then.
const get_title_bar_height = exports.get_title_bar_height = (window) => {
  const contentSize = window.getContentSize();
  const windowSize = window.getSize();
  // Calculate the height of the title bar
  return windowSize[1] - contentSize[1];
}

function position_results_view(win, w, h){
  // in case devtools is open for the main page, you want viewport height, so both devtools can be accessed.
  const win_bounds = win.getBounds()
  win.results.setBounds({
      x: Math.max(win_bounds.width - w, 0),
      y: get_title_bar_height(win), // bug in electron, so fix that. may change in future.
      width: w,
      height: h
  })
}

ipcMain.on('viewport-resized', (e, width, height) => {
  let win = e.sender.getOwnerBrowserWindow()
  position_results_view(win, width, height)
})

const toggle_pane_devtools = exports.toggle_pane_devtools = () => {
  let win = BrowserWindow.getFocusedWindow()
  win.top_browser_view.webContents.toggleDevTools()
}

//======================================================================================================================

function handle_closing(e){
  e.preventDefault()
  let win = e.sender

  let gutils = require('../../common/utils')
  let got_file_edited_status = gutils.with_time_limit(200, true, (resolve, reject) => {
    let is_edited = is_file_editedp(win) // this is an async func and returns a promise.
    is_edited.then((yes_or_no) => {
      resolve(yes_or_no) // this resolves with_time_limit promise. may have resolved already if time limit was reached.
    })
  })

  got_file_edited_status.then(did_change => {
    if(did_change){
      // may have changed, or figuring out if it did change took too long.
      // in both cases show dialog.
      win.show()
      win.focus()
      let action = dialog.showMessageBoxSync(win, {
        message: 'Save file before closing?',
        detail: "Any modifications made to the file since the last save will be lost if you don't save.",
        buttons: ["Save and Close", "Cancel", "Don't save"] // is shown in reverse on dialog surprisingly
      })
      if (action == 2){ // dont save
        remove_from_open_file_windows(win)
        win.destroy() // not close() so that it doesnt keep retriggering the close handler - this function.
      }else if(action == 0){ // Save and Close
        save_file((win) => {
          remove_from_open_file_windows(win)
          win.destroy() 
        })
      }
    }else{
      // definitely not changed.
      win.destroy() // just close it away.
    }
  })
}

let get_file_data_js_str = `
      window['file_mod'] = require("./scripts/file"); 
      file_mod.save_data()
    `

async function is_file_editedp(win) {
    let file = await win.webContents.executeJavaScript(get_file_data_js_str)
    if (!(file.path)) {
        // is a new file, since no filepath is available.
        return await win.webContents.executeJavaScript('is_new_file_edited()')
    } else {
        let disk_data = fs.readFileSync(file.path, {
            encoding: 'utf8',
            flag: 'r'
        })
        return !(disk_data === file.data)
    }
}

//------------------------------------------------------------

const save_and_close  = exports.save_and_close = () => {
  let win  = BrowserWindow.getFocusedWindow()
  save_file((win) => {
    win.destroy() // not close() so that it doesnt trigger the close handler
  })
}

//======================================================================================================================

const open_file  = exports.open_file = () => {
  let dialog_opts = {
    properties: ['openFile'],
    filters: [
      { name: 'Glide Files', extensions: ['glide'] },
    ]
  }

  let win  = BrowserWindow.getFocusedWindow()
  let paths = win ? dialog.showOpenDialogSync(win, dialog_opts) : dialog.showOpenDialogSync(dialog_opts)

  if (paths){ 
    let path = paths[0]
    switch_or_open_file_in_new_window(path)   
  }
}

//----------------------------------------------------------------------------------------

const switch_or_open_file_in_new_window = exports.switch_or_open_file_in_new_window = (path) => {
  let switched = switch_to_already_open_file_window(path)
  if (!switched){
    open_file_in_new_window(path)
  } 
}

const open_file_in_new_window = exports.open_file_in_new_window = (path) => {
  try{
    let file_data = fs.readFileSync(path, {encoding:'utf8', flag:'r'})
    new_window_with_file_data(file_data, path)
  }catch (err){
    console.log(err)
  }

}
function new_window_with_file_data(file_data, path){
  let new_win = create_window()
  new_win.once('ready-to-show', () => {
    new_win.show();
  });
  new_win.webContents.once('did-finish-load', () => {
    new_win.webContents.send('file_opened', path, file_data)
    update_open_file_windows(new_win, path)
  })
}

//---------------------------------------------------

let open_file_windows = {}

function update_open_file_windows(win, path){
  // must use win.id as key and not path, since path changes after saving first time, or using save as.
  // using win.id ensures that you always have the correct path associated with a window.
  open_file_windows[win.id + ''] = path
}
function remove_from_open_file_windows(win){
  delete open_file_windows[win.id + '']
}

//---------------------------------------------------

function switch_to_already_open_file_window(path){
  let window
  let opened_file = Object.entries(open_file_windows).find(item => {
    let open_path = item[1]
    window = BrowserWindow.fromId(parseInt(item[0]))
    return !!window && open_path === path && !window.isDestroyed()
  })
  if(opened_file){
     window.focus()
     // This is so needed! this was a long standing issue. It would focus the window,
     // but not bring it to front. setImmediate is the solution. man!
     setImmediate(() => {
      window.focus()
     })
    return true
  }
  return false
}

//======================================================================================================================

const save_file = exports.save_file = (callback = () => {}) => {
    let win = BrowserWindow.getFocusedWindow()
    if (!win){
        return dialog.showErrorBox(
        'Cannot Save',
        'There is currently no active document to save.'
      )
    }
    let got_save_data = win.webContents.executeJavaScript(get_file_data_js_str)
    got_save_data.then(save_data => {
        if (!!save_data.path) {
            write_file(save_data.path, save_data.data, win, callback)
        } else {
            base_save_as_file(save_data, callback)
        }
    }, console.log)
}

//--------------------------------------------------

const save_as_file = exports.save_as_file = () => {
    let win = BrowserWindow.getFocusedWindow()
    if (!win){
        return dialog.showErrorBox(
        'Cannot Save',
        'There is currently no active document to save.'
      )
    }
    let got_save_data = win.webContents.executeJavaScript(get_file_data_js_str)
    got_save_data.then(base_save_as_file, console.log)
}

function base_save_as_file(save_data, callback = () => {}) {
    let win = BrowserWindow.getFocusedWindow()

    let opts = {
        filters: [{
            name: 'Glide Files',
            extensions: ['glide']
        }]
    }
    if (!!save_data.path) {
        opts.defaultPath = save_data.path
    }

    let path = dialog.showSaveDialogSync(win, opts)
    if (path) {
      write_file(path, save_data.data, win, callback)
    }
}
//--------------------------------------------------

function write_file(path, data, win, success_callback){
  fs.writeFile(path, data, (err) => {
      if (err) {
          win.webContents.send('error', err)
      } else {
          win.webContents.send('wrote_file', path)
          update_open_file_windows(win, path)
          success_callback(win)
      }
  })
}

//-----------------------------------------------------------------------------------------------

let get_export_html_js_str = `
      window['file_mod'] = require("./scripts/file"); 
      file_mod.html_export_data()
    `

const export_file_as_html = exports.export_file_as_html = () => {
    let win = BrowserWindow.getFocusedWindow()
    if (!win){
        return dialog.showErrorBox(
        'Cannot Export',
        'There is currently no active document to export.'
      )
    }
    let got_export_data = win.webContents.executeJavaScript(get_export_html_js_str)
    got_export_data.then(base_export_file_as_html, console.log)
}

function base_export_file_as_html(export_data, callback = () => {}) {
    let win = BrowserWindow.getFocusedWindow()

    let opts = {
        filters: [{
            name: 'HTML Files',
            extensions: ['html']
        }]
    }
    if (!!export_data.path) {
        opts.defaultPath = export_data.path
    }

    let path = dialog.showSaveDialogSync(win, opts)
    if (path) {
      if(export_data.images_folder){
        let path_module = require('path')
        let new_images_folder_name = path_module.basename(path) + "_files"
        let new_images_folder = path_module.join(path_module.dirname(path), new_images_folder_name)
        // delete folder if exits, otherwise while replacing existing exported file, you will just have heaps of 
        // copies of folders.
        if(fs.existsSync(new_images_folder)){
          fs.rmdirSync(new_images_folder, { recursive: true })
        }
        // rename and move folder
        fs.rename(export_data.images_folder, new_images_folder, console.log)
        export_data.data = export_data.data.replaceAll(path_module.basename(export_data.images_folder), "./" + new_images_folder_name)
      }

      fs.writeFile(path, export_data.data, (err) => {
        if (err) {
            win.webContents.send('error', err)
        } else {
            win.webContents.send('exported_file', path)
            callback(win)
        }
      })
    }
}

