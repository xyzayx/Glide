
const utils = require('./scripts/utils')
const req = require('temp-require')
const {ipcRenderer} = require('electron')
var {macroexpand, gensym} = require('macro-system'); // allow these to be global so i can be overwritten by me when im developing the macro system in glide.
var prettier = require('prettier')

let og_mac = macroexpand

function macros_on(){
    macroexpand = og_mac
}

function macros_off(){
    macroexpand = x => x
}

// From https://stackoverflow.com/a/35385518
function html_to_element(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function escape_html_entities(html){
  let temp = document.createElement('p')
  temp.textContent = html
  return temp.innerHTML
}

//----------------------------------------------------------------------------------------------------------

function append_code(code){
    let esc_code = escape_html_entities(code)
    let el = html_to_element(`<pre class="code">${esc_code}</pre>`)
    document.querySelector('#page-padding').before(el)
    el.scrollIntoViewIfNeeded(true)
}

//---------------------------------------------------------------

const stream = require('stream')
const duplex = new stream.Duplex({
  write: (chunk, encoding, next) => {

    let el = html_to_element(`<div class="result plain"></div>`)
    document.querySelector('#page-padding').before(el)
    el.textContent = chunk.toString()
    el.scrollIntoViewIfNeeded(true)

    next()
  }, read: () => {}})

const { Console } = require('console')
const node_console = new Console({ stdout: duplex})

//---------------------------------------------------------------

function append_result(result, errorp = false){
    if (result instanceof Element || 
         (result && 
          result['ownerDocument'] && 
          result instanceof result.ownerDocument.defaultView.Element)) { // iframes have a different object type.
        let result_div = html_to_element(`<div class="result node"></div>`)
        result_div.appendChild(result)
        document.querySelector('#page-padding').before(result_div)
        result_div.scrollIntoViewIfNeeded(true)
    }else{
        node_console.log(result)
    }
    utils.dispatch('evaled', {errorp})
}

function get_error_location(error, code, prefixed_lines = 0) {
    // Split the stack trace into individual stack frames
    const stack_frames = error.stack.split('\n')

    // Find the stack frame that corresponds to the eval call
    let eval_frame = null
    for (const frame of stack_frames) {
        if (frame.includes('at eval (eval at')){
            eval_frame = frame
          break
        }
    }

    if (eval_frame){
        // Extract the line and column numbers from the eval stack frame
        const match = eval_frame.match(/<anonymous>:(\d+):(\d+)/)
        if(match){
            const line = parseInt(match[1], 10) - prefixed_lines
            const column = parseInt(match[2], 10)
            return {line, column}
        }
    }

}

function remove_irrelevant_info_from_error(err){
    err = err.toString()
    err = err.replace(/\(eval at eval_code \([^\)]*\),.*?(\d+:\d+)\)/g, "$1")
    err = err.replace(/^\s*at eval.*$\n/mg, "")
    err = err.replace(/\(<anonymous>:(\d+:\d+)\)/, "$1")
    err = err.replace(/^.*?renderer\/scripts\/.*?$\n*/mg, "")
    return err
}

let last_async_code = ""
function append_err_result(err, code = false){
    let error_location = false
    try{
        if (code){
            error_location = get_error_location(err, code)
        }else{
            error_location = get_error_location(err, last_async_code, 1)
        }

        let code_elt = document.querySelector('#page-padding').previousSibling
        let code_lines = code_elt.textContent.split("\n")
        let error_line = code_lines[error_location.line - 1]
        let error_marked_line = error_line.slice(0, error_location.column - 1) + "<span style='color:red; text-decoration:underline'>" + error_line.slice(error_location.column - 1) + "</span>"
        code_lines[error_location.line - 1] = "<span style='background-color:rgb(214 48 45 / 16%)'>" + error_marked_line + "</span>"
        code_elt.innerHTML = code_lines.join("\n")
        // append_result(err.message + " (" + error_location.line + ":" + error_location.column + ")")
        append_result(err.message, true)
    }catch(secondary_err){
        append_result(remove_irrelevant_info_from_error(err), true)
        console.log(err)
        // console.log(secondary_err) // so can see why couldnt parse the error.
    }
    let result_elt = document.querySelector('#page-padding').previousSibling
    result_elt.classList.add("error")

}

//-----------------------------------------------------------------
function simple_eval(ignored_event, code){
    return window.eval(code)
}

function eval_code(ignored_event, code, asyncp){

    try {
        if(asyncp == true) {
            // since esprima wont parse await at top level, and macroexpand uses that internally,
            // so first wrap in async, macroexpand, and then unwrap.
            let wrapped = utils.wrap_in_async(code)
            let wrapped_expansion = macroexpand(wrapped)
            let ast = utils.code_str_to_ast(wrapped_expansion)
            let inner_ast = utils.function_inner_body_ast(ast)
            ast.body = inner_ast.body
            code = utils.ast_to_code_str(ast)
        }else{
           code = macroexpand(code) 
        }
        
    } catch(err){
        console.error("Failed macroexpansion. Skipping.", err)
        append_err_result(err, code)
    }
    
    try {
        if(asyncp == true) code = utils.mod_async_area_code(code)
    } catch(err){
        console.error("Failed modifying async area code.Skipping.", err)
        append_err_result(err, code)
    }

    try{
        code = prettier.format(code, {semi: false, parser: 'babel'})
    } catch(err){
        console.error("Failed formatting. Skipping.", err)
        append_err_result(err, code)
    }
    
    append_code(code)

    if(asyncp == true){
        try{
            last_async_code = code
            window.eval(
// this needs to be indented thus for error and line numbers to be manageable.
`async function async_eval() {
${code}
}
async_eval().then(append_result).catch(append_err_result)
            `)
        }catch(err){
            // catches syntax errors, which would make async_eval not execute.
            // so the async_eval().catch(append_result) wont work.
            append_err_result(err, code)
        }
    }else{
        try{
            result = window.eval(code)
            append_result(result)
        }catch(err){
            append_err_result(err, code)
        }
        
    }
}

ipcRenderer.on('eval', eval_code)
ipcRenderer.on('simple_eval', simple_eval)


//----------------------------------------------------------------------------------------------------------

function do_later(fn){
    // for certain situations doing this at the end of whatever else makes more sense.
    // since js in DOM is single threaded, doing this, will call fn after executing whatever is executing then.
    setTimeout(fn, 0)
}

//----------------------------------------------------------------------------------------------------------

let eval_multiple_codes = []
ipcRenderer.on('eval_multiple', async (e, codes) => {
    // concat ensures if eval_multiple event is triggered twice or more in succession, 
    // then too it executes in sequence. this happens when you try to 
    // load_code_from_glide_file in consecutive sections, since they dont return any values.
    eval_multiple_codes = eval_multiple_codes.concat(codes) 
    // do_later is needed to allow this async function to finish returning and then execute.
    // otherwise when you evaluate a very large glide file via the glide file loader,
    // or many other glide files, you end up with a call stack exceeded error. 
    // I wouldve imagined that the way im doing it, that is tail calling it, should maybe 
    // not blow the stack. But either there is no tail call optimization in node/electron, or
    // because these are async functions they may have behaviour that is peculiar in a way that I don't fully understand.
    // In any case, using do_later solves this issue entirely.
    do_later(() => eval_code(e, eval_multiple_codes[0].code, eval_multiple_codes[0].asyncp))
})

// once its evaled, if multiple codes, start evaling next. so everything is in sequence.
addEventListener('evaled', e => {
    if(e.detail.errorp){
        // stop evaling any further codes if encountered error.
        eval_multiple_codes = []
    }else{
        eval_multiple_codes = eval_multiple_codes.slice(1)
        if(eval_multiple_codes.length > 0){
            // read comment above in ..on('eval_multiple').. to understand the use of do_later here.
            // Succinctly, it solves stack exceeded error that occurs when evaluating very large number of multiple codes.
            do_later(() => eval_code(e, eval_multiple_codes[0].code, eval_multiple_codes[0].asyncp))
        }
    }

})

//----------------------------------------------------------------------------------------------------------

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

//----------------------------------------------------------------------------------------------------------

function xhttp_fetch(filename, callback, error404 = () => {}) {
    let xhr = new XMLHttpRequest()
    xhr.onload = function() {
        if (this.status == 200) {
            callback(xhr)
        } else if (this.status == 404) {
            error404(xhr)
        }
    }
    xhr.open("GET", filename, true)
    xhr.send()
}

// very helpful to load random scripts off of the internet, I said foaming at the mouth.
function load_script(url, do_fn = () => {}){
    xhttp_fetch(url, (xhr) => {
        let el = document.createElement('script')
        el.text = xhr.responseText
        document.head.appendChild(el)
        do_fn(el)
    })
}

// vital to load any local js files into the dom.
function load_script_local(path){
    let fs = require('fs')
    let data = fs.readFileSync(path)
    let el = document.createElement('script')
    el.text = data
    document.head.appendChild(el)
    return el.outerHTML
}

//----------------------------------------------------------------------------------------------------------

function otype(o) {
  return Object.prototype.toString.call(o);
}


/*

This is likely not going to be useful for anything apart from the original thing this was designed for. Which is to get a serializable version of the window object so that it can be sent via ipc to the editor window, in glide, so that it can be used for autocomplete. 

This is a surprisingly complicated thing to do. The window object suffers from many warts that make it beliigerently unwanting to be serialized. There are many subtle things that need to be taken care of.

1 ciruclar refs, window object has a property called window, which points to itself. also self, and global, which also point to itself. To take care of this, I keep a chain of all the objects that were visited along the way to a paritcular object. This way I can compare if I had seen this object in its chain anywhere before, then its circular. This will still correctlly allow many refs to the same object from many places as long as they are not circular.

2 Unfortunately allowing multiple refs to the same object, makes it computationally expensive. Since there are so many refs repeated all over the place in a complex object like the window object. To get around this, I keep all of the objects that were ever encountered in a map from object to its representation (copy that can be serialized). Initially it is set to the prop because you dont know how much iteration is needed on this object to finish its image. Once the image is complete, then the map is updated to the rep/image in place of the prop. Circular objects values are the prop, since they are never recurred on. Note: It is impossible to combine chain and all into one object. All adds the object it sees. Chain checks the current object 

3 fix_props_for_scaffold adds in non enumerable properties to the enumerable properties of an object and returns a new object with all tthe props. I do this so that props like Array, Function, Object etc. of window are included in the scaffold, since they are non enumerable props and dont show up in for... in loops. 

4 This though, leads to another issue. Prototype. for...in wont list it, but getownpropertynames does, and i do that above in fix_props so Objects (most i think, and not all) have a prototype property. But recurring and fetching the prototypes properties can lead to exceptions since certain properties are not allowed to be accessed. I originally did conditionally check and come up with a half decent way to still recur into the prototype and not have errors. But this lead to somewhat poor performance due to way I was checking properties and whether they might cause exceptions. It wasn't robust. And since this is for autocomplete purpose and I have never had the need to use the prototype property in any real way, I thought it simpler to just exclude it from the scaffold.

5 Finally there remains one interesting issue. If an objects property is a getter, when you access it, the getter is fired and an object maybe created and returned, that in turn might have some prop that when accessed will create another new object and so on, and all.has, or chain.has will never be true. To get around this I need a max_recursion_depth which will stop going deeper than a certain level. A level of 20 from experience is more than enough for any kind of nested structure that is meaningfully usable (human). Also note that the only way to know if a property is a getter is to use getownpropertypdescriptor which is slow. But worse still useful things like document.location are also getters. So you cant eliminate all properties as getters, because you will end up with a very shallow and sparse scaffold. 

*/

// needed, it is called via executejavascript from the renderer process to get a scaffold of the window, 
// to use for autocomplete.

function scaffold_of(x, prop = false, chain = new Set(), all = new Map(), max_recursion_depth = 20){
  
  prop = prop ? prop : (x.name || '')
  let out = {}
  
  if(!all.has(x)) all.set(x, prop) // only keep first path to the object that was found.
  
  if(chain.has(x)) return all.get(x) // circular
  chain.add(x)
  
  let itered = false
  let obj = fix_props_for_scaffold(x)
  
  for(let prop in obj){
    
    itered = true
    
    let item = x[prop]
    let type = otype(item)
    
    if(item &&
       chain.size < max_recursion_depth && 
       type !== '[object Array]' && 
       type !== '[object String]'){
       if(!all.has(item)){
         if(prop !== 'prototype'){ // ignore all prototype objs, they create issues.
           out[prop] = scaffold_of(item, prop, new Set(chain), all)
           all.set(item, out[prop])
         }
       }else{
         out[prop] = all.get(item)
       }
       
    }else{
       out[prop] = otype(item)
    }
    
  }
  
  return itered ? out : otype(x)
   
}

function fix_props_for_scaffold(x){
  
  let obj = {}

  for(let prop in x){
    obj[prop] = x[prop]
  }

  // Just doing for let x in obj, doesnt enumerate all properties. 
  // For instance Object, Function, Array etc in window will not be available above. so add those.
  for(let prop of Object.getOwnPropertyNames(x)){
    // These are forbidden to access properties on Function objects.
    if(otype(x) === '[object Function]' && prop === 'arguments' || prop === 'caller' || prop === 'callee') continue
    obj[prop] = x[prop]
  }

  return obj
}

// console.log(scaffold_of(window))

//----------------------------------------------------------------------------------------------------------

function browser_view_exists(id){
    ipcRenderer.send('browser_view_exists', id)
    return new Promise((resolve, reject) => {
        ipcRenderer.on('browser_view_exists', (e, exists) => resolve(exists))
    })
}

function add_browser_view(id){
    return new Promise(async (resolve, reject) => {
        let exists = await browser_view_exists(id)
        if (exists){
            reject('Browser view with id "${id}" already exists.')
        }else{
            ipcRenderer.send('add_browser_view', id)
            ipcRenderer.on('added_browser_view', (e, added_id) => {
                // send_viewport_resized() // so it positions correctly
                if(added_id == id){
                    ipcRenderer.send('size_browser_view', added_id)
                    resolve(true)
                }
            })
        }
    })
}

function remove_browser_view(id){
    ipcRenderer.send('remove_browser_view', id)
    return new Promise((resolve, reject) => {
        ipcRenderer.on('removed_browser_view', (e, removed_id) => {
            if(removed_id == id){
                resolve(true)
            }
        })
    })
}

function set_top_browser_view(id){
    ipcRenderer.send('set_top_browser_view', id)
}

function exec_in_browser_view(id, js_str){
    ipcRenderer.send('exec_in_browser_view', id, js_str)
    return new Promise((resolve, reject) => {
        ipcRenderer.on('execed_in_browser_view', (e, execed_id, value) => {
            if(execed_id == id){
                resolve(value)
            }
        })
    })
}    

// executes renderer process commands from evaluating code in results!
function exec_renderer(command_name){
    ipcRenderer.send('execute_command_in_renderer_window', command_name)
}

function exec_main(code){
    ipcRenderer.send('execute_command_in_main_window', code)
}

function eval_marked_areas(){
    exec_renderer('js-area.eval_marked_areas')
}

function reload_and_eval_marked_areas(){
    ipcRenderer.send('reload_results_view_and_eval_marked_areas')
}
