
let Area = require('./area.js')

function mod_width(e, by) {
    let action = elt => {
        elt.style.width = (elt.clientWidth + by) + 'px'
        update_custom_style_attr(elt)
    }
    with_non_program_area__or__program_area_children(e, action)
    with_program_area(e, action)
}

const increase_width = exports.increase_width = (e)  => {
    e.preventDefault()
    mod_width(e, 50)
}

const decrease_width = exports.decrease_width = (e)  => {
    e.preventDefault()
    mod_width(e, -50)
}

const full_width = exports.full_width = (e)  => {
    e.preventDefault()
    let action = elt => {
        elt.style.width = "100%"
        update_custom_style_attr(elt)
    }
    with_non_program_area__or__program_area_children(e, action)
    with_program_area(e, action)
}

const default_width = exports.default_width = (e)  => {
    e.preventDefault()
    let action = elt => {
        elt.style.removeProperty('width')
        update_custom_style_attr(elt)
    }
    with_non_program_area__or__program_area_children(e, action)
    with_program_area(e, action)
}

//----------------------------------------------------------------------------------------------------------------------


function mod_default_width(e, by){
    let root_el = document.querySelector(':root')
    let existing_width = getComputedStyle(root_el).getPropertyValue("--default-area-width")
    let new_width = (parseInt(existing_width) + by) + 'px'
    root_el.style.setProperty("--default-area-width", new_width)
    // set the meta tag in the document, this is needed so when a saved document is opened,
    // i have a way to know what was the default width set.
    document.querySelector('xmeta[name="default-width"]').setAttribute("content", new_width)

    // stash original width for reset later.
    let original_default_width = getComputedStyle(root_el).getPropertyValue("--original-default-width")
    if (!original_default_width){
        // was never set. so set it just once.
        root_el.style.setProperty("--original-default-width", existing_width)
    }
}

const increase_default_width = exports.increase_default_width = (e)  => {
    // e.preventDefault()
    mod_default_width(e, 50)
}

const decrease_default_width = exports.decrease_default_width = (e)  => {
    // e.preventDefault()
    mod_default_width(e, -50)
}

const reset_default_width = exports.reset_default_width = (e) => {
    // e.preventDefault()
    let root_el = document.querySelector(':root')
    let original_default_width = getComputedStyle(root_el).getPropertyValue("--original-default-width")
    if(original_default_width){
        root_el.style.setProperty("--default-area-width", original_default_width)
        document.querySelector('meta[name="default-width"]').setAttribute("content", original_default_width)
    }
}

//----------------------------------------------------------------------------------------------------------------------

const use_code_font = exports.use_code_font = (e) => {
    e.preventDefault()
    with_non_program_area__or__program_area_children(e, elt => {
        elt.style.fontFamily = "var(--code-font-family)"
        update_custom_style_attr(elt)
    })
}

const use_text_font = exports.use_text_font = (e) => {
    e.preventDefault()
    with_non_program_area__or__program_area_children(e, elt => {
        elt.style.fontFamily = "var(--font-family)"
        update_custom_style_attr(elt)
    })
}

//----------------------------------------------------------------------------------------------------------------------

function mod_font_size(e, by) {
    with_non_program_area__or__program_area_children(e, elt => {
        elt.style.fontSize = (parseInt(getComputedStyle(elt).fontSize) + by) + 'px'
        update_custom_style_attr(elt)
    })
}

const increase_font_size = exports.increase_font_size = (e)  => {
    e.preventDefault()
    mod_font_size(e, 1)
}

const decrease_font_size = exports.decrease_font_size = (e)  => {
    e.preventDefault()
    mod_font_size(e, -1)
}

const default_font_size = exports.default_font_size = (e)  => {
    e.preventDefault()
    with_non_program_area__or__program_area_children(e, elt => {
        elt.style.removeProperty('font-size')
        update_custom_style_attr(elt)
    })
}
//----------------------------------------------------------------------------------------------------------------------

const align_left = exports.align_left = (e) => {
    e.preventDefault()
    with_non_program_area__or__program_area_children(e, elt => {
        elt.style.textAlign = "left"
        update_custom_style_attr(elt)
    })
}

const align_center = exports.align_center = (e) => {
    e.preventDefault()
    with_non_program_area__or__program_area_children(e, elt => {
        elt.style.textAlign = "center"
        update_custom_style_attr(elt)
    })
}

const align_right = exports.align_right = (e) => {
    e.preventDefault()
    with_non_program_area__or__program_area_children(e, elt => {
        elt.style.textAlign = "right"
        update_custom_style_attr(elt)
    })
}

const justify = exports.justify = (e) => {
    e.preventDefault()
    with_non_program_area__or__program_area_children(e, elt => {
        elt.style.textAlign = "justify"
        update_custom_style_attr(elt)
    })
}
//----------------------------------------------------------------------------------------------------------------------

const default_style = exports.default_style = (e)  => {
    e.preventDefault()
    let action = elt => elt.style = ""
    with_non_program_area__or__program_area_children(e, action)
    with_program_area(e, action)
}

const custom_style = exports.custom_style = (e)  => {
    e.preventDefault()
    let action = elt => elt.style = elt.getAttribute('custom_style')
    with_non_program_area__or__program_area_children(e, action)
    with_program_area(e, action)
}

//----------------------------------------------------------------------------------------------------------------------

function mod_column_count(e, by) {
    let area = Area.ancestral_area(e.target)
    let elt = area
    if (area.classList.contains('program')) {
        elt = area.querySelector('.result')
    }

    let count = elt.style.columnCount || 1
    let new_count = parseInt(count) + by
    elt.style.columnCount = new_count > 1 ? new_count : 1
    update_custom_style_attr(elt)
}

// used by generic area.
const set_column_count = exports.set_column_count = (area, count) => {
    area.style.columnCount = count
    update_custom_style_attr(area)
}

const increase_column_count = exports.increase_column_count = (e)  => {
    e.preventDefault()
    mod_column_count(e, 1)
}

const decrease_column_count = exports.decrease_column_count = (e)  => {
    e.preventDefault()
    mod_column_count(e, -1)
}

//----------------------------------------------------------------------------------------------------------------------

function update_custom_style_attr(el) {
    el.setAttribute('custom_style', el.getAttribute('style'))
}

function with_non_program_area__or__program_area_children(e, fn) {
    let area = Area.ancestral_area(e.target)
    if (area.classList.contains('program')) {
        for (let child of area.children) {
            if (!child.classList.contains('code')) { // dont mess with code textarea that is hidden anyway.
                fn(child)
            }
        }
        if(area.cm) area.cm.refresh() // needs update if line heights or widths change.
    } else {
        fn(area)
    }
}

function with_program_area(e, fn){
    let area = Area.ancestral_area(e.target)
    if (area.classList.contains('program')) {
        fn(area)
        if(area.cm) area.cm.refresh()
    }
}