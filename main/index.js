// console.time('app gets ready')

const process = require('process')
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

const {Menu, app, BrowserWindow, BrowserView, ipcMain} = require('electron')
const gen_ops = require('./scripts/general-operations.js')

const contextMenu = require('electron-context-menu')
contextMenu()

let app_opened_with_filepath = false

//----------------------------------------------------------------------------------------
// on start up

const file_ops = require('./scripts/file-operations')

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=8192 --expose-gc')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

app.whenReady().then(() => {
  // console.timeEnd('app gets ready')
  // console.time('loading menu')
  const menu = require('./scripts/menu.js')
  // console.log(menu)
  Menu.setApplicationMenu(menu)
  // console.timeEnd('loading menu')

  if (app_opened_with_filepath){
    file_ops.open_file_in_new_window(app_opened_with_filepath)
  }else{
    file_ops.new_file()
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      file_ops.new_file()
    }
  })
})

//----------------------------------------------------------------------------------------
// Dynamic reloading of ~/.glide/config.hjson changes.

const fs = require('fs')
const path = require('path')
const os = require('os')
const user_config_path = path.join(os.homedir(), ".glide", "config.hjson")

update_config_for_all_windows_when_file_changes(user_config_path)

//----------------------------------------------------------------------------------------
// During dev mode watch other files and dirs as well. Reload as well for scripts and css.

if (!app.isPackaged){ // is dev

  console.log(__dirname)
  update_config_for_all_windows_when_file_changes(
    path.join(__dirname, 'scripts', 'default-config.js'))

  update_config_for_all_windows_when_file_changes(
    path.join(__dirname, 'scripts', 'menu.js'))

  update_config_for_all_windows_when_file_changes(
    path.join(__dirname, '../renderer'), true)

  update_config_for_all_windows_when_file_changes(
    path.join(__dirname, '../renderer/scripts'), true)

  update_config_for_all_windows_when_file_changes(
    path.join(__dirname, '../renderer/css'), true)
}

function update_config_for_all_windows_when_file_changes(file_or_dir_path, should_reload_as_well = false){
  if(!fs.existsSync(file_or_dir_path)) return
  fs.watch(file_or_dir_path, 'utf8', (e_type, filename) => {
    if(e_type === 'change'){
      update_config_for_all_windows()
      if(should_reload_as_well){
        BrowserWindow.getAllWindows().forEach(win => gen_ops.reload_window_preserving_contents(win))
      }
    }
  })
}

async function update_config_for_all_windows(){
  // console.log("reloading config")

  // must invalidate default config, config and menu caches, in this order.
  delete require.cache[require.resolve('./scripts/default-config')]
  delete require.cache[require.resolve('./scripts/config')]
  delete require.cache[require.resolve('./scripts/menu.js')]

  // set new menu
  let menu = require('./scripts/menu.js')
  Menu.setApplicationMenu(menu)

  // send new config to all windows
  let all_wins = BrowserWindow.getAllWindows()
  for(let win of all_wins){

    config = require('./scripts/config')
    let tutils = require('./scripts/theme-utils')
    effective_theme = tutils.get_effective_theme(config.settings.theme, config)

    win.webContents.send('theme', effective_theme)
    if(win.results) win.results.webContents.send('theme', effective_theme)
      win.webContents.send('config', config)
    win.webContents.send('app_is_packaged', app.isPackaged)

  }
}

//----------------------------------------------------------------------------------------
// When file is opened by double clicking, or from open with and not from the app itself, open-file fires.

app.on("open-file", function(event, path) {
  if(app.isReady()){
    file_ops.switch_or_open_file_in_new_window(path)
  }else{
    app_opened_with_filepath = path
  }
})

//----------------------------------------------------------------------------------------

// just forward to the results browserview

ipcMain.on('eval', (e, code, asyncp = false) => {
  let win = e.sender.getOwnerBrowserWindow()
  win.results.webContents.send('eval', code, asyncp)
})

ipcMain.on('simple_eval', (e, code) => {
  let win = e.sender.getOwnerBrowserWindow()
  win.results.webContents.send('simple_eval', code)
})

ipcMain.on('eval_multiple', (e, codes) => {
  let win = e.sender.getOwnerBrowserWindow()
  win.results.webContents.send('eval_multiple', codes)
})

ipcMain.on('execute_command_in_renderer_window', (e, command_name) => {
  let win = e.sender.getOwnerBrowserWindow()
  win.webContents.send('execute_command', command_name)
})

ipcMain.on('execute_command_in_main_window', (e, code) => {
  console.log("code received")
  try{
    eval(code)
  }catch(err){
    console.log(err)
  }
})

ipcMain.handle('exec_and_return', (e, code) => {
  let win = e.sender.getOwnerBrowserWindow()
  return win.results.webContents.executeJavaScript(code)
})
//----------------------------------------------------------------------------------------

ipcMain.handle('expand_glide_files', async (e, file_paths) => {
  let all_codes = []
  for (let [path, only_marked_areas] of file_paths){
    let win = e.sender.getOwnerBrowserWindow()
    let loader_win = new BrowserView({webPreferences: {
      webSecurity: false,
      allowRunningInsecureContent: true,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      nodeIntegrationInSubFrames: true,
      scrollBounce: true,
      contextIsolation: false,
        backgroundThrottling: false, // otherwise timers and even network downloads, slow down or misbehave when app is bg.
        v8CacheOptions: (app.isPackaged ? 'code' : 'none'),
      }})

    await loader_win.webContents.loadFile('./renderer/dummy.html') // always do this else you will have past file eval pollution

    let data = JSON.stringify(fs.readFileSync(path, 'utf8'))
    let selector = only_marked_areas ? '.program[mark]' : '.program'
    let codes = loader_win.webContents.executeJavaScript(`
      const {ipcRenderer} = require('electron')
      document.body.innerHTML = ${data}
      let areas = document.querySelectorAll('${selector}')
      let codes = []
      async function get_codes(){
        for(let area of areas){
          if(area.classList.contains('loader')){
            let files = JSON.parse(area.querySelector('textarea.section.code').value)
            let gf_codes = await ipcRenderer.invoke('expand_glide_files', files)
            codes = codes.concat(gf_codes)
          }else{
            let asyncp = area.hasAttribute('async')
            let textarea = area.querySelector('textarea.section.code')
            codes.push({code: textarea.value, asyncp})
          }
        }
        return JSON.stringify(codes)
      }
      get_codes()
      `)
    all_codes.push(JSON.parse(await codes))
  }
  return all_codes.flat()
})

//----------------------------------------------------------------------------------------

ipcMain.on('open_dev_tools', gen_ops.open_dev_tools)

//----------------------------------------------------------------------------------------

ipcMain.on('add_browser_view', async (e, id) => {
  let win = e.sender.getOwnerBrowserWindow()
  win.browser_views = win.browser_views || []

  let bv = new BrowserView({webPreferences: {
    webSecurity: false,
    allowRunningInsecureContent: true,
    nodeIntegration: true,
    nodeIntegrationInWorker: true,
    nodeIntegrationInSubFrames: true,
    scrollBounce: true,
    contextIsolation: false,
    backgroundThrottling: false, // otherwise timers and even network downloads, slow down or misbehave when app is bg.
    v8CacheOptions: (app.isPackaged ? 'code' : 'none'),
  }})

  win.browser_views[id] = bv
  win.addBrowserView(win.browser_views[id])
  await win.browser_views[id].webContents.loadFile('./renderer/dummy.html')
  // win.browser_views[id].webContents.openDevTools()
  // initial browser view size needs setting by results view, since resized_viewport may not fire.
  win.setTopBrowserView(win.browser_views[id])
  win.top_browser_view = win.browser_views[id]
  win.results.webContents.send('added_browser_view', id)
})

ipcMain.on('browser_view_exists', (e, id) => {
  let win = e.sender.getOwnerBrowserWindow()
  if (!!win.browser_views){
    win.results.webContents.send('browser_view_exists', !!win.browser_views[id])
  }else{
    win.results.webContents.send('browser_view_exists', false)
  }
  
})

ipcMain.on('set_top_browser_view', (e, id) => {
  let win = e.sender.getOwnerBrowserWindow()
  if (!!win.browser_views && !!win.browser_views[id]){
    win.setTopBrowserView(win.browser_views[id])
    win.top_browser_view = win.browser_views[id]
  }else if (id == 'results'){
    win.setTopBrowserView(win.results)
    win.top_browser_view = win.results
  }
})

ipcMain.on('size_browser_view', (e, id) => {
  let win = e.sender.getOwnerBrowserWindow()
  // viewport-resized fires (see handler below) at the start of the app and whenever dummy size changes.
  // I keep a cache, so that when size_browser_view is sent after a new browser view is added,
  // I can use these cached values. Somehow using document.documentElement.width and h from the results view doesnt quite send the right size. so this is a workaround.
  position_browser_view(win, id, win.dummy_cache_w, win.dummy_cache_h)
})

ipcMain.on('remove_browser_view', (e, id) => {
  let win = e.sender.getOwnerBrowserWindow()
  if(win.browser_views[id]){
    win.browser_views[id].webContents.destroy()
    win.removeBrowserView(win.browser_views[id])
    delete win.browser_views[id]
    let bv_array = Object.entries(win.browser_views)
    win.top_browser_view = bv_array.length > 0 ? bv_array[bv_array.length - 1][1] : win.results
  }
  win.results.webContents.send('removed_browser_view', id)
})

ipcMain.on('exec_in_browser_view', async (e, id, js_str) => {
  let win = e.sender.getOwnerBrowserWindow()
  try{
      let val = await win.browser_views[id].webContents.executeJavaScript(js_str)
      win.results.webContents.send('execed_in_browser_view', id, val)
  }catch(err){
      win.results.webContents.send('execed_in_browser_view', id, err)
  }

})


function position_browser_view(win, view_id, w, h){
  // in case devtools is open for the main page, you want viewport height, so both devtools can be accessed.
  if(win.browser_views[view_id]){
    win.browser_views[view_id].setBounds({
      x: Math.max(win.getBounds().width - w, 0),
      y: file_ops.get_title_bar_height(win),
      width: w,
      height: h
    })
  }
}

ipcMain.on('viewport-resized', (e, width, height) => {
  let win = e.sender.getOwnerBrowserWindow()
  win.dummy_cache_w = width
  win.dummy_cache_h = height
  if(win.browser_views){
    for(let [id, browser_view] of Object.entries(win.browser_views)){
      position_browser_view(win, id, width, height)
    }
  }
})