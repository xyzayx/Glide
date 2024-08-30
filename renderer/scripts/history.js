
const Area = require('./area.js')
const utils = require('./utils.js')

//----------------------------------------------------------------------------------------------------------------------

let content_observer = new MutationObserver(content_observer_fn)
let style_observer = new MutationObserver(style_observer_fn)
let contenteditable_observer = new MutationObserver(contenteditable_observer_fn)
let cm_observer = new MutationObserver(cm_observer_fn)

//------------------------------------------------------------

function content_observer_fn(mutations) {
    add_record(mutations)
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => track_area(Area.ancestral_area(node)))
    })
}

function style_observer_fn(mutations){
    add_record(mutations)
}

function contenteditable_observer_fn(_mutations){
    add_record(_mutations)
}

function cm_observer_fn(_mutations){
    let cm_el = utils.ancestor(_mutations[0].target, el => el.classList.contains('CodeMirror'))
    if(cm_el){
        update_cm_el_records_values(cm_el)
        if(cm_el.old_value === cm_el.new_value) return // this happens when changing cursor pos, or selecting some range of text, things i dont care about undoing or redoing.
        let mutations = [{
            target: cm_el, 
            old_value: cm_el.old_value, 
            new_value: cm_el.new_value, 
            old_cursor: cm_el.old_cursor, 
            new_cursor: cm_el.new_cursor,
            type: "cm"
        }]
        add_record(mutations)
    }
}


function update_cm_el_records_values(cm_el){
    cm_el.old_value = 'new_value' in cm_el ? cm_el.new_value : null
    cm_el.new_value = Area.ancestral_area(cm_el).cm.getValue()
    cm_el.old_cursor = 'new_cursor' in cm_el ? cm_el.new_cursor : null
    cm_el.new_cursor = Area.ancestral_area(cm_el).cm.getCursor()
}

//----------------------------------------------------------------------------------------------------------------------
// main functionality

function start_observing(){
    // Observe addition or deletion of areas. 
    // This ends up including inserting, copying, cutting, pasting, splitting, merging areas. 
    // content_observer attaches another observer to every new area: track_area. 
    // Which handles individual area mutations based on type - cm, contenteditable.
    content_observer.observe(document.querySelector('#content'), {childList: true})

    // Glide document width changes
    style_observer.observe(document.querySelector('html'), {attributeOldValue: true, attributeFilter: ['style']})

    // Observe (track) any existing areas. 
    // New ones get observed by a new observer attached by content_observer.
    Array.from(document.querySelectorAll('.area')).forEach(track_area)
}

function track_area(area){

    if(!history_started || !area) return

    // Observe style changes like font-family, size, width etc.
    style_observer.observe(area, {attributeOldValue: true, attributeFilter: ['style', 'custom_style']})

    if(area.hasAttribute('contenteditable')){ // generic and dehydrated areas
        contenteditable_observer.observe(area, {characterDataOldValue: true, childList: true, subtree: true})

    } else if(area.cm){ // program, js, scratch area (any codemirror areas)
        let cm_el = area.querySelector('.CodeMirror')
        cm_observer.observe(cm_el, {characterDataOldValue: true, childList: true, subtree: true})
    }
}

//----------------------------------------------------------------------------------------------------------------------

let history_started = false

const start = exports.start = () => {
    history_started = true
    start_observing()
}

let nested_pause_level = 0

const resume = exports.resume = () => {
    
    if(!history_started) return
    nested_pause_level--
    if(nested_pause_level !== 0) return // only resume if reached outermost pause call
    start_observing()
}

const pause = exports.pause = () => {
    
    if(!history_started) return
    nested_pause_level++

    disconnect_observer(content_observer, content_observer_fn)
    disconnect_observer(style_observer, style_observer_fn)
    disconnect_observer(cm_observer, cm_observer_fn)
    disconnect_observer(contenteditable_observer, contenteditable_observer_fn)
}

function disconnect_observer(observer, observer_fn){
    let recs = observer.takeRecords()
    if(recs.length > 0) observer_fn(recs)
    observer.disconnect()
}

//======================================================================================================================

let pointer = 0
let records = []

function inc_pointer(){
    pointer++
}

function dec_pointer(){
    pointer--
}

//------------------------------------------------------------

addEventListener('click', set_last_cursor)
addEventListener('keydown', set_last_cursor)

let last_cursor = false
function set_last_cursor(){
    let cursor = get_cursor()
    if(cursor) last_cursor = cursor
}

//------------------------------------------------------------

let in_batch = false
let batch_pointer_inced = false

let batch = []
let last_cursor_before_batch = false
function add_record(mutations){
    // console.log("received to add", mutations)

    if(mutations.type === 'start_batch'){
        in_batch = true
        last_cursor_before_batch = last_cursor
        return
    }

    if(mutations.type === 'end_batch'){
        in_batch = false
        if(batch.length > 0){
            if(!(records[pointer] && records[pointer - 1] &&
                records[pointer].type == 'cursor' &&
                records[pointer - 1].type == 'cursor')) {
                // only increase pointer of current record is not a cursor.
                // otherwise you end up with three cursor records since two
                // are pushed below and that leads to errors, since the 
                // fundamental assumption is that there are always 2 cursor records
                // between any other mutation records
                inc_pointer()
            }
            push_cursor(last_cursor_before_batch)
            inc_pointer()
            records[pointer] = batch.map(x => x).flat() //clone
            records[pointer].type = "standard" // just so when you check for type in base_undo/redo, it doesnt error.
            inc_pointer()
            push_cursor()
            batch = []
            last_cursor_before_batch = false
        }
        return
    }

    if(in_batch){
        batch.push(mutations)
    }else{
        if(!(records[pointer] && records[pointer - 1] &&
                records[pointer].type == 'cursor' &&
                records[pointer - 1].type == 'cursor')) {
            // only increase pointer of current record is not a cursor.
            // otherwise you end up with three cursor records since two
            // are pushed below and that leads to errors, since the 
            // fundamental assumption is that there are always 2 cursor records
            // between any other mutation records
            inc_pointer()
        }
        push_cursor(last_cursor)
        inc_pointer()
        records[pointer] = mutations 
        inc_pointer()
        push_cursor()
        set_last_cursor()
    }

}

function get_cursor(){
    try{
        let sel = window.getSelection()
        let range = sel.getRangeAt(0)
        if(range){
           let cursor = [] // so records remain closed over the type (array). so batching etc doesnt bork.
           cursor.type = 'cursor'; cursor.node = range.startContainer; cursor.offset = range.startOffset
           return cursor
        }
    }catch(err){
        console.log(err)
        return null
    }
}

function push_cursor(_cursor = false){
    let cursor = _cursor || get_cursor()
    if(cursor) {
        records[pointer] = cursor
    }
}

//----------------------------------------------------------------------------------------------------------------------

const start_batch = exports.start_batch = () => {
    add_record({type: 'start_batch'})
}

const end_batch = exports.end_batch = () => {
    add_record({type: 'end_batch'})
}

//======================================================================================================================

const undo = exports.undo = (e) => {
    pause()
    try{
        e.preventDefault()
        speedy_undo_redo(base_undo)
    }catch(err){
        console.log(err)
    }
    resume()
}

const redo = exports.redo = (e) => {
    pause()
    try{
        e.preventDefault()
        speedy_undo_redo(base_redo)
    }catch(err){
        console.log(err)
    }
    resume()
}

//--------------------------------------------------------------

let speed = 1
let mult = 1.1
let reset_speed_timer = setTimeout(() => {}, 0)
let previous_undo_redo_being_handled = false // shortcut comes in async so can fire multiple times while previous one is executing leading to stutter.

function speedy_undo_redo(base_fn){

    if (previous_undo_redo_being_handled) return

    previous_undo_redo_being_handled = true

    let whole_speed = Math.floor(speed)
    for(let i = 0; i < whole_speed; i++){
        base_fn()
    }

    speed = Math.min(speed * mult, 4) // max 4 undo/redo, feels fast but can still see.
    clearTimeout(reset_speed_timer)
    reset_speed_timer = setTimeout(() => speed = 1, 100)

    previous_undo_redo_being_handled = false

}

//----------------------------------------------------------------------------------------------------------------------

function next_undo_cursor_area(){
    let i = 1
    let record
    while(record = records[pointer - i]){
        if(record.type === 'cursor') return Area.ancestral_area(record.node)
        i++
    }
}

function next_redo_cursor_area(){
    let i = 1
    let record
    while(record = records[pointer + i]){
        if(record.type === 'cursor') return Area.ancestral_area(record.node)
        i++
    }
}

function cursor_area(){
    let record = records[pointer]
    if (record.type === 'cursor') return Area.ancestral_area(record.node)
    return false
}

function base_undo(){
    if(!records[pointer]) return
    if(records[pointer].type === 'cursor' && records[pointer - 1] && records[pointer - 1].type !== 'cursor'){
        // ignore latest cursor, just move on
        dec_pointer()
        undo_mutations(records[pointer])
        dec_pointer()
        restore_cursor(records[pointer])
    }else if(records[pointer].type === 'cursor' && records[pointer - 1] && records[pointer - 1].type === 'cursor'){
        if(next_undo_cursor_area() === cursor_area()){
            // ignore two cursor areas first, then undo mutations and restore cursor
            dec_pointer()
            dec_pointer()
            undo_mutations(records[pointer])
            dec_pointer()
            restore_cursor(records[pointer])
        }else{
            // just undo to next cursor area
            dec_pointer()
            restore_cursor(records[pointer])
        }
    }
}

function base_redo(){
    if(!records[pointer]) return
    if(records[pointer].type === 'cursor' && records[pointer + 1] && records[pointer + 1].type !== 'cursor'){
        // ignore latest cursor, just move on
        inc_pointer()
        redo_mutations(records[pointer])
        inc_pointer()
        restore_cursor(records[pointer])
    }else if(records[pointer].type === 'cursor' && records[pointer + 1] && records[pointer + 1].type === 'cursor'){
        if(next_redo_cursor_area() === cursor_area()){
            // ignore two cursor areas first, then redo mutations and restore cursor
            inc_pointer()
            inc_pointer()
            redo_mutations(records[pointer])
            inc_pointer()
            restore_cursor(records[pointer])
        }else{
            // just redo to next cursor area
            inc_pointer()
            restore_cursor(records[pointer])
        }
    }
}

//----------------------------------------------------------------------------------------------------------------------

function undo_mutations(mutations){
    mutations.reverse().forEach(mutation => {
        if(mutation.type === 'cm'){ // custom type
            let cm_el = mutation.target
            let area = Area.ancestral_area(cm_el)
            if(mutation.old_value !== null) {
                area.cm.setValue(mutation.old_value)
            }
            if(mutation.old_cursor){
                area.cm.setCursor(mutation.old_cursor)
            }
            area.cm.refresh()
            area.cm.focus()
            update_cm_el_records_values(cm_el)
        }
        if(mutation.type === 'childList'){
            if(mutation.addedNodes.length > 0){
                mutation.addedNodes.forEach(node => node.remove())
            }
            if(mutation.removedNodes.length > 0){
                if(mutation.previousSibling){
                    mutation.previousSibling.after(...mutation.removedNodes)
                }else if(mutation.nextSibling){
                    mutation.nextSibling.before(...mutation.removedNodes)
                }else{
                    mutation.removedNodes.forEach(node => {
                        mutation.target.appendChild(node)
                    })
                }
            }
        }
        if(mutation.type === 'characterData'){
            mutation.new_value = mutation.target.data
            mutation.target.data = mutation.oldValue
        }
        if(mutation.type === 'attributes'){
            mutation.new_value = mutation.target.getAttribute(mutation.attributeName)
            if(mutation.oldValue !== null){
                mutation.target.setAttribute(mutation.attributeName, mutation.oldValue)
            }else{
                mutation.target.removeAttribute(mutation.attributeName)
            }
        }
    })
}

function redo_mutations(mutations){
    mutations.reverse().forEach(mutation => {
        if(mutation.type === 'cm'){ // custom type
            let cm_el = mutation.target
            let area = Area.ancestral_area(cm_el)
            area.cm.setValue(mutation.new_value)
            area.cm.setCursor(mutation.new_cursor)
            area.cm.refresh()
            area.cm.focus()
            update_cm_el_records_values(cm_el)
        }
        if(mutation.type === 'childList'){
            if(mutation.removedNodes.length > 0){
                mutation.removedNodes.forEach(node => node.remove())
                return
            }
            if(mutation.addedNodes.length > 0){
                if(mutation.previousSibling){
                    mutation.previousSibling.after(...mutation.addedNodes)
                }else if(mutation.nextSibling){
                    mutation.nextSibling.before(...mutation.addedNodes)
                }else{
                    mutation.addedNodes.forEach(node => {
                        mutation.target.appendChild(node)
                    })
                }
                return
            }
        }
        if(mutation.type === 'characterData'){
            mutation.target.data = mutation.new_value
        }
        if(mutation.type === 'attributes'){
            mutation.target.setAttribute(mutation.attributeName, mutation.new_value)
        }
    })
}
//----------------------------------------------------------------------------------------------------------------------

function restore_cursor(custom_mutation){
    let area = Area.ancestral_area(custom_mutation.node)

    if(area.cm){
        if(!area.cm.hasFocus()) area.cm.focus()
        return
    } // cm cursor is managed separately, and causes issues if done here.

    set_cursor(custom_mutation.node, custom_mutation.offset)
    Area.focus(area, () => {
        // get parent node that is an element, and not a text node, so that you can use scrollintoview on it.
        let elt = utils.ancestor(custom_mutation.node, node => node.nodeType === Node.ELEMENT_NODE)
        if(elt.scrollIntoViewIfNeeded) elt.scrollIntoViewIfNeeded(true)
    })

}

function set_cursor(node, offset){
    const selection = window.getSelection()
    const range = new Range()
    range.setStart(node, offset)
    selection.removeAllRanges()
    selection.addRange(range)
}

//======================================================================================================================

let batched_function_cache = []

// Used by bind_shortcuts in Area.js, and execute_command in index.js (for menu triggered commands)
// Returns a batched version of a defined command function. 
// So undo redo will work correctly. Undoing a single operation and not a single mutation.
// Because some operations do multiple mutations like splitting merging etc.

const get_batched_function = exports.get_batched_function = (full_fn_name) => {

    if(batched_function_cache[full_fn_name]) return batched_function_cache[full_fn_name]

    let fn = utils.get_function_object(full_fn_name)

    if (!fn){
        // console.log("Shortcut function not defined: ", full_fn_name)
    }else{
        let batch_fn
        if(full_fn_name === 'history.undo' || full_fn_name === 'history.redo'){
            batch_fn = fn 
        }else{
            batch_fn = function(e){
                // this makes every command to be undone and redone as one single batched operation.
                start_batch()
                let val = fn(e)
                utils.do_later(() => end_batch())
                return val
            }
        }

        batched_function_cache[full_fn_name] = batch_fn
        return batch_fn
    }
}
