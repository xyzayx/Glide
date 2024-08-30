
const logger = require('./log')
const Area = require('./area')
const program_area = require('./program-area')
const ui_utils = require('./ui-utils')
const history = require('./history')
const gutils = require('../../common/utils')

//----------------------------------------------------------------------------------------

const processed_content = exports.processed_content = () => {
    let els = Array.from(document.querySelector('#content').children)
    let content = ""
    for (let el of els){
        let area = Area.ancestral_area(el) // just for safeguard, not strictly needed.
        if (area){
            let area_copy = area.cloneNode(true) // so existing document isnt changed
            if (area.cm){
                area.cm.save() // commit unsaved cm changes to textarea
                area_copy.classList.remove('hidden') // creates issue otherwise when opening files.
                Array.from(area_copy.children).forEach(child => {
                    // unhide all children 
                    ui_utils.show(child)
                })
                let code_textarea = area_copy.querySelector('.code.section')
                code_textarea.innerHTML = area.cm.getValue() // set textarea's text
                code_textarea.style = "" //remove display none set by cm
                let cm_el = area_copy.querySelector('.CodeMirror')
                code_textarea.setAttribute('custom_style', cm_el.style.cssText) //copy any changed styling from Area styling
                cm_el.remove() //remove codemirror element
                content += area_copy.outerHTML + "\n\n"
            }else{
                content += area_copy.outerHTML + "\n\n"
            }
        } 
    }
    if(document.querySelector('xmeta[name="default-width"]')){
        content += document.querySelector('xmeta[name="default-width"]').outerHTML
    }
    if(document.querySelector('xmeta[name="state"]')){
        content += document.querySelector('xmeta[name="state"]').outerHTML
    }
    return content
}

let file_path = exports.file_path
const save_data = exports.save_data = () => {
    // called by main process to do its thing
    return {
        path: file_path,
        data: processed_content()
    }
}

//----------------------------------------------------------------------------------------

const html_export_data = exports.html_export_data =  () => {
    // called by main process to do its thing
    let content = processed_content_for_html_export()
    return {
        path: file_path, // used for where to open save dialog, not used as path to save.
        data: content.html,
        images_folder: content.images_folder
    }
}

function processed_content_for_html_export(){
    let html_node = document.documentElement.cloneNode(true)
    // strip scripts
    Array.from(html_node.querySelectorAll('script')).forEach(script => script.remove())
    // get all styles in document as text
    // from mdn https://developer.mozilla.org/en-US/docs/Web/API/StyleSheetList
    let all_css = [...document.styleSheets]
      .map(styleSheet => {
        try {
          return [...styleSheet.cssRules]
            .map(rule => rule.cssText)
            .join('')
        } catch (e) {
          console.log('Access to stylesheet %s is denied. Ignoring...', styleSheet.href)
        }
      })
      .join('\n')
    // Add a few rules to remove cm selections and cursors.
    let added_rules = `
    .CodeMirror-selected, .CodeMirror-cursor{
        display: none;
    }
    `
    all_css += added_rules
    // now strip all style tags as well.
    Array.from(html_node.querySelectorAll('style')).forEach(style => style.remove())
    Array.from(html_node.querySelectorAll('link')).forEach(link => {if (link.getAttribute('rel') == 'stylesheet') link.remove()})
    // add back all css extracted earlier as one giant in-page style tag
    let style = document.createElement('style')
    style.innerHTML = all_css
    html_node.querySelector('head').appendChild(style)
    Array.from(html_node.querySelectorAll('div')).forEach(div => {
        // remove any contenteditable attrs otherwise html page will be editable! lol
        div.removeAttribute('contenteditable')
        // remove sticky result also else it shows up anywhere on the page.
        div.classList.remove('sticky')
        // Don't display area info
        div.removeAttribute('info')
        // might as well remove marked area marks
        div.removeAttribute('mark')
    })
    // remove page padding and console (log element) as well.
    html_node.querySelector('#page-padding').remove()
    html_node.querySelector('#log').remove()

    // set title to just filename
    let title = html_node.querySelector('title').innerHTML
    let frags = title.split('/')
    html_node.querySelector('title').innerHTML = frags[frags.length - 1]

    // convert data:uri images to images, else page takes too long to load.
    const ImageDataURI = require('image-data-uri')
    let data_imgs = Array.from(html_node.querySelectorAll('img')).filter(img => img.src.match(/^data:image\/png;base64/))

    let images_folder_path = false
    if(data_imgs.length > 0){
        const {fs, path, os} = gutils.require_many('fs', 'path', 'os')
        const images_folder = utils.random_uniq_str()
        images_folder_path = path.join(os.homedir(), ".glide", "tmp", images_folder)
        if (!fs.existsSync(images_folder_path)){
            fs.mkdirSync(images_folder_path, { recursive: true });
        }

        data_imgs.forEach(img => {
            let image_file = utils.random_uniq_str() + '.png'
            let image_file_path = path.join(images_folder_path, image_file)
            ImageDataURI.outputFile(img.src, image_file_path)
            img.src = path.join(images_folder, image_file) 
        })
    }


    return {
        // doctype isnt included, but since i know what it is i can just add it.
        html: "<!DOCTYPE HTML>\n" + html_node.outerHTML,
        images_folder: images_folder_path
    }

}

//----------------------------------------------------------------------------------------

const {ipcRenderer } = require('electron')

ipcRenderer.on('wrote_file', (e, path) => {
    logger.log("Saved file", path)
    file_path = path
    document.title = file_path
})

ipcRenderer.on('exported_file', (e, path) => {
    logger.log("Exported file", path)
})

const on_file_opened = exports.on_file_opened = (e, path, data)  => {

    history.pause()
    
    document.querySelector('#content').innerHTML = data

    // if the default width was changed for the document, handle that.
    if(document.querySelector('xmeta[name="default-width"]')){
        let default_width = document.querySelector('xmeta[name="default-width"]').getAttribute("content")
        if(default_width !== "0"){
            document.querySelector(':root').style.setProperty("--default-area-width", default_width)
        }
    }

    let areas = Array.from(document.querySelectorAll('.program'))
    for (let area of areas) {

        // activate code mirror
        program_area.init_glide_cm(area)

    }

    if(path){ // path may not exist if on_file_opened is used just for reloading existing content.
        file_path = path
        document.title = file_path
    }

    program_area.update_mgroup_info_from_document_state()

    history.resume()
    
}

ipcRenderer.on('file_opened', on_file_opened)

