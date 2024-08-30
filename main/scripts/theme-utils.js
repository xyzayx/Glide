const { nativeTheme} = require('electron')

let gutils = require('../../common/utils')

function css_root_obj_to_text(obj){
    let rules = ""
    for(let key in obj){
        rules += `--${key}: ${obj[key]};\n`
    }
    return ":root {\n" + rules + "}"
}

// Returns css (textual) for a given theme_name
// If you send a bogus theme_name will just return the default light theme css.
const get_effective_theme = exports.get_effective_theme = (theme_name, config) => {
    try{
        if(theme_name === 'system'){
            let dark_theme = config.themes[config.settings['system-dark-theme']]
            let light_theme = config.themes[config.settings['system-light-theme']]
            let dark_theme_css_str = css_root_obj_to_text(gutils.extend_object(config.themes['Default Dark'], dark_theme))
            let light_theme_css_str = css_root_obj_to_text(gutils.extend_object(config.themes['Default Light'], light_theme))
            return `@media (prefers-color-scheme: dark) {
                ${dark_theme_css_str}
            }
            @media (prefers-color-scheme: light) {
                ${light_theme_css_str}
            }`
        }else{
            let theme = config.themes[theme_name]
            return css_root_obj_to_text(gutils.extend_object(config.themes['Default Light'], theme))
        }
    }catch(err){
        console.log(err)
        return css_root_obj_to_text(config.themes['Default Light'])
    }
}

const get_effective_theme_bg_for_window = exports.get_effective_theme_bg_for_window = (theme_name, config) => {
    try{
        let theme
        if(theme_name === 'system'){
            if(nativeTheme.shouldUseDarkColors){
                theme = gutils.extend_object(config.themes['Default Dark'], config.themes[config.settings['system-dark-theme']])
            }else{
                theme = gutils.extend_object(config.themes['Default Light'], config.themes[config.settings['system-light-theme']])
            }
        }else{
            theme = gutils.extend_object(config.themes['Default Light'], config.themes[theme_name])

        }
        return theme.bg
    }catch(err){
        console.log(err)
    }
}
