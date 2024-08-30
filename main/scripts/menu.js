
const { Menu, BrowserWindow, app} = require('electron')

const file_ops = require('./file-operations.js')
const gen_ops = require('./general-operations.js')

const config = require('./config.js')

let tutils = require('./theme-utils.js')

//----------------------------------------------------------------------------------------------------------------------

function make_renderer_entry(label, fn_name){
  let shortcut = get_config_shortcut(fn_name)
  let entry = {label, click: () => exec_command(fn_name), accelerator: shortcut}
  return entry
}

function exec_command(command_name){
  let win = BrowserWindow.getFocusedWindow()
  win.webContents.send('execute_command', command_name)
}

function get_config_shortcut(fn_name){
  // make sure you find in reverse. Since user shortcuts are appended to the end, they take precedence.
  // But here searching straight will give older shortcut. so reverse search.
  let found = false
  for (let item of config.shortcuts){
   if (item['function'] === fn_name){
       found = item['shortcut']
       break
    }
  }
  if (found){
    return found instanceof Array ? found.join(', ') : found
  }
  return false
}

//----------------------------------------------------------------------------------------------------------------------

function make_theme_entries(){
  let out = []
  out.push({
    label: 'System', 
    type: 'radio', 
    click(menuitem) {update_theme('system')}, 
    checked: ('system' === config.settings.theme)
  })

  for(let key in config.themes){
    let theme = config.themes[key]
    out.push({
      label: key,
      type: 'radio',
      checked: (key === config.settings.theme),
      click(menuitem) {update_theme(key)},
    })
  }
  return out
}

function update_theme(theme_name){
  config.settings.theme = theme_name // for new windows.
  let wins = BrowserWindow.getAllWindows()
  for(let win of wins){
    let effective_theme = tutils.get_effective_theme(theme_name, config)
    win.webContents.send('theme', effective_theme)
    if (win.results) win.results.webContents.send('theme', effective_theme)
  }
}

//----------------------------------------------------------------------------------------------------------------------

let finder = require('./find-in-page.js')

const template = [
  { label: 'File',
    submenu: [
      {label: 'New...', accelerator: 'CommandOrControl+N', click() {file_ops.new_file()}},
      {label: 'Open...', accelerator: 'CommandOrControl+O', click() {file_ops.open_file()}},
      {type: "separator"},
      {label: 'Save', accelerator: 'CommandOrControl+S', click(){file_ops.save_file()}},
      {label: 'Save As...', accelerator: 'Shift+CommandOrControl+S', click(){file_ops.save_as_file()}},
      {type: 'separator'},
      {label: 'Export as HTML...', click(){file_ops.export_file_as_html()}}, // no accelerator
      {type: 'separator'},
      {role: 'close', label: 'Close File'},
      {label: 'Save and Close', accelerator: 'Shift+CommandOrControl+W', click(){file_ops.save_and_close()}},
    ]},
  { label: 'Edit',
    submenu: [
      // {label: 'Undo', accelerator: 'CommandOrControl+Z', role: 'undo',},
      // {label: 'Redo', accelerator: 'Shift+CommandOrControl+Z', role: 'redo',},
      {label: 'Undo', accelerator: 'CommandOrControl+Z', click(){exec_command('history.undo')}},
      {label: 'Redo', accelerator: 'Shift+CommandOrControl+Z', click(){exec_command('history.redo')}},
      { type: 'separator' },
      {label: 'Cut', accelerator: 'CommandOrControl+X', role: 'cut',},
      {label: 'Copy', accelerator: 'CommandOrControl+C', role: 'copy',},
      {label: 'Copy Text of Marked Areas', accelerator: 'Shift+CommandOrControl+C', click(){exec_command('program-area.copy_marked_areas')}},
      {label: 'Paste', accelerator: 'CommandOrControl+V', role: 'paste',},
      {label: 'Paste as Text', accelerator: 'Shift+CommandOrControl+V', click(){gen_ops.paste_as_text()}},
      {label: 'Select All', accelerator: 'CommandOrControl+A', role: 'selectall',},
      { type: 'separator' },
      {label: 'Find', accelerator: 'CommandOrControl+F', click(){finder.open_finder()}},
    ]},
  { // Main area menu - fn is not a prop recognized by electron, custom prop for adding tooltips. see below.
    label: 'Area',
    submenu:[
      // {label: 'Undo Area Action', accelerator: 'Alt+CommandOrControl+Z', click(){exec_command('area.undo')}},
      // {label: 'Redo Area Action', accelerator: 'Alt+CommandOrControl+Y', click(){exec_command('area.redo')}},
      // {type: 'separator'},
      make_renderer_entry('Cut Area', 'area.cut'),
      make_renderer_entry('Copy Area', 'area.copy'),
      make_renderer_entry('Paste Area', 'area.paste'),
      make_renderer_entry('Delete Area', 'area.remove'),
      {type: 'separator'},
      make_renderer_entry('Insert JavaScript Area', 'js-area.insert'),
      make_renderer_entry('Insert Async JavaScript Area', 'js-area.insert_async'),
      make_renderer_entry('Insert Glide File Loader', 'js-area.insert_glide_file_loader'),
      make_renderer_entry('Insert Generic Area', 'generic-area.insert'),
      make_renderer_entry('Insert Text Area', 'program-area.insert_scratch'),
      {type: 'separator'},
      make_renderer_entry('Toggle Async', 'js-area.toggle_async'),
      {type: 'separator'},
      make_renderer_entry('Split Area', 'area.split'),
      make_renderer_entry('Merge Area Above', 'area.merge_above'),
      make_renderer_entry('Merge Area Below', 'area.merge_below'),
      {type: 'separator'},
      make_renderer_entry('Go To Next Area', 'area.goto_next_area'),
      make_renderer_entry('Go To Previous Area', 'area.goto_previous_area'),
      make_renderer_entry('Go To First Area', 'area.goto_first_area'),
      make_renderer_entry('Go To Last Area', 'area.goto_last_area'),
      {type: 'separator'},
      make_renderer_entry('Toggle Mark Area', 'program-area.toggle_mark'),
      make_renderer_entry('Add Mark-Group', 'program-area.add_mgroup'),
      make_renderer_entry('Remove Mark-Group', 'program-area.remove_mgroup'),
      make_renderer_entry('Cycle Mark-Group', 'program-area.cycle_mgroup'),
      {type: 'separator'},
      make_renderer_entry('Create Link', 'generic-area.create_link'),
      make_renderer_entry('Open Link', 'generic-area.open_link'),
      make_renderer_entry('Create Named Anchor', 'generic-area.create_name'),
      {type: 'separator'},
      { label: 'Style',
        submenu: [
          make_renderer_entry('Switch to Default Style', 'area-styling.default_style'),
          make_renderer_entry('Switch to Custom Style', 'area-styling.custom_style'),
          {type: 'separator'},
          make_renderer_entry('Increase Width', 'area-styling.increase_width'),
          make_renderer_entry('Decrease Width', 'area-styling.decrease_width'),
          make_renderer_entry('Full Width', 'area-styling.full_width'),
          make_renderer_entry('Default Width', 'area-styling.default_width'),
          {type: 'separator'},
          make_renderer_entry('Increase Column Count', 'area-styling.increase_column_count'),
          make_renderer_entry('Decrease Column Count', 'area-styling.decrease_column_count'),
          {type: 'separator'},
          make_renderer_entry('Increase Font Size', 'area-styling.increase_font_size'),
          make_renderer_entry('Decrease Font Size', 'area-styling.decrease_font_size'),
          make_renderer_entry('Default Font Size', 'area-styling.default_font_size'),
          {type: 'separator'},
          make_renderer_entry('Align Left', 'area-styling.align_left'),
          make_renderer_entry('Align Center', 'area-styling.align_center'),
          make_renderer_entry('Align Right', 'area-styling.align_right'),
          make_renderer_entry('Justify', 'area-styling.justify'),
          {type: 'separator'},
          make_renderer_entry('Use Code Font', 'area-styling.use_code_font'),
          make_renderer_entry('Use Text Font', 'area-styling.use_text_font'),
        ]},
    ]
  }, // end Area menu
  { label: 'Eval',
    submenu:[
      make_renderer_entry('Eval Area', 'js-area.eval_area'),
      make_renderer_entry('Eval Linked Areas', 'js-area.eval_linked_areas'),
      make_renderer_entry('Eval Marked Areas', 'js-area.eval_marked_areas'),
      make_renderer_entry('Eval All Areas', 'js-area.eval_all_areas'),
    ]
  },
  { label: 'View',
    submenu: [
      {label: 'Reload', accelerator: 'CommandOrControl+R', click(){ gen_ops.reload_results_view()}},
      {label: 'Reload File', accelerator: 'Shift+CommandOrControl+R', click(){ gen_ops.reload_window_preserving_contents(BrowserWindow.getFocusedWindow())}},
      (!app.isPackaged ? { label: "Reload Without Preserving Content", role: 'forceReload', accelerator: 'Alt+CommandOrControl+Shift+R'} : { type: 'separator' }),
      // (!app.isPackaged ? { label: "Toggle Main Dev Tools", role: 'toggleDevTools', accelerator: 'Shift+CommandOrControl+6'} : { type: 'separator' }),
      { label: "Toggle Main Dev Tools", role: 'toggleDevTools', accelerator: 'Shift+CommandOrControl+6'},
      { label: "Toggle Dev Tools", accelerator: 'Shift+CommandOrControl+I', click(){file_ops.toggle_pane_devtools()}},
      make_renderer_entry('Clear Console', 'js-area.clear_console'),
      { type: 'separator' },
      // { role: 'resetZoom' },
      // { role: 'zoomIn' },
      // { role: 'zoomOut' },
      {type: 'separator'},
      make_renderer_entry('Increase Document Width', 'area-styling.increase_default_width'),
      make_renderer_entry('Decrease Document Width', 'area-styling.decrease_default_width'),
      make_renderer_entry('Reset Document Width', 'area-styling.reset_default_width'),
      { type: 'separator' },
      make_renderer_entry('Increase Editor Width', 'ui-utils.increase_editor_width'),
      make_renderer_entry('Increase Evaluator Width', 'ui-utils.decrease_editor_width'),
      make_renderer_entry('Increase Inspector Height', 'ui-utils.increase_inspector_height'),
      make_renderer_entry('Increase Evaluator Height', 'ui-utils.decrease_inspector_height'),
      { type: 'separator' },
      { label: 'Theme',
        submenu:[
        ...(make_theme_entries()),
        ]},
      { label: 'Display',
        submenu:[
          Object.assign(make_renderer_entry('Code Areas', 'area.display_only_code_sections'), {type: 'radio'}),
          Object.assign(make_renderer_entry('Text Areas', 'area.display_only_generic_areas'), {type: 'radio'}),
          Object.assign(make_renderer_entry('All Areas', 'area.display_all_areas'), {type: 'radio', checked: true}),
        ]},
      // make_renderer_entry('Toggle Auto Collapse Mode', 'area.toggle_auto_collapse_mode'),
      { type: 'separator' },
      make_renderer_entry('Toggle Area Info', 'area.toggle_info'),
      make_renderer_entry('Toggle Line Numbers', 'program-area.toggle_gutters'),
      make_renderer_entry('Toggle Line Wrapping', 'program-area.toggle_wrap'),
      make_renderer_entry('Cycle Log View', 'log.cycle_view', 'log'),
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]},
  { label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
    ]},
  { label: 'Help',
    role: 'help',
    submenu: [
      {label: 'Glide Manual', click() { require('electron').shell.openExternal("https://64m.org/glide/manual/index.html")}},
    ]}
];

//----------------------------------------------------------------------------------------------------------------------

if (process.platform === 'darwin') {
  template.unshift({role: 'appMenu'})

  const windowMenu = template.find(item => item.label === 'Window');
  windowMenu.role = 'window';
  windowMenu.submenu.push(
    { type: 'separator' },
    {
      label: 'Bring All to Front',
      role: 'front',
    }
  );
}

module.exports = Menu.buildFromTemplate(template);