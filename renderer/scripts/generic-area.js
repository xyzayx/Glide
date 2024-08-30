let Area = require('./area.js')
let area_styling = require('./area-styling.js')
const utils = require('./utils')
const history = require('./history')

const make = exports.make = () => {
    history.pause()
    let area = Area.make()
    area.classList.add('generic')
    area.setAttribute('contentEditable', true)
    area.setAttribute('spellcheck', false)
    area.innerHTML = "<br>"
    if (CONFIG) {
        // if config global is present use that.
        area_styling.set_column_count(area, CONFIG.settings['default-generic-column-count'] || 1)
    } else {
        CONFIG_PROMISE.then(config =>{
            history.pause()
            area_styling.set_column_count(area, config.settings['default-generic-column-count'] || 1)
            history.resume()
        })
    }
    history.resume()
    return area
}

const insert = exports.insert = (e) => {
    let area = make()
    Area.insert(area, e.target, e)
    area.focus()
    return false
}

function is_uri(text){
    return text.trim().match(/^\S+:\/\/\S+$/) // any form of uri, ccl://xyz or ws://something.s etc.
}

// This has no menu entry.
const create_link = exports.create_link = (e) => {
    let area = Area.ancestral_area(e.target)
    if(area.classList.contains('generic')){
        e.preventDefault()
        let sel = window.getSelection()
        if(sel){
            let text = sel.toString()
            if(is_uri(text)){
                document.execCommand('createLink', false, text)
            }else{
                document.execCommand('createLink', false, '#' + 
                  encodeURIComponent(text.toLowerCase().replaceAll(/\s/g, ""))) // make frag url
            }
            return true
        }
    }
    return false
}

const create_name = exports.create_name = (e) => {
    if(create_link(e)){
        let el = utils.ancestor(getSelection().anchorNode, el => el instanceof HTMLAnchorElement)
        if(el && el.getAttribute('href').match(/^#/)){
            el.setAttribute('name', el.innerHTML.toLowerCase().replaceAll(/\s/g, ""))
            el.removeAttribute('href')
        }
    }
}

// since links are editable, you cant click them and see if they work.
// So a special command to do the same. be anywhere in the link and activate this.
// Another way suggested online was to disable contenteditable on say command down and command click links.
// but that seems hacky and not within the nature of this doc.
const open_link = exports.open_link = (e) => {
    let el = utils.ancestor(getSelection().anchorNode, el => el instanceof HTMLAnchorElement)
    if (el){
        // if the link is external it is opened in the browser
        // due to will_navigate event being captured and modified in file_operations in main
        document.location.href = el.href
    }
}