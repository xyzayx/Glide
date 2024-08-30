
const { ipcRenderer } = require('electron')
const { JSHINT } = require('jshint')
window.JSHINT = JSHINT
const utils = require('./scripts/utils')
const history = require('./scripts/history')
const Area = require('./scripts/area')
const program_area = require('./scripts/program-area')

var config_resolve 
var CONFIG_PROMISE = new Promise((resolve) => {
    config_resolve = resolve
})
// Config is sent by main process AFTER window onload (below).
// So its safe to bind shortcuts.
var CONFIG // global utilised wherever in the app.
ipcRenderer.on('config', (event, config) => {
    // console.log("received new config", config)
    CONFIG = config
    config_resolve(CONFIG)
})

ipcRenderer.on('app_is_packaged', (event, is_prod) => {
// any dev related things you want to do.
})

//----------------------------------------------------------------------------------------------------------------------

window.onload = function () { // setup all kinds of things.

    // Focusing on page padding should focus the area that is visually above it.
    document.querySelector('#page-padding').addEventListener('focus', (e) => {
        let last_area = document.querySelector('#content').lastChild
        if (last_area){
            Area.focus(last_area)
        }
    })

    // Insert a single js area for new files. If and when a file is opened, this is overwritten.
    let area = program_area.make('javascript')
    document.querySelector('#content').appendChild(area)
    program_area.init_glide_cm(area)
    area.focus()

    document.title = "Untitled" // Change from Loading...

    new_file_observer().observe(document.body, {attributes: true, childList: true, subtree: true, characterData: true })
    history.start()
}

//-----------------------------------------------

let new_file_is_edited = false // only for not asking to save a new file if it hasnt been edited.
function is_new_file_edited(){
    return new_file_is_edited
}

function new_file_observer(){
    const observer = new MutationObserver(() => {
        new_file_is_edited = true
        observer.disconnect() // just one change to a document is all im recording for new file change.
    })
    return observer
}

//-----------------------------------------------

// Same with file
require('./scripts/file')

// So that can use console.log(x, y) in js area code correctly. Don't delete this if unsure of what it's doing.
var js_area = require('./scripts/js-area')

//======================================================================================================================

ipcRenderer.on('theme', (event, theme) => {
    update_theme_in_dom(theme) 
})

let theme_el = {}
function update_theme_in_dom(theme){
    if(theme_el.remove) theme_el.remove()
    theme_el = document.createElement("style")
    theme_el.innerHTML = theme
    document.head.appendChild(theme_el)
}

//----------------------------------------------------------------------------------------------------------------------

ipcRenderer.on('error', (event, message) => {
  console.log(message) 
})

//----------------------------------------------------------------------------------------------------------------------

// Used by menu to execute commands.
ipcRenderer.on('execute_command', (event, full_fn_name) => {
    let fn = history.get_batched_function(full_fn_name)
    if (fn) {
        let fake_event = {target: window.getSelection().anchorNode, preventDefault: () => {}}
        // since only e.target and e.preventDefault is ever used in any command, i can fake an event.
        fn(fake_event)
    }
})

// Used by menu to insert program areas. This is different than execute_command because this needs a prog_id.
ipcRenderer.on('execute_insert_program_area_command', (event, id) => {
        let fake_event = {target: window.getSelection().anchorNode, preventDefault: () => {}}
        program_area.insert_by_id(fake_event, id)
})

//----------------------------------------------------------------------------------------------------------------------

function open_dev_tools(e) {
    e.preventDefault()
    ipcRenderer.send('open_dev_tools')
}

function open_browser_view(){
    // ipcRenderer.invoke('open_browser_view')
}

//----------------------------------------------------------------------------------------------------------------------

// When pasting screenshots, or 'copy image' elsewhere and pasting in a generic area,
// the image pasted is double its size on retina. 
// This fixes that. 
// Only works for images that have src as image data with image:xieriw283slkd...
// which is detected by item.type. item.type isnt image/jpg etc, when its an html img tag that is being pasted,
// or html/text.
addEventListener('paste', function(e) {

    let area = Area.ancestral_area(e.target)
    if(!(area && area.classList.contains('generic'))) return

    let pasted_image_count = Array.from(e.clipboardData.items).filter(item => item.type.indexOf("image") === 0).length
    
    if (pasted_image_count > 0){
        setTimeout(function(e){ // This will execute after onpaste event finishes. Effectively becoming after paste event.
            let imgs = area.querySelectorAll('img')
            // Do all images, not just the one/s that were pasted, because its difficult to tell
            // what was pasted if the new paste happens in the middle of content.
            for(let img of Array.from(imgs)){
                if (!img.hasAttribute('width') && !img.hasAttribute('height')){
                    img.width = img.naturalWidth / devicePixelRatio // this changes height as well.
                }
            }
        }, 0)
    }
}) 

//----------------------------------------------------------------------------------------------------------------------


//----------------------------------------------------------------------------------------------------------------------

addEventListener('load', () => {
    let dummy = document.querySelector('#results-dummy')
    new ResizeObserver(() => {
        ipcRenderer.send('viewport-resized', dummy.offsetWidth, document.documentElement.clientHeight)
        let dragger = document.querySelector('#dragger')
        document.querySelector('#main').style.width = document.documentElement.clientWidth - dummy.offsetWidth - dragger.offsetWidth +'px'
    }).observe(dummy)
})

function send_viewport_resized() {
    let dummy = document.querySelector('#results-dummy')
    ipcRenderer.send('viewport-resized', dummy.offsetWidth, document.documentElement.clientHeight)
}

addEventListener('resize', send_viewport_resized)

//---------------------------------------------

var drag_start_x
var dummy_width
var start_drag = e => {
    let dragger = document.querySelector('#dragger')
    let left_edge = dragger.getBoundingClientRect().left
    let dummy = document.querySelector('#results-dummy')
    if(e.clientX > left_edge && e.clientX < left_edge + dragger.offsetWidth){
        e.preventDefault()
        drag_start_x = e.clientX
        dummy_width = dummy.offsetWidth
        addEventListener('mousemove', dragging)
        addEventListener('mouseup', end_drag)
    }
}

var dragging = e => {
    let delta = e.clientX - drag_start_x
    let dummy = document.querySelector('#results-dummy')
    dummy.style.minWidth = dummy_width - delta + 'px'
    e.preventDefault()
}

var end_drag = e => {
    removeEventListener('mousemove', dragging)
    removeEventListener('mouseup', end_drag)
}

addEventListener('mousedown', start_drag)

//----------------------------------------------------------------------------------------------------------------------

// vital to load any local js files into the dom.
function load_script_local(path){
    let fs = require('fs')
    let data = fs.readFileSync(path)
    let el = document.createElement('script')
    el.text = data
    document.head.appendChild(el)
    return el
}

// TODO theme matching of dev console for results view when changing theme manually

