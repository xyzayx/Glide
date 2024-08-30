
const utils = require('./utils')
const ui_utils = require('./ui-utils')
const logger = require('./log')
const program_area = require('./program-area')
const generic_area = require('./generic-area')
const js_area = require('./js-area')
const history = require('./history')

const make = exports.make = ()  => {
    let el = document.createElement('div')
    el.classList.add('area')
    el.setAttribute('tabindex', '-1')
    el.setAttribute('id', utils.random_str(10))
    return el
}

const is_area = exports.is_area = (element) => {
    return element && element.classList && element.classList.contains('area')
}

// Returns a known editor area (code area, generic area, js_area etc.),
// that is the parent of the CHILD_ELEMENT.
// Returns CHILD_ELEMENT itself, if it is a known area.
const ancestral_area = exports.ancestral_area = (child_element)  => {
    return utils.ancestor(child_element, (el) => {
        if (is_area(el)) {
            return true
        }
    })
}

const focus = exports.focus = (area, callback = () => {} ) => {
    // https://stackoverflow.com/a/37162116/1078016
    setTimeout(function() {
        if (area.cm) {
            area.cm.focus()
            area.cm.refresh()
            callback()
        } else if (area.xterm) {
            area.xterm.focus()
            callback()
        } else if (area.focus){
            area.focus()
            callback()
        }
    }, 0)
}

//======================================================================================================================

const insert = exports.insert = function (area, ref, e = false){ // cant be fat arrow func, this.redoing wont be defined otherwise
    const ref_area = ancestral_area(ref)
    if (ref_area) {
        ref_area.after(area)
    } else {
        document.querySelector('#content').appendChild(area)
    }
    if (e) e.preventDefault()
        area.focus()
    if(info_is_shown()){
        area.setAttribute('info', area_info(area))
    }
}

const remove = exports.remove = function (e) { // cant be fat arrow func, this.redoing wont be defined otherwise
    let area = ancestral_area(e.target)
    let area_to_focus = next_or_previous_visible_area(e.target)
    area.remove()
    area_to_focus ? focus(area_to_focus) : false
}

let area_clipboard = []

const cut = exports.cut = function (e) { // cant be fat arrow func, this.redoing wont be defined otherwise
    let area = ancestral_area(e.target)
    let area_to_focus = next_or_previous_visible_area(area)
    area.remove()
    area_clipboard.unshift(area)
    focus(area_to_focus)
    return false
}

// https://stackoverflow.com/a/50695433/1078016
function copy_attributes(source, target) {
  [...source.attributes].forEach( attr => { target.setAttribute(attr.nodeName === "id" ? 'data-id' : attr.nodeName ,attr.nodeValue) })
}

function make_area_copy(area){

    if(area.classList.contains('generic') || area.classList.contains('dehydrated')){
        let area_copy = generic_area.make()
        copy_attributes(area, area_copy)
        area_copy.is_copy = true
        area_copy.innerHTML = area.innerHTML
        return area_copy
    }

    if(area.cm){
        //scratch, js and program areas.
        let area_copy = program_area.make(area.cm.getOption('mode'))
        // copy all style, custom style, eval in browser etc. into it.
        copy_attributes(area, area_copy)
        program_area.init_glide_cm(area_copy)
        area_copy.is_copy = true
        area_copy.cm.setValue(area.cm.getValue())
        return area_copy
    }
}

const copy = exports.copy = function (e) { // cant be fat arrow func, this.redoing wont be defined otherwise
    let area = ancestral_area(e.target)
    let area_copy = make_area_copy(area)
    if(!area_copy) return
        area_clipboard[0] = area_copy
    return false
}

const paste = exports.paste = function (e) { // cant be fat arrow func, this.redoing wont be defined otherwise

    if (area_clipboard.length === 0) return true

        let ref_area = ancestral_area(e.target)
    let area = area_clipboard[0]

    ref_area ? ref_area.before(area) : document.querySelector('#content').appendChild(area)
    focus(area)
    if(area.cm) area.cm.refresh()

        if(area.is_copy){
        area_clipboard[0] = make_area_copy(area) // so that you can keep pasting copies.
    }

    return false
}

const duplicate = exports.duplicate = function (e) { // cant be fat arrow func, this.redoing wont be defined otherwise
    copy(e)
    paste(e)
    let area = ancestral_area(e.target)
    focus(area)
    return false
}
//======================================================================================================================

const split = exports.split = (e) => {

    let area = ancestral_area(e.target)
    let fake_e = {target: area, preventDefault: () => {}}

    if(area.classList.contains('program')){
        if (area.classList.contains('scratch')){
            program_area.insert_scratch(fake_e)
        }else{
            js_area.insert(fake_e)            
        }

        let new_area = area.nextSibling
        copy_attributes(area, new_area)
        let cursor_pos = area.cm.getCursor()
        let top_content = area.cm.getRange({line: 0, ch: 0}, cursor_pos)
        let bottom_content = area.cm.getRange(cursor_pos, {line: area.cm.lastLine(), ch: Infinity})
        area.cm.setValue(top_content)
        new_area.cm.setValue(bottom_content)

    }

    if(area.classList.contains('generic')){

        let sel = window.getSelection()
        let toplevel_area_anchor = utils.ancestor(sel.anchorNode, node => node.parentNode.isSameNode(area))
        let bottom_nodes = []
        let switch_to_bottom = false
        for(let node of area.childNodes){
            if(node.isSameNode(toplevel_area_anchor)){
                switch_to_bottom = true
            }
            if(switch_to_bottom){
                bottom_nodes.push(node)
            }
        }

        utils.do_later(() => {
           // if you do this without do_later, window.getselection returns
           // the new areas selection. my guess is that window.getselection runs async and
           // finishes after this whole thing executes. but how will that work? idk, but
           // without this thats what happens.
           generic_area.insert(fake_e)
           let new_area = area.nextSibling
           copy_attributes(area, new_area)
           // make changes by adding/removing/moving nodes, so that history works since it 
           // wont track changes correctly for innerHTML changes. but childList tracks nodes.
           // so use childNodes. also childNodes will contain all nodes including text, but children does not.
           // so use childNodes in place of children. 
           bottom_nodes.forEach(node => new_area.appendChild(node)) // moves nodes from top area to bottom (new area)
       })

    }

    e.preventDefault()
    return false
}

const merge_above = exports.merge_above = (e) => {
    let area = ancestral_area(e.target)
    let sib_area = area.previousElementSibling
    if (!sib_area) return

        if(area.classList.contains('program')){
            if((area.classList.contains('javascript') && sib_area.classList.contains('javascript')) ||
             (area.classList.contains('scratch') && sib_area.classList.contains('scratch'))){

                area.cm.replaceRange(sib_area.cm.getValue(), {line: 0, ch:0})  
            sib_area.remove()       
        }
    }

    if(area.classList.contains('generic') && sib_area.classList.contains('generic')){
        // make changes by adding/removing/moving nodes, so that history works since it 
        // wont track changes correctly for innerHTML changes. but childList tracks nodes.
        // so use childNodes. also childNodes will contain all nodes including text, but children does not.
        // so use childNodes in place of children. 
        if(area.firstChild){
            area.firstChild.before(...sib_area.childNodes)
        }else{
            // must use array.from, else only some nodes are appended. 
            Array.from(sib_area.childNodes).forEach(node => area.appendChild(node))
        }
        sib_area.remove()
        Area.focus(area)
    }

    e.preventDefault()
    return false
}

const merge_below = exports.merge_below = (e) => {
    let area = ancestral_area(e.target)
    let sib_area = area.nextElementSibling
    if (!sib_area) return

        if(area.classList.contains('program')){
            if((area.classList.contains('javascript') && sib_area.classList.contains('javascript')) ||
             (area.classList.contains('scratch') && sib_area.classList.contains('scratch'))){

                area.cm.replaceRange(sib_area.cm.getValue(), {line: area.cm.lastLine(), ch:Infinity})  
            sib_area.remove()       
        }
    }

    if(area.classList.contains('generic') && sib_area.classList.contains('generic')){
        // make changes by adding/removing/moving nodes, so that history works since it 
        // wont track changes correctly for innerHTML changes. but childList tracks nodes.
        // so use childNodes. also childNodes will contain all nodes including text, but children does not.
        // so use childNodes in place of children. 
        // also you must use Array.from for forEach otherwise just some of the nodes move. very strange.
        Array.from(sib_area.childNodes).forEach(node => {
            area.appendChild(node)
        })
        sib_area.remove()
        Area.focus(area)
    }

    e.preventDefault()
    return false
}

// const cycle_link = exports.cycle_link = (e) => {
//     let area = ancestral_area(e.target)
//     let next_area = area.nextElementSibling
//     if(!next_area) return
//     if(area.classList.contains('javascript') && next_area.classList.contains('javascript')){
//         if(area.getAttribute('link-below') === 'two-way'){
//             area.removeAttribute('link-below')
//             next_area.removeAttribute('link-above')
//         }else if(area.getAttribute('link-below') === 'one-way'){
//             area.setAttribute('link-below', "two-way")
//             next_area.setAttribute('link-above', "two-way")
//         }else{
//             area.setAttribute('link-below', "one-way")
//             next_area.removeAttribute('link-above')
//         }
//     }
// }

//======================================================================================================================

const display_only_code_sections = exports.display_only_code_sections = (e) => {
    display_all_areas(e)
    let areas = document.querySelectorAll('.area')
    let was_focused = utils.ancestor(getSelection().anchorNode, el => el instanceof HTMLElement)
    for(let area of areas){
        if(!area.classList.contains('program')){
            ui_utils.hide(area)
        }
    }
    refocus_post_display(was_focused)
    e.preventDefault()
}

const display_only_generic_areas = exports.display_only_generic_areas = (e) => {
    display_all_areas(e)
    let areas = document.querySelectorAll('.area')
    let was_focused = utils.ancestor(getSelection().anchorNode, el => el instanceof HTMLElement)
    for(let area of areas){
        let code_section = area.querySelector('.code')
        if(area.classList.contains('generic')){
            ui_utils.show(area)
        }else{
            ui_utils.hide(area)
        }
    }
    refocus_post_display(was_focused)
    e.preventDefault()
}

const display_all_areas = exports.display_all_areas = (e) => {
    let areas = document.querySelectorAll('.area')
    let was_focused = utils.ancestor(getSelection().anchorNode, el => el instanceof HTMLElement)
    for(let area of areas){
        // show the main area, program or any other area.
        ui_utils.show(area)
    }
    // toggle gutters twice to reset appearance and styling
    // when gutters were shown before hiding, then when you unhide here,
    // the linenumbers dont appear.
    // when gutters were not shown before hiding, then there is a small padding that appears for the code area.
    // toggling twice will keep the original state, but will fix these issues.
    program_area.toggle_gutters(e)
    program_area.toggle_gutters(e)

    refocus_post_display(was_focused)
    e.preventDefault()
}

function refocus_post_display(elt){
    if (ui_utils.shown(elt)){
        elt.scrollIntoViewIfNeeded()
    } else{
        let el_to_focus = next_or_previous_visible_area(elt)
        if(el_to_focus){
            focus(el_to_focus)
            el_to_focus.scrollIntoViewIfNeeded()
        }
    }
}

function next_visible_area(ref_area){
    let next = ref_area.nextSibling
    if (!next) return false
        if(next.classList && ui_utils.shown(next)){ 
        //checking classlist to ensure nextsibling isnt a text node which it could be if its a pseudo element,
        // like the ellipsis which is inserted when elements are hidden.
        return next
    }else{
        return next_visible_area(next)
    }
}

function previous_visible_area(ref_area){
    let previous = ref_area.previousSibling
    if (!previous) return false
        if(previous.classList && ui_utils.shown(previous)){ 
            return previous
        }else{
            return previous_visible_area(previous)
        }
    }

    function next_or_previous_visible_area(elt){
        let ref_area = ancestral_area(elt)
        if (!ref_area) return false
            return next_visible_area(ref_area)
        return previous_visible_area(ref_area)
    }

//======================================================================================================================

// generic area doesnt store cursor pos when defocusing and refocusing it.
function stash_cursor_if_generic(area){
    if(area.classList.contains('generic')){
        area.stash_cursor_pos = getSelection().getRangeAt(0)
    }
}

function restore_cursor_if_generic(area){
    if(area.classList.contains('generic')){
        if(!area.stash_cursor_pos) return
            let sel = getSelection()
        sel.removeAllRanges()
        sel.addRange(area.stash_cursor_pos)
        // it wont scroll to the range automatically. so...
        let span = document.createElement('span')
        area.stash_cursor_pos.insertNode(span)
        span.scrollIntoViewIfNeeded()
        span.remove()
    }
}
// cm areas will maintain cursor pos automatically. so only need to worry about generic areas.
const goto_next_area = exports.goto_next_area = (e) => {
    let ref_area = ancestral_area(e.target)
    stash_cursor_if_generic(ref_area)
    let next = next_visible_area(ref_area)
    if(next){
        focus(next, () => {
            next.scrollIntoViewIfNeeded()
            restore_cursor_if_generic(next)
        })
        
    }
}

const goto_previous_area = exports.goto_previous_area = (e) => {
    let ref_area = ancestral_area(e.target)
    stash_cursor_if_generic(ref_area)
    let previous = previous_visible_area(ref_area)
    if(previous){
        focus(previous, () => {
            previous.scrollIntoViewIfNeeded()
            restore_cursor_if_generic(previous)
        })
    }
}

const goto_first_area = exports.goto_first_area = (e) => {
    let ref_area = ancestral_area(e.target)
    stash_cursor_if_generic(ref_area)

    let area = document.querySelector('.area')
    if(area){
        focus(area, () => {
            area.scrollIntoViewIfNeeded()
            restore_cursor_if_generic(area)
        })
        
    }
}

const goto_last_area = exports.goto_last_area = (e) => {
    let ref_area = ancestral_area(e.target)
    stash_cursor_if_generic(ref_area)

    let areas = document.querySelectorAll('.area')
    if(areas && areas[areas.length - 1]){
        let area = areas[areas.length - 1]
        focus(area, () => {
            area.scrollIntoViewIfNeeded()
            restore_cursor_if_generic(area)
        })
    }
}

//======================================================================================================================

const append_result = exports.append_result = (area, text) => {
    let result_section = area.querySelector('.result')
    result_section.innerText = result_section.innerText + text
}

const replace_result = exports.replace_result = (area, text) => {
    clear_result(area)
    append_result(area, text)
}

const clear_result = exports.clear_result = (area) => {
    let result_section = area.querySelector('.result')
    result_section.innerHTML = ""
}

//======================================================================================================================

addEventListener('focus', (e) => {
    let area = ancestral_area(e.target)
    if (area){
        if (area.cm){
            area.cm.focus()
        }else if (area.xterm){
            area.xterm.focus()
        }
    }
})

addEventListener('focusin', (e) => {
    // focusin bubbles, focus does not. so use focusin.
    let area = ancestral_area(e.target)
    if(area) collapse_all_but(area)
})

//--------------------------------------------------------------------------

function uncollapse(area){
    area.style.maxHeight = ''
    area.style.overflow = 'auto'
}

function collapse(area){
    area.style.maxHeight = CONFIG.settings.collapse_height || '200px'
    area.style.overflow = 'auto'    
}

function collapse_all_but(area){
    let content = document.querySelector('#content')
    if(content.hasAttribute('auto-collapse')){
        let areas = document.querySelectorAll('.area')
        for(let ayrea of areas){
            collapse(ayrea)
            if(ayrea.id === area.id) uncollapse(area)
                area.scrollIntoViewIfNeeded()
        }
    }
}

const toggle_auto_collapse_mode = exports.toggle_auto_collapse_mode = (e) => {
    let content = document.querySelector('#content')
    let areas = document.querySelectorAll('.area')
    if (content.hasAttribute('auto-collapse')){
        content.removeAttribute('auto-collapse')
        areas.forEach(area => uncollapse(area))
    }else{
        content.setAttribute('auto-collapse', 'true')
        collapse_all_but(ancestral_area(e.target))
    }
}

//======================================================================================================================

function area_info(area){
    if(area.classList.contains('generic')){
        return 'Rich Text'
    }
    if(area.classList.contains('program')){
        if(area.classList.contains('javascript')){
            return area.hasAttribute('async') ? 'Async JavaScript' : 'JavaScript'
        }else if (area.classList.contains('scratch')){
            return 'Text'
        }else if (area.classList.contains('loader')){
            return 'Load Glide File/s (JSON)'
        }else{
            return area.getAttribute('prog_id')
        }
    }
} 

function info_is_shown(){
    let any_area = document.querySelector('.area')
    return any_area && any_area.hasAttribute('info')
}

const toggle_info = exports.toggle_info = (e) => {
    // console.log('toggling')
    if(info_is_shown()){
        Array.from(document.querySelectorAll('.area')).forEach(area => area.removeAttribute('info'))
    }else{
        Array.from(document.querySelectorAll('.area')).forEach(area => area.setAttribute('info', area_info(area)))
    }
}            