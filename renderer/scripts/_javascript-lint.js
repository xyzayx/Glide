// NOTE: this is a copy of the javascript-lint.js file in the codemirror node module.
// This modded version sends text to the jshint validator wrapped with an implicit async function
// when the option add_async_fn is provided with the cm_config.lint options.
// This is done to suppress the error that is generated while using await keyword in async areas.
// It seems like a lot of trouble for a small thing. But the whole point of the async area is to be able to use await.
// And I find I use that area a lot. specially while programming over the network. While let's face it, is bound to be a lot.
// This error not showing is just a cherry on top of the main features that allow me to now have variable declarations
// and function declarations within the async area to show up in the global scope along with no return statements being required.
// Since the js environment would never allow this, I figured a lexical solution. A very complicated form of macroing if you would.
// Anyway look elsewhere for all that. But this code is to ensure the smooth feeling of using an async area.

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

// Depends on jshint.js from https://github.com/jshint/jshint

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../node_modules/codemirror/lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../node_modules/codemirror/lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  // declare global: JSHINT

  function validator(text, options) {
    if (!window.JSHINT) {
      if (window.console) {
        window.console.error("Error: window.JSHINT not defined, CodeMirror JavaScript linting cannot run.");
      }
      return [];
    }
    if (!options.indent) // JSHint error.character actually is a column index, this fixes underlining on lines using tabs for indentation
      options.indent = 1; // JSHint default value is 4
    if (options.add_async_fn){
      text = 
      "async function a_very_unlikelylyly_function_name(){\n"+text+"\n}"
    }
    let real_options = structuredClone(options)
    delete real_options.add_async_fn // so jshint doesnt complain about unknown props.
    JSHINT(text, real_options, real_options.globals);
    var errors = JSHINT.data().errors, result = [];
    if (errors) {
      if (options.add_async_fn){
        parseErrors(errors, result, true);
      }else{
        parseErrors(errors, result, false);
      }
    }
    return result;
  }

  CodeMirror.registerHelper("lint", "javascript", validator);

  function parseErrors(errors, output, subtract_line = false) {
    for ( var i = 0; i < errors.length; i++) {
      var error = errors[i];
      if (error) {
        if (error.line <= 0) {
          if (window.console) {
            window.console.warn("Cannot display JSHint error (invalid line " + error.line + ")", error);
          }
          continue;
        }

        var start = error.character - 1, end = start + 1;
        if (error.evidence) {
          var index = error.evidence.substring(start).search(/.\b/);
          if (index > -1) {
            end += index;
          }
        }

        if(subtract_line) error.line = error.line - 1 // since async_fn was added above
        // Convert to format expected by validation service
        var hint = {
          message: error.reason,
          severity: error.code ? (error.code.startsWith('W') ? "warning" : "error") : "error",
          from: CodeMirror.Pos(error.line - 1, start),
          to: CodeMirror.Pos(error.line - 1, end)
        };

        output.push(hint);
      }
    }
  }
});
