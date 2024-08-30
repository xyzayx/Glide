
const {BrowserWindow, clipboard, ipcMain} = require('electron')

const paste_as_text = exports.paste_as_text = () => {
    BrowserWindow.getFocusedWindow().webContents.insertText(clipboard.readText())
}


const file_ops = require('./file-operations')
let tutils = require('./theme-utils')
var config = require('./config')

const reload_window_preserving_contents = exports.reload_window_preserving_contents = async function(win) {
  let get_file_data_js_str = `
        window['file_mod'] = require("./scripts/file"); 
        file_mod.save_data()
      `
  let save_data = await win.webContents.executeJavaScript(get_file_data_js_str)
  win.reload()
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('file_opened', save_data.path, save_data.data)
  })
  win.removeBrowserView(win.results)
  win.results.webContents.destroy() // so that if process is stuck or crashed due to bad eval, you can exit, otherwise even loading a file using loadfile doesnt work.
  win.results.webContents.on('destroyed', () => {
    // reset the results_view
    file_ops.add_results_view(win)
    effective_theme = tutils.get_effective_theme(config.settings.theme, config)
    win.results.webContents.loadFile('./renderer/results_view.html').then(() => {
      win.results.webContents.send('theme', effective_theme) // also send to results view
    }).catch(console.log)
  })

}

const reload_results_view = exports.reload_results_view = function() {

  let win = BrowserWindow.getFocusedWindow()
  effective_theme = tutils.get_effective_theme(config.settings.theme, config)
  win.results.webContents.loadFile('./renderer/results_view.html').then(() => {
    win.results.webContents.send('theme', effective_theme) // also send to results view
  }).catch(console.log)

}

// sent from results view (speical case)
ipcMain.on('reload_results_view_and_eval_marked_areas', (e) => {
  let win = e.sender.getOwnerBrowserWindow()
  effective_theme = tutils.get_effective_theme(config.settings.theme, config)
  win.results.webContents.loadFile('./renderer/results_view.html').then(() => {
    win.results.webContents.send('theme', effective_theme) // also send to results view
    win.webContents.send('execute_command', 'js-area.eval_marked_areas')

  }).catch(console.log)
})

const reload = exports.reload = () => {
  reload_window_preserving_contents(BrowserWindow.getFocusedWindow())
}

const open_dev_tools = exports.open_dev_tools = () => {
  BrowserWindow.getFocusedWindow().webContents.openDevTools()
}