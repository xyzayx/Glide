
const Area = require('./area')
const program_area = require('./program-area')
const {ipcRenderer} = require('electron')
const logger = require('./log')

// const esrequire = require('esm')(module)

const insert = exports.insert = (e)  => {
    let area = program_area.make('javascript')
    Area.insert(area, e.target, e)
    program_area.init_glide_cm(area)
    return false
}

const insert_async = exports.insert_async = (e)  => {
    let area = program_area.make('javascript')
    area.setAttribute('async', true)
    Area.insert(area, e.target, e)
    program_area.init_glide_cm(area)
    return false
}

const insert_glide_file_loader = exports.insert_glide_file_loader = (e)  => {
    let area = program_area.make('loader')
    Area.insert(area, e.target, e)
    program_area.init_glide_cm(area)
    return false
}

const toggle_async = exports.toggle_async = e => {
    let area = Area.ancestral_area(e.target)
    if(area.classList.contains('program')){
       area.hasAttribute('async') ? area.removeAttribute('async') : area.setAttribute('async', true) 
    }
    program_area.configure_lint(area)

    Area.toggle_info()
    Area.toggle_info() // toggling info twice updates it.
}

function code_from_area(area){
    let selection = getSelection().toString()

    // // when you eval after pasting something codemirror gives the value before paste.
    // // refreshing doesnt work. thats only for rendering things i guess. not values.
    // // i found a workaround. if you blur (undocumented) and then immediately focus again
    // // then the value is updated. so:
    // area.cm.display.input.blur()
    // area.cm.focus()

    let code = selection.length == 0 ? area.cm.getValue() : selection
    return code
}

function code_from_event(e){
    let area = Area.ancestral_area(e.target)
    return code_from_area(area)
}

function full_area_code_from_event(e){
    let area = Area.ancestral_area(e.target)
    return area.cm.getValue()
}

const eval_area = exports.eval_area = async (e) => {
    let area = Area.ancestral_area(e.target)

    if(area.classList.contains('loader')){
        let files = JSON.parse(code_from_area(area))
        let gf_codes = await ipcRenderer.invoke('expand_glide_files', files)
        ipcRenderer.send('eval_multiple', gf_codes)
    }else if(area.hasAttribute('async')){
        let code = code_from_event(e)
        ipcRenderer.send('eval', code, true)
    }else{
        let code = code_from_event(e)
        ipcRenderer.send('eval', code)
    }
}

function auto_toggle_async(e){
    try{
        let code = full_area_code_from_event(e) // code_from_event may return selection and you dont want that.
        let inner_ast = utils.function_inner_body_ast(utils.code_str_to_ast(utils.wrap_in_async(code)))
        // console.log(inner_ast)
        let contains_await = utils.contains_top_level_await(inner_ast)
        let area = Area.ancestral_area(e.target)
        if (contains_await && !area.hasAttribute('async')){
            toggle_async(e)
        }
        if(!contains_await && area.hasAttribute('async')){
            toggle_async(e)
        }
    }catch(err){
        // console.log(err)
    }
}
addEventListener('keyup', auto_toggle_async)

async function eval_areas(ignored_event, areas) {
    let codes = []
    for(let area of areas){
        if(area.classList.contains('loader')){
            let files = JSON.parse(code_from_area(area))
            // files needs to be an array of arrays like so:
            // [['some/path', true],
            //  ['some/path', false]]
            let gf_codes = await ipcRenderer.invoke('expand_glide_files', files)
            codes = codes.concat(gf_codes)
        }else{
            if (area.hasAttribute('async')){
                codes.push({code: code_from_area(area), asyncp: true})
            }else{
                codes.push({code: code_from_area(area), asyncp: false})
            }
        }
    }
    ipcRenderer.send('eval_multiple', codes)
}

const eval_marked_areas = exports.eval_marked_areas = (e)  => {
    e.preventDefault()
    let areas = document.querySelectorAll('.program')
    let marked_areas = Array.from(areas).filter(area => area.getAttribute('mark'))
    if (marked_areas && marked_areas.length > 0) {
        eval_areas(e, marked_areas)
    } else {
        logger.log("No areas marked for evaluation.")
    }
}

const eval_all_areas = exports.eval_all_areas = (e)  => {
    e.preventDefault()
    let areas = document.querySelectorAll('.program')
    if (areas && areas.length > 0) {
        eval_areas(e, Array.from(areas))
    } else {
        console.log("No areas present for evaluation.")
    }
}

const clear_console = exports.clear_console = () => {
    ipcRenderer.send('eval', 'console.clear()')
}

