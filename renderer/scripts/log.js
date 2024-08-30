
let ui_utils = require('./ui-utils')

let el // the log element in DOM
addEventListener('load', (e) => {
    el = document.querySelector('#log')
})

let log_clear_timeout
const log = exports.log = function(...content) {
    if (log_clear_timeout) clearTimeout(log_clear_timeout)
    console.log(...content)
    let date = new Date()
    content.unshift(date.toLocaleTimeString() + ':&nbsp; ')
    append_entry(content)
    log_clear_timeout = setTimeout(clear, 15000)
}

const append_entry = function(content){
    // remove any existing pads.
    let pads = document.querySelectorAll('#log .pad')
    for (let pad of Array.from(pads)){
        pad.remove()
    }

    let div = document.createElement('div')
    div.innerHTML = content.join(' ')
    el.appendChild(div)
    div.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"})
    return div
}

const clear = () => {
    let div = append_entry(["&nbsp;", "&nbsp;"])
    div.classList.add('pad')
}

const clear_all = () => {
    el.innerHTML = ""
}

// cycle through single line, to expanded, to hidden, to single line again...
const cycle_view = exports.cycle_view = (e) => {
    if (el.classList.contains('expanded')) {
        el.classList.remove('expanded')
        ui_utils.hide(el)
    } else if (ui_utils.hidden(el)) {
        ui_utils.show(el)
        if (el.lastChild) {
            el.lastChild.scrollIntoView()
        }
    } else {
        el.classList.add('expanded')
        if (el.lasChild) {
            el.lastChild.scrollIntoView()
        }
    }
}
