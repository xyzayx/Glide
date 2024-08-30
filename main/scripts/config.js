
let gutils = require('../../common/utils')
let default_config = require('./default-config')

let user_config = false
try{
    const {fs, path, os, hjson} = gutils.require_many('fs', 'path', 'os', 'hjson')
    const user_config_path = path.join(os.homedir(), ".glide", "config.hjson")
    user_config = hjson.parse(fs.readFileSync(user_config_path, {encoding:'utf8'}))
}catch(err){
    gutils.log_error(err)
}

let effective_config = {programs:[], settings: {}, themes: {}, shortcuts: []}
if(user_config){
    // Could read and parse file. now try to combine.

    if (has_valid_settings(user_config)){
        effective_config.settings = gutils.extend_object(default_config.settings, user_config.settings)
    }else{
        effective_config.settings = default_config.settings
        console.log("Invalid settings in user config.")
    }

    if (has_valid_shortcuts(user_config)){
        // later defined shortcuts overwrite previous shortcuts, so can just append
        // the user defined shortcuts to the default ones.
        effective_config.shortcuts.push(...default_config.shortcuts)
        effective_config.shortcuts.push(...user_config.shortcuts)
    }else{
        effective_config.shortcuts = default_config.shortcuts
        console.log("Invalid shortcuts in user config.")
    }

    if (has_valid_themes(user_config)){
        if(user_config.themes['Default Dark']){ // will interfere, so delete it.
            delete user_config.themes['Default Dark']
        }
        if(user_config.themes['Default Light']){ // will interfere, so delete it.
            delete user_config.themes['Default Light']
        }
        effective_config.themes = gutils.extend_object(default_config.themes, user_config.themes)
    }else{
        effective_config.themes = default_config.themes
        console.log("Invalid themes in user config.")
    }

}else{
    effective_config = default_config
}

const {nativeTheme} = require('electron')
effective_config.enable_dark_mode = nativeTheme.shouldUseDarkColors

// console.log(effective_config)

module.exports = effective_config

//======================================================================================================================
// Basic validation - whether certain properties/structure/s exist. Not comprehensive validation of values in any way.

function has_valid_shortcuts(config){
    if (config.shortcuts && config.shortcuts instanceof Array){
        for (let item of config.shortcuts){
            if (!gutils.has_props(item, ["function", "shortcut"])){
                return false
            }
        }
        return true
    }
    return false
}

function has_valid_settings(config){
    if (config.settings && config.settings instanceof Object){
        return true
    }
    return false
}

function has_valid_themes(config){
    if (config.themes && config.themes instanceof Object){
        for (let theme of Object.entries(config.themes)){
            if (!(theme instanceof Object)){
                return false
            }
        }
        return true
    }
    return false
}


