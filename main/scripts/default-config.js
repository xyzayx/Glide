module.exports = {
    themes: {
        'Default Dark': { // shouldnt change this name.

            "bg": "#2d2d2d",
            "text": "#ddd",
            "highlight": "#555",
            "lines": "#444",
            "link": "#ffaf34",
            "secondary-text": "#408776",
            "secondary-highlight": "#c9bc9f",

            "default-area-width": "800px",
            "font-family": "'Roboto', sans",
            "font-size": "16px",
            "small-font-size": "12px",

            //-------------------------------------
            "mark-group-color": "black",
            /* Navy blue */
            "mark-group-color1": "hsl(219deg 100% 72%)",
            /* Forest green */
            "mark-group-color2": "hsl(94deg 39% 56%)",
            /* Burgundy */
            "mark-group-color3": "hsl(338, 60%, 55%)",
            /* Midnight blue */
            "mark-group-color4": "hsl(147deg 35% 41%)",
            /* Eggplant purple */
            "mark-group-color5": "hsl(300, 25%, 50%)",
            /* Coral */
            "mark-group-color6": "hsl(16, 100%, 76%)",
            /* Teal */
            "mark-group-color7": "hsl(180deg 37% 58%)",
            /* Maroon */
            "mark-group-color8": "hsl(0, 100%, 50%)",
            /* Salmon */
            "mark-group-color9": "hsl(6, 93%, 81%)",

            //-------------------------------------

            "code-bg": "#2d2d2d",
            "code-text": "#aaa",
            "code-string": "#988a6a",
            "code-number": "#a82828",
            "code-comment": "#586E75",
            "code-keyword": "#666",
            "code-name": "goldenrod",
            "code-caret": "dodgerblue",
            "code-selection": "#094352",

            "code-font-family": "'Roboto Mono', monospace",
            "code-font-size": "14px",
            "code-indent": "22px",

            "logger-bg": "#000",
            "logger-text": "#ddd",

            //-------------------------------------

            "results-width": "300px",

            //-------------------------------------
            // UNDOCUMENTED ONES (maybe even unused without knowing)
            "secondary-selection": "#3a3a3a",
            // only useful for scrollbars 
            "code-bg-trans": "#22222266",
            // really only lisp earmuff var used anywhere
            "code-global-var": "#7ab2e8",
            "code-line-height": "",
            // "line-height": "110%", // not used anymore

        },
        'Default Light': {

            "bg": '#fffbf5',
            "text": '#111',
            "highlight": '#ddd',
            "lines": '#ddd',
            "link": '-webkit-link', // auto
            "secondary-text": '#5986c9',
            "secondary-highlight": '#555',

            "default-area-width": "800px",
            "font-family": "'Roboto', sans",
            "font-size": "16px",
            "small-font-size": "12px",

            //-------------------------------------
            "mark-group-color": "black",
            /* Navy blue */
            "mark-group-color1": "hsl(219deg 100% 72%)",
            /* Forest green */
            "mark-group-color2": "hsl(94deg 39% 56%)",
            /* Burgundy */
            "mark-group-color3": "hsl(338, 60%, 55%)",
            /* Midnight blue */
            "mark-group-color4": "hsl(147deg 35% 41%)",
            /* Eggplant purple */
            "mark-group-color5": "hsl(300, 25%, 50%)",
            /* Coral */
            "mark-group-color6": "hsl(16, 100%, 76%)",
            /* Teal */
            "mark-group-color7": "hsl(180deg 37% 58%)",
            /* Maroon */
            "mark-group-color8": "hsl(0, 100%, 50%)",
            /* Salmon */
            "mark-group-color9": "hsl(6, 93%, 81%)",
            //-------------------------------------

            "code-bg": '#fffbf5',
            "code-text": '#111',
            "code-string": '#715d30',
            "code-number": '#a82828',
            "code-comment": '#81a5b1',
            "code-keyword": '#666',
            "code-name": "#518e00",
            "code-caret": "dodgerblue",
            "code-selection": '#ddd',

            "code-font-family": "'Roboto Mono', monospace",
            "code-font-size": "14px",
            "code-indent": "22px",
            
            "logger-bg": "#efebe5",
            "logger-text": "#333",

            //-------------------------------------

            "results-width": "400px",

            //-------------------------------------
            // Undocumented
            // really only lisp earmuff var used anywhere
            "code-global-var": '#3b6d9e',

            "code-line-height": "1.35em",
            // only useful for scrollbars 
            "code-bg-trans": '#22222266',
            "line-height": "110%",
            "secondary-selection": '#ccc',

        },
        'Dark small font': {
            "font-size": "12px",
            "code-font-size": "12px"
        },
        'Light small font': {
            "font-size": "12px",
            "code-font-size": "12px"
        },
    },

    // --------------------------------------------------

    settings: {
        "theme": "system",
        // "theme": "Default Light",
        // "system-dark-theme": "Default Dark",
        // "system-light-theme": "Default Light",
        "system-dark-theme": "Dark small font",
        "system-light-theme": "Light small font",
        "collapse_height": "150px", // No longer used since removed collapse height.
        "default-generic-column-count": "1", // Undocumented.
    },
    // --------------------------------------------------
    shortcuts: [

        // Not public (just left undocumented)
        {
            "shortcut": "Shift+CommandOrControl+Alt+0",
            "function": "open_dev_tools"
        },

        //-----------------------------------------------------------------------

        {
            "shortcut": "Shift+CommandOrControl+G",
            "function": "generic-area.insert"
        }, {
            "shortcut": "CommandOrControl+Alt+G",
            "function": "program-area.insert_scratch"
        }, {
            "shortcut": "Shift+CommandOrControl+J",
            "function": "js-area.insert"
        }, {
            "shortcut": "Alt+CommandOrControl+J",
            "function": "js-area.insert_async"
        }, {
            "shortcut": "Alt+CommandOrControl+Shift+J",
            "function": "js-area.insert_glide_file_loader"
        }, {
            "shortcut": "Command+2",
            "function": "js-area.toggle_async"
        },

        //-----------------------------------------------------------------------

        {
            "shortcut": "Alt+CommandOrControl+I",
            "function": "area.toggle_info"
        }, 

        {
            "shortcut": "Shift+CommandOrControl+:",
            "function": "js-area.clear_console"
        }, 

        {
            "shortcut": "Alt+CommandOrControl+X",
            "function": "area.cut"
        }, {
            "shortcut": "Alt+CommandOrControl+C",
            "function": "area.copy"
        }, {
            "shortcut": "Alt+CommandOrControl+V",
            "function": "area.paste"
        }, {
            "shortcut": "Alt+CommandOrControl+Backspace",
            "function": "area.remove"
        }, {
            "shortcut": "Shift+CommandOrControl+C",
            "function": "area.duplicate"
        }, 

        {
            "shortcut": "Alt+CommandOrControl+6",
            "function": "area.split"
        }, {
            "shortcut": "Alt+CommandOrControl+5",
            "function": "area.merge_above"
        }, {
            "shortcut": "Alt+CommandOrControl+7",
            "function": "area.merge_below"
        }, 

        {
            "shortcut": "Ctrl+Alt+Left",
            "function": "ui-utils.decrease_editor_width"
        }, {
            "shortcut": "Ctrl+Alt+Right",
            "function": "ui-utils.increase_editor_width"
        }, 
        // {
        //     "shortcut": "Ctrl+Alt+Up",
        //     "function": "ui-utils.increase_inspector_height"
        // }, {
        //     "shortcut": "Ctrl+Alt+Down",
        //     "function": "ui-utils.decrease_inspector_height"
        // },


        {
            "shortcut": "Shift+CommandOrControl+Alt+Up",
            "function": "area.display_only_code_sections"
        }, {
            "shortcut": "Alt+CommandOrControl+Up",
            "function": "area.display_only_generic_areas"
        }, {
            "shortcut": "Alt+CommandOrControl+Down",
            "function": "area.display_all_areas"
        }, 

        // disabling since its not a very useful command.
        // {
        //     "shortcut": "Shift+CommandOrControl+Alt+a",
        //     "function": "area.toggle_auto_collapse_mode"
        // }, 

        {
            "shortcut": "CommandOrControl+.",
            "function": "area.goto_next_area"
        }, {
            "shortcut": "CommandOrControl+;",
            "function": "area.goto_previous_area"
        }, {
            "shortcut": "Shift+CommandOrControl+Esc",
            "function": "area.goto_last_area"
        }, {
            "shortcut": "CommandOrControl+Esc",
            "function": "area.goto_first_area"
        }, 

        //-----------------------------------------------------------------------

        {
            "shortcut": "CommandOrControl+Alt+.",
            "function": "area-styling.increase_column_count"
        }, {
            "shortcut": "CommandOrControl+Alt+,",
            "function": "area-styling.decrease_column_count"
        }, {
            "shortcut": "Shift+CommandOrControl+.",
            "function": "area-styling.increase_default_width"
        }, {
            "shortcut": "Shift+CommandOrControl+,",
            "function": "area-styling.decrease_default_width"
        }, {
            "shortcut": "CommandOrControl+Alt+Right",
            "function": "area-styling.increase_width"
        }, {
            "shortcut": "CommandOrControl+Alt+Left",
            "function": "area-styling.decrease_width"
        }, 
        // full_width and default_width have no shortcuts. may add, but may not.
        {
            "shortcut": "CommandOrControl+Alt+0",
            "function": "area-styling.default_font_size"
        }, {
            "shortcut": "CommandOrControl+Alt+=",
            "function": "area-styling.increase_font_size"
        }, {
            "shortcut": "CommandOrControl+Alt+-",
            "function": "area-styling.decrease_font_size"
        }, {
            "shortcut": "Shift+CommandOrControl+Alt+c",
            "function": "area-styling.use_code_font"
        }, {
            "shortcut": "Shift+CommandOrControl+Alt+t",
            "function": "area-styling.use_text_font"
        }, {
            "shortcut": "Shift+CommandOrControl+Alt+a",
            "function": "area-styling.align_left"
        }, {
            "shortcut": "Shift+CommandOrControl+Alt+s",
            "function": "area-styling.align_center"
        }, {
            "shortcut": "Shift+CommandOrControl+Alt+d",
            "function": "area-styling.align_right"
        }, {
            "shortcut": "Shift+CommandOrControl+Alt+j",
            "function": "area-styling.justify"
        }, {
            "shortcut": "Shift+CommandOrControl+Alt+,",
            "function": "area-styling.default_style"
        }, {
            "shortcut": "Shift+CommandOrControl+Alt+.",
            "function": "area-styling.custom_style"
        }, 

        //-----------------------------------------------------------------------

        {
            "shortcut": "CommandOrControl+Shift+L",
            "function": "generic-area.create_link"
        }, {
            "shortcut": "CommandOrControl+Alt+Shift+L",
            "function": "generic-area.open_link"
        }, {
            "shortcut": "CommandOrControl+Shift+N",
            "function": "generic-area.create_name"
        }, 

        //-----------------------------------------------------------------------

        {
            "shortcut": "CommandOrControl+G",
            "function": "program-area.toggle_gutters"
        }, {
            "shortcut": "CommandOrControl+,",
            "function": "program-area.toggle_wrap"
        }, 

        {
            "shortcut": "CommandOrControl+'",
            "function": "program-area.toggle_mark"
        },

        // {
        //     "shortcut": "mod+Alt+j",
        //     "function": "program-area.goto_currently_evaluating_area",
        // }, 
        //-----------------------------------------------------------------------
        {
            "shortcut": "Shift+CommandOrControl+]",
            "function": "program-area.add_mgroup"
        },
        {
            "shortcut": "Shift+CommandOrControl+[",
            "function": "program-area.remove_mgroup"
        },
        {
            "shortcut": "Shift+CommandOrControl+'",
            "function": "program-area.cycle_mgroup"
        },

        //-----------------------------------------------------------------------

        {
            "shortcut": "CommandOrControl+E",
            "function": "js-area.eval_area"
        }, {
            "shortcut": "CommandOrControl+Shift+E",
            "function": "js-area.eval_marked_areas"
        }, {
            "shortcut": "Alt+CommandOrControl+Shift+E",
            "function": "js-area.eval_all_areas"
        }, 

        //-----------------------------------------------------------------------

        {
            "shortcut": "Alt+CommandOrControl+L",
            "function": "log.cycle_view",
        }, 

        //-----------------------------------------------------------------------

        {
            "shortcut": "CommandOrControl+Z",
            "function": "history.undo",
        }, {
            "shortcut": ["Shift+CommandOrControl+Z", "CommandOrControl+Y"],
            "function": "history.redo",
        }, 

        ]
    }