
const utils = require('./utils')

const show = exports.show = (el)  => {
    el.classList.remove('hidden')
}

const hide = exports.hide = (el)  => {
    el.classList.add('hidden')
}

const shown = exports.shown = (el)  => {
    return !hidden(el)
}

const hidden = exports.hidden = (el)  => {
    return el.classList.contains('hidden')
}

const is_selected = exports.is_selected = (el)  => {
    return el.classList.contains('selected')
}
//-----
const select = exports.select = (el)  => {
    el.classList.add('selected')
}

const deselect = exports.deselect = (el)  => {
    el.classList.remove('selected')
}

const deselect_all = exports.deselect_all = (nodelist)  => {
    for (let node of nodelist) {
        node.classList.remove('selected')
    }
}

const selected = exports.selected = (nodelist)  => {
    for (let node of nodelist) {
        if (node.classList.contains('selected')) {
            return node
        }
    }
}

const select_next = exports.select_next = (list_container_el,  no_next_callback = () => {})  => {
    let selected_el = selected(list_container_el.children)
    if (!selected_el && list_container_el.firstChild) {
        select(list_container_el.firstChild)
    }
    if (selected_el && selected_el.nextSibling) {
        deselect(selected_el)
        select(selected_el.nextSibling)
    }else{
        no_next_callback()
    }
    return true
}

const select_previous = exports.select_previous = (list_container_el, no_previous_callback = () => {})  => {
    let selected_el = selected(list_container_el.children)
    // no selecting anything if nothing is selected, unlike in select next.
    if (selected_el && selected_el.previousSibling) {
        deselect(selected_el)
        select(selected_el.previousSibling)
    }else{
        no_previous_callback()
    }
    return true
}
// from https://stackoverflow.com/a/24676492
// useful for textareas. if you attach this to its input event as a listener,
// then the textareas height will grow automatically as you type.
const auto_grow = exports.auto_grow = (e)  => {
    let element = e.target
    element.style.height = "5px"
    element.style.height = element.scrollHeight + "px"
}

const selection_is_within = exports.selection_is_within = (node) => {
    const range = window.getSelection().getRangeAt(0)
    const predicate = el => el.isSameNode(node)
    return utils.ancestor(range.startContainer, predicate) && utils.ancestor(range.endContainer, predicate)
}

//---------------------------------------

// dragger automatically comes to left of dummy due to flow of index.html layout
function closest_grid_positions_for_dummy(){

    let grid_x_position_pcts = [0, 25, 75, 100]

    let grid_x_positions = {}
    let doc_w = document.documentElement.offsetWidth

    for(let pct of grid_x_position_pcts){
        grid_x_positions[pct + ''] = Math.round(pct/100 * doc_w)
    }

    let closest_grid_on_the_right
    let dummy = document.querySelector('#results-dummy')
    let dummy_width = dummy.offsetWidth

    let positions = Object.values(grid_x_positions)
    let left_bound = positions[0]
    let right_bound = positions[-1]
    for(let pct in grid_x_positions){
        let w = grid_x_positions[pct]
        if ( w > dummy.offsetLeft || w == right_bound){
            closest_grid_on_the_right = w
            break;
        }
    }

    let closest_grid_on_the_left

    for(let w of Object.values(grid_x_positions).reverse()){
        if ( w < dummy.offsetLeft || w == left_bound){
            closest_grid_on_the_left = w
            break;
        }
    }
    return [closest_grid_on_the_left, closest_grid_on_the_right]
}

const decrease_editor_width = exports.decrease_editor_width = (e) => {

    e.preventDefault()
    let [left_target, __] = closest_grid_positions_for_dummy()
    document.querySelector('#results-dummy').style.minWidth =  document.documentElement.offsetWidth - left_target + 'px'
    // dummy is observed via event listener in index.js, any size changes to the dummy will automatically change the results view browser window. dragger moves automatically due to layout flow of index.html
}

const increase_editor_width = exports.increase_editor_width = (e) => {
    e.preventDefault()
    let [__, right_target] = closest_grid_positions_for_dummy()
    document.querySelector('#results-dummy').style.minWidth = document.documentElement.offsetWidth - right_target + 'px'
    // dummy is observed via event listener in index.js, any size changes to the dummy will automatically change the results view browser window. dragger moves automatically due to layout flow of index.html
}

const increase_inspector_height = exports.increase_inspector_height = (e) => {
    console.log("called increase inspector height") // TODO
}

const decrease_inspector_height = exports.decrease_inspector_height = (e) => {
    console.log("called decrease inspector height") // TODO

}