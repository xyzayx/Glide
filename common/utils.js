// Utils that can be shared by main process and renderer processes.

const has_props = module.exports.has_props = (obj, props) => {
    for (let prop of props){
        if (!obj[prop]){
            return false
        }
    }
    return true
}

const extend_object = module.exports.extend_object = (in_obj, from_obj) => {
    return Object.assign(Object.assign({}, in_obj), from_obj)
}

const require_many = module.exports.require_many = (...args) => {
    let out = {}
    for(let arg of args){
        out[arg] = require(arg)
    }
    return out
}

// Given a time limit, this will execute a function do_fn.
// Returns a promise.
// do_fn is passed the resolve and reject functions. 
// do_fn should resolve with whatever value you need.
// If however the time limit is reached before do_fn finishes, then the promise resolves automatically.
// It resolves with the time_limit_resolution_value.
const with_time_limit = exports.with_time_limit = (milliseconds, time_limit_resolution_value, do_fn) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(time_limit_resolution_value), milliseconds)
    do_fn(resolve, reject)
  })
}

const log_error = exports.log_error = (err) => {
    console.log("======================= CAUGHT ERROR ======================")
    console.log(err)
    console.log("===========================================================")
}