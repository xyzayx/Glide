// Creation.
const ui_utils = require('./ui-utils')
const utils = require('./utils')
const Area = require('./area')
const js_area = require('./js-area')
const logger = require('./log')

function make_code_section(mode) {
    let section = document.createElement('textarea')
    section.classList.add('section')
    section.classList.add('code')
    section.setAttribute('mode', mode)
    return section
}

const make = exports.make = (mode) => {
    let area = Area.make()
    area.classList.add(mode)
    area.classList.add("program")
    area.appendChild(make_code_section(mode))
    return area
}

const insert = exports.insert = (e, prog_entry)  => {
    let area = make(prog_entry.mode)
    area.setAttribute('prog_id', prog_entry.id)
    Area.insert(area, e.target, e)
    init_glide_cm(area)
    return area
}
// Insert a text area but editable by codemirror.
const insert_scratch = exports.insert_scratch = (e) => {
    let area = Area.make()
    area.appendChild(make_code_section(null))
    area.classList.add("program")
    area.classList.add("scratch")
    Area.insert(area, e.target, e)
    init_glide_cm(area)
    return area
}

//----------------------------------------------------------------------------------------

// exact copy of the very same function from macro system.
function replace_convenience_delims(str) {
  // Regular expression to match ⎡ ... ⎦ blocks
  const re = /(?<!\\)⎡([\s\S]*?)⎦/g;

  return str.replace(re, function(match, group1) {
    // Escape ` and \ characters
    let escaped = group1.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
    // Replace with c` ... `
    return 'c`' + escaped + '`';
  });
}

function no_JSHINT(){
    if (!window.JSHINT) {
      if (window.console) {
        window.console.error("Error: window.JSHINT not defined, CodeMirror JavaScript linting cannot run.")
      }
      return true
    }
}

function jshint_error_to_cm_hint(error, subtract_line = false){

    // so that you can underline the char properly. cm needs this.
    var start = error.character - 1
    var end = start + 1

    // but just shifting to next char is not enough, underline the whole token
    // and not just the char, so extend end till next word boundary.
    if (error.evidence) {
        var index = error.evidence.substring(start).search(/.\b/)
        if (index > -1) {
            end += index;
        }
    }

    // if you've wrapped something in async or something else you may need this.
    if(subtract_line == true) {
        error.line = error.line - 1
    }

    return {
        message: error.reason,
        severity: error.code ? (error.code.startsWith('W') ? "warning" : "error") : "error",
        from: CodeMirror.Pos(error.line - 1, start),
        to: CodeMirror.Pos(error.line - 1, end)
    }

}

function get_jshint_errors(str, options){
    JSHINT(str, options, options.globals)
    return JSHINT.data().errors || []
}

/*
Linter is registered in require_codemirror() as a linting helper.
This function receives the code in an area along with lint options that are passed to lint in cm config.
It is needed to support linting 2 features that I've added. Macros' ⎡⎦ syntax, and top level await in an area.

Linter first replaces custom delimiters with valid JS (template literals) to avoid syntax errors caused by ⎡⎦.
⎡⎦ is needed for macros. This first step converts ⎡⎦ to c`` so no syntax errors.
Then wrap this in async ensures top level await, and then get errors if any. 
These are the errors in the entire code of the code area.

Now the ⎡⎦ blocks also need to support top level await and could have errors.
So match, extract and wrap each block in an async func and then get errors.
Now these errors are not correctly offset since they are computed from the block code which has no idea of where it lies in the surrounding code. So compute the offset and fix line numbers of the errors of the blocks.

The errors are on mutually exclusive lines since where blocks are, external code is not. So they can be combined together as is. Finally the errors need to be output in a format that cm expects.
jshint_error_to_cm_hint does this, and since i wrap them in async, they need to have one line subtracted, which is also handled by it. 

Note that all this code only affects the linting and thus the errors shown alongside
the code mirror editor area. And has no bearing on the evaluation of the code.

*/
function error_pertains_to_async_wrap_lines(error, block){
    let block_length = (block.match(/\n/g) || []).length
    return 
        (error.line == 1 && error.evidence.startsWith('async func')) || 
        (error.line == block_length && error.evidence.endsWith('}'))
}

function linter(code, options) {
    if (no_JSHINT()) return []

    let errors = get_jshint_errors(utils.wrap_in_async(replace_convenience_delims(code)), options)
    // console.log('errors', errors)

    let block_matches = Array.from(code.matchAll(/(?<!\\)⎡([\s\S]*?)⎦/g))
    let block_errors = block_matches
        .map(match => {
            let block = utils.wrap_in_async(match[1])
            let errors = get_jshint_errors(block, options)
            // console.log('block errors before line change', structuredClone(errors))
            errors = errors.filter(error => !error_pertains_to_async_wrap_lines(error, block))
            let preceding_lines = code.slice(0, match.index).match(/\n/g) || []
            errors.forEach(error => error.line = error.line + preceding_lines.length) // adjust offset
            return errors
        })
        .flat()
    // console.log(errors, block_errors)
    return errors.concat(block_errors).map(error => jshint_error_to_cm_hint(error, true))
}

//----------------------------------------------------------------------------------------

let cm_config = {
    lineNumbers: false,
    lineWrapping: true,
    mode: null,
    scrollbarStyle: null,
    viewportMargin: Infinity,
    autofocus: true,
    cursorBlinkRate: 0,
    matchBrackets: true, // addon matchbrackets
    autoCloseBrackets: true, // addon closebrackets
    theme: 'abstraction', // my theme
    keyMap: 'sublime', // addon sublime (keymap)
    // somewhat choppy scrolling with scrollPastEnd. so commented out for now.
    // scrollPastEnd: 'true', // from addon scrollpastend .. lol. 
    extraKeys: {
        "Cmd-I": "indentAuto", // sublime addon doesnt map this to cmd - I, so...
        "Cmd-T": "autocomplete", // much easier this way. and it only ever shows once (ie. once gone it doenst reappear on the next word). which is what i need. its not a toggle.
        "Alt-[": cm => {
            cm.replaceSelection('⎡⎦')
            CodeMirror.commands.goCharLeft(cm)
            return true
        },
        "Alt-[": cm => {
            cm.replaceSelection('⎡⎦')
            // CodeMirror.commands.goCharLeft(cm)
            return true
        },
        "Tab": cm => {
            if(cm.cmark){
                cm.replaceRange(cm.completion, cm.completion_pos, cm.completion_pos, "*ignore")
                remove_completion(cm, {origin: ""})
            }else{
                cm.execCommand('defaultTab')
            }
        }
    },
    gutters: ["CodeMirror-lint-markers"],
    lint: {highlightLines: true, asi:true, esversion: 11, expr: true, indent: 1},
}

// CodeMirror

var orig_js_hint

function require_codemirror(){

    window.CodeMirror = require('codemirror')

    require('codemirror/keymap/sublime')
    require('codemirror/addon/mode/loadmode')
    require('codemirror/addon/mode/multiplex')

    require('codemirror/mode/javascript/javascript') // always load js

    require('codemirror/addon/display/placeholder') // adds a CodeMirror-empty class when empty

    require('codemirror/addon/search/searchcursor') // necessary for multiple selections 

    require('codemirror/addon/edit/matchbrackets')   
    require('codemirror/addon/edit/closebrackets')   
    require('codemirror/addon/comment/comment')

    require('codemirror/addon/dialog/dialog')
    require('codemirror/addon/hint/show-hint')
    require('codemirror/addon/hint/javascript-hint')
    require('codemirror/addon/lint/lint')
    // require('./javascript-lint') // modded version to get around toplevel await errors.
    CodeMirror.registerHelper("lint", "javascript", linter)
    require('codemirror/addon/hint/anyword-hint')

    // ------------------------------

    function unmap_cm_keys(keys){
        // there are many keymaps, default, emacsy, macdefault, pcdefault, sublime, sublimepc etc..
        // this will unmap anything that matches supplied keys in any of the keymaps.
        for (let keymap_name in CodeMirror.keyMap){
            for (bound_key in CodeMirror.keyMap[keymap_name]){
                for(let key of keys){
                    if(key == bound_key){
                        delete window.CodeMirror.keyMap[keymap_name][bound_key]
                    }
                }
            }
        }
    }

    // want to handle undo redo myself for the whole document.
    // if there is a better way i wasnt able to find it.
    // i could modify the codemirror module but that will bomb when i update node modules
    // and the undo redo functionality and the associated shortcuts are baked into the very core
    // of codemirror. Accelerators defined on these dont work because mousetrap captures the event.
    // which makes sense in all cases except when i want to not use some base functionality like here.
    // so i figured out that i can simply delete the keybindings from the core and it works.
    // the accelerators fire and codemirror undo redo doesnt work.
    unmap_cm_keys(['Cmd-Z', 'Shift-Cmd-Z', 'Cmd-Y', 'Ctrl-Z', 'Shift-Ctrl-Z', 'Ctrl-Y'])

    orig_js_hint =  CodeMirror.hint.javascript
    CodeMirror.hint.javascript = get_completions // augmented js completions

}

addEventListener('load', require_codemirror)

const init_glide_cm = exports.init_glide_cm = (area)  => {
    let code_section = area.querySelector('textarea.code.section')
    cm_config.mode = code_section.getAttribute('mode')
    let cm = CodeMirror.fromTextArea(code_section, cm_config)
    area.cm = cm
    Area.focus(area)
    if (code_section.hasAttribute('custom_style')){
        area.querySelector('.CodeMirror').style = code_section.getAttribute('custom_style')
        cm.refresh()
    }
    cm.on("blur", function(){
        // when you navigate away from any codemirror editor, without this,
        // if you have anything selected, it remains selected. really confuses you about 
        // what you are selecting in the document. 
        cm.setSelection(cm.getCursor(), cm.getCursor(), {scroll: false})
    });
    area.querySelector('.CodeMirror').new_value = cm.getValue() // used by history, modularization break here, but what to do?

    /*
    cm.on("changes", single_line_completion)
    cm.on("beforeChange", remove_completion)
    cm.on("cursorActivity", cm => {
        let pos = cm.getCursor()
        if (!cm.completion_pos) return 
        if(pos.line !== cm.completion_pos.line ||
           (pos.ch < cm.completion_token.start || 
            pos.ch > cm.completion_pos.ch)){

            remove_completion(cm, {origin: ""})

        }

    })
    */

}

//========================================================================================

window.results_window_scaffold = {}
let is_props_updating = false
async function update_window_scaffold(){
    if(!is_props_updating){
        is_props_updating = true
        results_window_scaffold = await utils.exec_in_results('scaffold_of(window)')
        is_props_updating = false
    }
}

function get_completions(cm){

    update_window_scaffold() // execs asyncly, so may not update during this functions execution, but thats ok, this is meant for future completions.
    // all this is because you cant have js hint as an async function, i dont think cm takes async funcs as helpers,
    // and im patching the original js hint helper to use this func, so that it shows all the completions not just js default ones.
    
    let buffer_tokens = {}

    // tokens from in the buffer from around where you are writing
    let any = CodeMirror.hint.anyword
    let any_comp = any(cm)
    any_comp.list.forEach(x => buffer_tokens[x] = true)

    let additionalContext = Object.assign(results_window_scaffold, buffer_tokens)

    if (orig_js_hint){
        return orig_js_hint(cm, {additionalContext, globalScope: results_window_scaffold})
    }
}

function single_line_completion(cm, changes){

    // remove any changes due to replacerange below by filtering out origin that is *ignore
    changes = changes.filter(change => change.origin && change.origin !== '*ignore')
    if (changes.length != 1) return // to ensure multiple cursor changes dont get interfered with
    change = changes[0] // the actual change we can now use

    if (change.origin === "+input" || change.origin === "+delete" || change.origin === "complete") {

        let pos = cm.getCursor()
        let token = cm.getTokenAt(pos)
        let str = token.string.trim()

        // gets annoying. And also show completions only for tokens that start with a word.
        if(str.length <= 0 || !str[0].match(/^[^\W\d]/)) return

        let completions = get_completions(cm).list  
        // console.log(token, completions)      
        if(completions.length == 0) return

        let top_match = completions[0]
        let completion = top_match.indexOf(str) == 0 ? top_match.replace(str, '') : top_match

        cm.replaceRange(completion, pos, pos, "*ignore")
        cm.setCursor(pos)

        let end_pos = {line: pos.line, ch: pos.ch + completion.length}
        cm.cmark = cm.markText(pos, end_pos, {css: "opacity: 0.4", atomic:true})
        cm.completion = completion
        cm.completion_pos = pos
        cm.completion_token = token
    }
}

function remove_completion(cm, change){
    if (cm.cmark && change.origin !== "*ignore") {
        let range = cm.cmark.find()
        if(range) cm.replaceRange('', range.from, range.to, "*ignore")
        cm.cmark.clear()
        cm.cmark = null
    }
}
//========================================================================================

const toggle_wrap = exports.toggle_wrap = (e) => {
    let area = Area.ancestral_area(e.target)
    if (area.cm) {
        if (area.cm.getOption('lineWrapping') == true) {
            area.cm.setOption('lineWrapping', false)
        } else {
            area.cm.setOption('lineWrapping', true)
        }
    }
}

const toggle_gutters = exports.toggle_gutters = (e) => {
    e.preventDefault()
    let areas = document.querySelectorAll('.area')
    let program_areas = Array.from(areas).filter(area => area.hasOwnProperty('cm'))
    if (program_areas.length > 0 && program_areas[0].cm.getOption('lineNumbers') === true) {
        for (let area of program_areas) {
            area.cm.setOption('lineNumbers', false)
            area.classList.remove('gutters-shown')
        }
    } else {
        for (let area of program_areas) {
            area.cm.setOption('lineNumbers', true)
            area.classList.add('gutters-shown')
        }
    }
}

//========================================================================================
let active_mgroup_id = utils.random_uniq_str(10)
let all_mgroup_ids = [active_mgroup_id]

function update_document_state_with_mgroup_info(){
    utils.update_document_state({all_mgroup_ids, active_mgroup_id})
}

function update_areas_to_active_mgroup(){
    let areas = document.querySelectorAll('.area[marks]')
    for(let area of areas){
        let ids = area_mgroup_ids_set(area)
        if (ids.has(active_mgroup_id)){
            mark_area(area)
        }else{
            unmark_area(area)
        }
    }
    logger.log(`Activated Mark Set ${active_mgroup_id}.`)
    update_document_state_with_mgroup_info()
}


// used by file_opened in file.js 
const update_mgroup_info_from_document_state = exports.update_mgroup_info_from_document_state = () => {
    let state = utils.get_document_state()
    if(state.all_mgroup_ids){
        all_mgroup_ids = state.all_mgroup_ids
        active_mgroup_id = state.active_mgroup_id
    }
    update_areas_to_active_mgroup()
}

//----------------------------------------------
function next(array, elt){
    let i = array.indexOf(elt)
    if (i > -1){
        if (i == array.length - 1){
            return array[0]
        }else{
            return array[i + 1]
        }
    }
}

const cycle_mgroup = exports.cycle_mgroup = (e) => {
    active_mgroup_id = next(all_mgroup_ids, active_mgroup_id)
    update_areas_to_active_mgroup()
}

const add_mgroup = exports.add_mgroup = (e) => {
    let ms = utils.random_uniq_str(10)
    all_mgroup_ids.push(ms)
    active_mgroup_id = ms
    update_areas_to_active_mgroup()
}

const remove_mgroup = exports.remove_mgroup = (e) => {

    if(all_mgroup_ids.length >= 1){ // keep at least 1 mark set.

        let areas = document.querySelectorAll('.area[marks]')
        for(let area of areas){
            let ids = area_mgroup_ids_set(area)
            ids.delete(active_mgroup_id)
            area.setAttribute('marks', JSON.stringify(Array.from(ids)))
        }

        let next_id = next(all_mgroup_ids, active_mgroup_id)
        all_mgroup_ids.splice(all_mgroup_ids.indexOf(active_mgroup_id), 1)
        active_mgroup_id = next_id
    }
    update_areas_to_active_mgroup()
}

function area_mgroup_ids_set(area){
    let area_mgroup_ids = area.getAttribute('marks') || '[]'
    return new Set(JSON.parse(area_mgroup_ids))
}

function add_active_mgroup_id_to_area(area){
    let ids = area_mgroup_ids_set(area)
    ids.add(active_mgroup_id)
    area.setAttribute('marks', JSON.stringify(Array.from(ids)))
}

function remove_active_mgroup_id_from_area(area){
    let ids = area_mgroup_ids_set(area)
    ids.delete(active_mgroup_id)
    area.setAttribute('marks', JSON.stringify(Array.from(ids)))
}

//========================================================================================
// Could be considered area-styling, but is a feature of program area. So belongs here.

function mark_area(area){
    add_active_mgroup_id_to_area(area)
    area.setAttribute('mark', active_mgroup_id)

    // classify so can be themed correctly
    let mgroup_index = all_mgroup_ids.indexOf(active_mgroup_id)
    let class_name
    if(mgroup_index == 0){
        // very first group is a class of its own
        class_name = 'first-mgroup'
    }else{
        class_name = mgroup_index % 9
    }
    let cm_div = area.querySelector('.CodeMirror')
    // no need to actually use classlist, just use as attrib, easier.
    cm_div.setAttribute('mgroup-class-name', class_name)
}

function unmark_area(area){
    remove_active_mgroup_id_from_area(area)
    area.removeAttribute('mark')
    let cm_div = area.querySelector('.CodeMirror')
    cm_div.removeAttribute('mgroup-class-name')
}

const mark = exports.mark = (e) => {
    let area = Area.ancestral_area(e.target)
    if (area.classList.contains('program') && !area.classList.contains('scratch')) {
        e.preventDefault()
        mark_area(area)
    }
}

const unmark = exports.unmark = (e) => {
    let area = Area.ancestral_area(e.target)
    if (area.hasAttribute('mark') && !area.classList.contains('scratch')) {
        e.preventDefault()
        unmark_area(area)
    }
}

const toggle_mark = exports.toggle_mark = (e) => {
    let area = Area.ancestral_area(e.target)
    if (area.hasAttribute('mark')) {
        unmark(e)
    }else{
        mark(e)
    }
}

const copy_marked_areas = exports.copy_marked_areas = () => {
    let marked_areas = document.querySelectorAll('.area[mark]')
    let data = ""
    for (let area of marked_areas) {
        data += area.cm.getValue() + "\n"
    }
    if (data.length > 0) {
        require('electron').clipboard.writeText(data)
    }
}

//========================================================================================
