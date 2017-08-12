(function () {

// TODO: controls
// TODO: Expanders for editor, viewer and console
// TODO: log levels
// TODO: offline mode
// TODO: overlay

var ls = window.localStorage

// vs/language/typescript/lib/typescriptServices.js
// https://cdn.rawgit.com/Microsoft/TypeScript/f945b26b/lib/typescriptServices.js

require.config({ paths: {
    'vs'                : 'vs',
    'console'           : 'src/console',
    'transpile'         : 'src/transpile',
    'procsvg'           : 'src/procsvg',
    'svg-pan-zoom'      : 'src/svg-pan-zoom',
    'svgjs'             : 'src/svgjs',
}});

function logLoading(path) {
    require([path], function(){console.info('loaded ' + path + '.js')})
}

logLoading('vs/language/typescript/lib/typescriptServices')
logLoading('vs/editor/editor.main')
logLoading('transpile')
logLoading('svg-pan-zoom')
logLoading('svgjs')
logLoading('procsvg')

// unEvaled serves as an indirection
// so that the user can either edit without
// loading the transpiler and svg libs, or
// so that the initial svg render can happen
// before the editor is finished loading.
var ctx = {
    unTranspiled: null,
    prevEvaled: null,
    unEvaled: null,
    viewerInitialized: false,

    // lazy load panzoom, since we don't need it for the actual rendering
    panZoom: null,
    prevZoom: null,
    prevPan: null,
    currentLayout: 'layout-evc',

    updateViewer: function(){},
    transpileAndRun: function(){},
}

function resetPanZoom() {
    if (ctx.panZoom === null) {
        return
    }

    ctx.prevZoom = ctx.panZoom.getZoom()
    ctx.prevPan = ctx.panZoom.getPan()
    ctx.panZoom.destroy()
    ctx.panZoom = null
}

require(['console'], function(console) {
    // TODO: transpile errors can be shown with
    //  ed.revealPositionInCenter({ lineNumber: 50, column: 120 });

    window.addEventListener('error', function(event) {
        var e = event.error

        var errMsg = null
        if (e.stack) {
            errMsg = e.stack
        } else if (e.name && e.message) {
            errMsg = e.name + ": " + e.message
        } else {
            errMsg = "Uncaught " + e
        }
        if (errMsg.indexOf("vs/editor/editor.main.js:11924:31") < 0) {
            console.error(errMsg)
        } else {
            // console.warn("monaco editor issue", errMsg)
        }
    }, false)

    var itemActions = {
        'item-commands': 'editor.action.quickCommand',
        'item-save'    : 'procsvg.saveAndUpdate',
        'item-download': 'procsvg.download',
        'item-editor'  : 'procsvg.focusEditor',
        'item-console' : 'procsvg.focusConsole',
        'item-theme'   : 'procsvg.switchTheme',
        'item-viewer'  : 'procsvg.focusViewer',
        'item-about'   : 'procsvg.showAbout',
    }
    var items = document.getElementsByClassName("toolbar-item")
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        item.addEventListener('click', (function(itemId) {
            return function(event) {
                if (procsvgEd) {
                    procsvgEd.trigger(procsvgEd, itemActions[itemId])
                }
                event.preventDefault()
                return false
            }
        })(item.getAttribute('id')));
    }
});

require([
    'console',
    'svg-pan-zoom',
    'svgjs',
    'procsvg',
], function viewerUpdateLoop(console, svgPanZoom) {

    function updatePanZoom() {
        if (!ctx.viewerInitialized) {
            return
        }
        var _panZoom = svgPanZoom("#viewer-container > svg", {
            viewportSelector    : "#viewer-container",
            zoomEnabled         : true,
            controlIconsEnabled : true,
            fit                 : true,
            center              : true,
            contain             : false,
            minZoom             : 0.5,
            maxZoom             : 500,
            zoomScaleSensitivity: .9,
        })
        if (ctx.prevZoom) {
            _panZoom.zoom(ctx.prevZoom)
        }
        if (ctx.prevPan) {
            _panZoom.pan(ctx.prevPan)
        }
        ctx.panZoom = _panZoom
    }

    var updateViewerTimer = 0
    ctx.updateViewer = function() {
        clearTimeout(updateViewerTimer)
        updateViewerTimer = setTimeout(ctx.updateViewer, 1000)
        if (ctx.unEvaled == null) {
            return
        }
        var compiled = ctx.unEvaled
        ctx.prevEvaled = ctx.unEvaled
        ctx.unEvaled = null

        var moduleName = "editor_module_" + (+new Date())
        compiled = compiled.replace(/^define\(\[/, 'define("' + moduleName + '", [')

        resetPanZoom()
        var scriptNode = document.createElement('script')
        scriptNode.type = 'text/javascript';
        scriptNode.appendChild(document.createTextNode(compiled))
        document.body.appendChild(scriptNode)
        // eval does the define(...) for the new module
        // eval(compiled)
        require([moduleName], function() {
            console.info("editor script run")
            ctx.viewerInitialized = true
        })
        updatePanZoom()
        console.info('viewer updated')
    }
    ctx.updateViewer()
    console.info('initialized  viewer')
    return null
});

// Transpilation is similarly separated, so
// the editor can load earlier
require(['transpile'], function initTranspileLoop(transpile) {
    var transpileTimer = 0
    ctx.transpileAndRun = function() {
        clearTimeout(transpileTimer)
        transpileTimer = setTimeout(ctx.transpileAndRun, 1000)
        if (ctx.unTranspiled == null) {
            return
        }
        var input = ctx.unTranspiled
        ctx.unTranspiled = null

        var output = transpile(input, {
            "filename": "editor_script.ts",
        })

        var transpiled = output.outputText
        ctx.unEvaled = transpiled
        ls.setItem("procsvg_last_edited", input)
        ls.setItem('procsvg_last_transpiled', transpiled)

        ctx.updateViewer()
    }
    ctx.transpileAndRun()
});

require([
    'text!src/svgjs.d.ts',
    'text!src/procsvg.d.ts',
    'console',
    'vs/editor/editor.main',
], function initEditorConfig(svgjs_d_ts, procsvg_d_ts, console) {
    var ts = monaco.languages.typescript
    var tsd = ts.typescriptDefaults
    tsd.setCompilerOptions({
        target:               ts.ScriptTarget.ES2015,
        allowNonTsExtensions: true,
        module:               ts.ModuleKind.AMD,
        moduleResolution:     ts.ModuleResolutionKind.Classic,
        noEmit:               true,
        noImplicitAny:        true,
        alwaysStrict:         true,
    })
    tsd.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
    })
    tsd.addExtraLib(svgjs_d_ts, 'svgjs.d.ts')
    tsd.addExtraLib(procsvg_d_ts, 'procsvg.d.ts')

    monaco.editor.defineTheme('vs-extradark', {
        base: 'vs-dark',
        inherit: true,
        rules: [{
            foreground: 'FFFFFF',
            background: '000000',
        }],
        colors: {
            'foreground': '#FFFFFF',
            'background': '#000000',
            'editor.foreground': '#FFFFFF',
            'editor.background': '#000000',
        }
    })
    console.info("initialized  typescript defs")
});


// load either last script or default
ctx.lastEditedScript = ls.getItem("procsvg_last_edited")
ctx.lastCompiledScript = ls.getItem("procsvg_last_transpiled")

if (false && ctx.lastCompiledScript) {
    ctx.unEvaled = ctx.lastCompiledScript
    define('initialScript', [], function() {return ctx.lastEditedScript})
} else {
    define(
        'initialScript',
        ['text!src/v4v.ts', 'text!src/v4v.js'],
        function(v4v_ts, v4v_js) {
            ctx.unTranspiled = v4v_ts
            // ctx.unEvaled = v4v_js
            return v4v_ts
        }
    )
}

setTimeout(function(){
    // Only display spinner if loading is taking a bit
    var spinner = document.getElementsByClassName('lds-dual-ring')[0]
    if (spinner) {spinner.style.display = 'block'}
}, 1000)

require([
    'initialScript',
    'vs/editor/editor.main',
], function initEditor(initialScript) {
    var editorNode = document.getElementById('editor-container')
    // remove spinner
    editorNode.removeChild(editorNode.firstElementChild)
    var themeIndex = 0
    var editorThemes = ['vs', 'vs-extradark']
    var bodyThemes = ['light-theme', 'dark-theme']

    var editor = monaco.editor.create(editorNode, {
        model:            monaco.editor.createModel(
            initialScript,
            'typescript',
            new monaco.Uri("file:///main.ts"),
        ),
        readOnly:         false,
        // rulers:           [80, 100],
        minimap:          {enabled: false},
        roundedSelection: false,
        theme:            editorThemes[themeIndex],
    })
    window.procsvgEd = editor
    var KEY_ESC = 27

    function updateLayout() {
        cl = document.body.classList
        ctx.currentLayout
        cl.remove(ctx.currentLayout)
    }
    function layoutViewer() {
        editor.layout()
        ctx.unEvaled = ctx.prevEvaled
        resetPanZoom()
        ctx.prevZoom = null
        ctx.prevPan = null
        ctx.updateViewer()
    }
    window.addEventListener('resize', layoutViewer)
    window.addEventListener('keydown', function(e) {
        if (editor.isFocused()) {
            return
        }
        if (e.keyCode == KEY_ESC) {
            var cl = document.body.classList
            if (cl.contains('layout-evc') || cl.contains('layout-e')) {
                return
            }
            cl.remove('layout-v')
            cl.remove('layout-c')
            cl.add('layout-evc')

            layoutViewer()
        }
    })

    function saveAndUpdate() {
        ctx.unTranspiled = editor.getValue()
        ls.setItem("procsvg_last_edited", ctx.unTranspiled)
        ls.setItem("procsvg_editor_state", JSON.stringify(editor.saveViewState()))
        console.log("saved to localStorage")
        ctx.transpileAndRun()
        return null
    }

    function switchTheme() {
        document.body.classList.toggle(bodyThemes[themeIndex])
        themeIndex = (themeIndex + 1) % 2
        document.body.classList.toggle(bodyThemes[themeIndex])
        monaco.editor.setTheme(editorThemes[themeIndex])
        return null
    }

    function focusViewer() {
        var cl = document.body.classList
        if (cl.contains('layout-evc')) {
            cl.remove('layout-evc')
            cl.add('layout-v')
        } else if (cl.contains('layout-v')) {
            cl.remove('layout-v')
            cl.add('layout-evc')
        } else {
            cl.remove('layout-e')
            cl.remove('layout-c')
            cl.add('layout-v')
        }

        layoutViewer()
        return null
    }

    function focusConsole() {
        var cl = document.body.classList
        if (cl.contains('layout-evc')) {
            cl.remove('layout-evc')
            cl.add('layout-c')
        } else if (cl.contains('layout-c')) {
            cl.remove('layout-c')
            cl.add('layout-evc')
        } else {
            cl.remove('layout-v')
            cl.remove('layout-e')
            cl.add('layout-c')
        }

        return null
    }

    function focusEditor() {
        var cl = document.body.classList
        if (cl.contains('layout-evc')) {
            cl.remove('layout-evc')
            cl.add('layout-e')
        } else if (cl.contains('layout-e')) {
            cl.remove('layout-e')
            cl.add('layout-evc')
        } else {
            cl.remove('layout-v')
            cl.remove('layout-c')
            cl.add('layout-e')
        }

        editor.layout()
        return null
    }

    editor.addAction({
        id: 'procsvg.saveAndUpdate',
        label: 'Save and Update',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
        contextMenuGroupId: 'navigation',

        run: saveAndUpdate
    })

    editor.addAction({
        id: 'procsvg.downloadSVG',
        label: 'Download SVG',
        contextMenuGroupId: 'navigation',

        run: function downloadSVG() {
            console.log("Download not Implemented Yet")
            return null
        }
    })

    editor.addAction({
        id: 'procsvg.focusEditor',
        label: '(Un-)Maximize Editor',
        keybindings: [monaco.KeyMod.chord(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K,
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_E,
        )],
        contextMenuGroupId: 'navigation',

        run: focusEditor
    })

    editor.addAction({
        id: 'procsvg.focusConsole',
        label: '(Un-)Maximize Console',
        keybindings: [monaco.KeyMod.chord(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K,
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_C,
        )],
        contextMenuGroupId: 'navigation',

        run: focusConsole
    })

    editor.addAction({
        id: 'procsvg.focusViewer',
        label: '(Un-)Maximize Viewer',
        keybindings: [monaco.KeyMod.chord(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K,
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_V,
        )],
        contextMenuGroupId: 'navigation',
        run: focusViewer
    })

    editor.addAction({
        id: 'procsvg.switchTheme',
        label: 'Switch Day/Night Theme',
        keybindings: [monaco.KeyMod.chord(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K,
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_L,
        )],
        contextMenuGroupId: 'navigation',
        run: switchTheme
    })

    panZoom = null;

    var viewState = ls.getItem("procsvg_editor_state")

    if (viewState) {
        editor.restoreViewState(JSON.parse(viewState))
    }

    editor.focus()
    console.info("initialized  editor")
});

})()