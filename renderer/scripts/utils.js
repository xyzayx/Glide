
const ancestor = exports.ancestor = (element, predicate) => {
    if (element && predicate(element)) {
        return element
    } else if (element && element.parentNode) {
        if(element.isSameNode(document.body)) return false // reached html (body's parentnode) without any matches
        return ancestor(element.parentNode, predicate)
    } else {
        return false
    }
}

// adapted from https://stackoverflow.com/a/1349426/1078016
const rand_char_str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
let rand_char_len = rand_char_str.length

const random_str = exports.random_str = (length) => {
    let result = ""

    for (let i = 0; i < length; i++) {
        result += rand_char_str.charAt(Math.floor(Math.random() * rand_char_len))
    }
    return result
}

const random_uniq_str = exports.random_uniq_str =  (length = 10) => {
    return random_str(length) + "_" + Date.now()
}

//----------------------------------------------------------------------------------------------------------------------

// replace every " in STR with \"
// also if there is \" replace with \\\"
// that is escape already escape quotes too.
const escape_double_quotes = exports.escape_double_quotes = (str) => {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const escape_single_quotes = exports.escape_single_quotes = (str) => {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const escape_generic = exports.escape_generic = (str, escapee, escaper = "\\") => {
    // first escape the escaper itself.
    // this is somewhat tricky to understand.
    // when constructing a regexp you pass "\\" + "\\" which is really \\
    // so the regexp constructed is /\\/ which searches for \
    // and in replacing, you want 2 \ in place of one \
    // so you again pass "\\" + "\\" which is \\ 
    // this is definitely correct. think about it before you change it.
    // i've arrived at this after some clear thinking. dont just change this because you think its wrong.
    let escaper_escape_rgx = new RegExp(escaper + escaper, 'g')
    let a = str.replace(escaper_escape_rgx, escaper + escaper)

    // now escape the escapee
    // the escapee should not be the same as escaper here. else incorrect results will occur.
    // because escaper is dealt with above, you dont need to deal with that again.
    let rgx = new RegExp(escapee, 'g')
    return a.replace(rgx, escaper + escapee)
}

//----------------------------------------------------------------------------------------------------------------------

const quote_string = exports.quote_string = (str, quote) => {
  return quote + escape_generic(str, quote) + quote
}

const back_quote_string = exports.back_quote_string = (str) => {
  return quote_string(str, '`')
}

const double_quote_string = exports.double_quote_string = (str) => {
  return quote_string(str, '"')
}

const single_quote_string = exports.single_quote_string = (str) => {
  return quote_string(str, "'")
}

//----------------------------------------------------------------------------------------------------------------------

const get_css_var = exports.get_css_var = (full_var_name) => {
    return getComputedStyle(document.documentElement).getPropertyValue(full_var_name).trim()
}

const remove_trailing_spaces = exports.remove_trailing_spaces = (text) => {
    return text.replaceAll(/\s+(\n\r|[\n\r])/g, "$1")
}

const get_function_object = exports.get_function_object = (custom_function_string)  => {
    let split_name = custom_function_string.split('.')
    let module = false
    let fn_name
    if (split_name.length > 1) {
        // has prefixed module name.
        module = split_name[0]
        fn_name = split_name[1]
    } else {
        fn_name = split_name[0]
    }

    let fn = false
    if (module) {
        let mod = require("./" + module)
        fn = mod[fn_name]
    } else {
        fn = window[fn_name]
    }
    return fn
}

//----------------------------------------------------------------------------------------------------------------------

const dispatch = exports.dispatch = (event_name, detail) => {
    dispatchEvent(new CustomEvent(event_name, {detail}))
}

//----------------------------------------------------------------------------------------------------------------------

const do_later = exports.do_later = (fn) => {
    // for certain situations doing this at the end of whatever else makes more sense.
    // since js is single threaded, doing this, will call fn after executing whatever is executing then.
    setTimeout(fn, 0)
}

//----------------------------------------------------------------------------------------------------------------------
const get_document_state = exports.get_document_state = () => {
    if(document.querySelector('xmeta[name="state"]')){
        return JSON.parse(document.querySelector('xmeta[name="state"]').getAttribute("content"))
    }else{
        return {}
    }
}

const update_document_state = exports.update_document_state = (obj) => {
    set_document_state(Object.assign(get_document_state(), obj))
}

function add_document_state_xmeta_if_does_not_exist(){
    if(!document.querySelector('xmeta[name="state"]')){
        let xmeta = document.createElement('xmeta')
        xmeta.setAttribute('name', 'state')
        xmeta.setAttribute('content', '{}')
        document.querySelector('#content').appendChild(xmeta)
    }
}

function set_document_state(state){
    add_document_state_xmeta_if_does_not_exist()
    let content = JSON.stringify(state)
    document.querySelector('xmeta[name="state"]').setAttribute("content", content)
}

//----------------------------------------------------------------------------------------------------------------------
const exec_in_results = exports.exec_in_results = code => {
    return ipcRenderer.invoke('exec_and_return', code)
}

//----------------------------------------------------------------------------------------------------------------------

const add_return_to_last_statement = exports.add_return_to_last_statement = (ast) => {
  if (ast.body && ast.body.length) {
    let last_node = ast.body[ast.body.length - 1]
    // Prefix the last expression or statement with the `return` keyword
    if (last_node.type === 'ExpressionStatement') {
      last_node.type = 'ReturnStatement'
      last_node.argument = last_node.expression
      delete last_node.expression
    }
  }
  return ast
}

const convert_var_to_window_dot = exports.convert_var_to_window_dot = (ast) => {
  // Traverse just the top level of the AST, 
  // replacing all instances of the `var` keyword with `window.`
  for (let node of ast.body){
    if (node.type === 'VariableDeclaration' && node.kind === 'var') {
      node.kind = ""
      for(let decl of node.declarations){
        if (decl.id.type === 'Identifier') {
          decl.id.name = `window.${decl.id.name}`
        }
      }
    }
  }
  return ast
}

const convert_function_declaration_to_variable_declaration = exports.convert_function_declaration_to_variable_declaration = (ast) => {
  for (let i = 0; i < ast.body.length; i++) {
    let node = ast.body[i];
    if (node.type === 'FunctionDeclaration') {
      // Create a new variable assignment
      let new_node = {
        type: 'VariableDeclaration',
        kind: 'var',
        declarations: [
          {
            type: 'VariableDeclarator',
            id: node.id,
            init: {
              type: 'FunctionExpression',
              params: node.params,
              body: node.body,
              async: node.async,
              generator: node.generator,
              expression: node.expression
            }
          }
        ]
      };

      // Replace the function declaration with the new variable assignment
      ast.body[i] = new_node;
    }
  }
  return ast
}

const esprima = require('esprima')
const escodegen = require('escodegen')

const code_str_to_ast = exports.code_str_to_ast = (str, ...args) => {
  return esprima.parseScript(str, ...args)
}

const ast_to_code_str = exports.ast_to_code_str = (ast) => {
  return escodegen.generate(ast)
}

const estraverse = require('estraverse')

function is_async_node(node){
  return (node.type === 'FunctionExpression' || 
          node.type === 'FunctionDeclaration' || 
          node.type === 'ArrowFunctionExpression') && node.async
}

const contains_top_level_await = exports.contains_top_level_await = (ast)  => {
  
  let found = false
  let should_ignore = false
  
  estraverse.traverse(ast, {
    
    enter: function(node) {
      if (is_async_node(node)) {
        should_ignore = true
      }
      if (node.type === 'AwaitExpression' && !should_ignore) {
        found = true
        this.break()
      }
    },
    
    leave: function(node) {
      if(found) this.break() 
      if (is_async_node(node)){
        should_ignore = false
      } 
    }
    
  })
  
  return found
  
}

//----------------------------------------------------------------------------------------------------------------------

const wrap_in_async = exports.wrap_in_async = (code) => {
    let fn_name = random_uniq_str(10)
    return `async function some_${fn_name}(){
        ${code}
    }`
}

const function_inner_body_ast = exports.function_inner_body_ast = (function_ast) => {
    return function_ast.body[0].body
}

const mod_async_area_inner_ast = exports.mod_async_area_inner_ast = (inner_ast) => {
    return add_return_to_last_statement(
                    convert_var_to_window_dot(
                        convert_function_declaration_to_variable_declaration(inner_ast)))
}

const mod_async_area_code = exports.mod_async_area_code = (raw_area_code) => {
    let ast = code_str_to_ast(wrap_in_async(raw_area_code))
    let inner_ast = function_inner_body_ast(ast)
    let modded_ast = mod_async_area_inner_ast(inner_ast)
    ast.body = modded_ast.body
    modded_code = ast_to_code_str(ast)
    return modded_code
}