define('console', [], function() {
    var LOG_BUFFER_SIZE = 250
    var consoleElem = document.getElementById("console-container")
    var console = window.console || {}

    var indent = ""
    var history = []
    var pending = []

    function addEntry(e) {
        pending.push(e)
        history.push(e)
        if (pending.length > LOG_BUFFER_SIZE * 2) {
            pending = pending.slice(-LOG_BUFFER_SIZE)
            history = history.slice(-LOG_BUFFER_SIZE)
        }
    }

    function stringify(o) {
        if (isPlainObj(o) || Array.isArray(o)) {
            o = JSON.stringify(o)
        }
        if (typeof o == 'number') {
            o = Math.round(o * 10e12) / 10e12
        }
        // Since we use innerText, we don't need
        // to do html escaping
        return o
    }

    var currentLvlId = 1
    var lvlIds = {
        'info'  : 0,
        'warn'  : 1,
        'log'   : 2,
        'error' : 3,
        'assert': 4,
    }
    var lvlNames = [
        'info',
        'warn',
        'log',
        'error',
        'assert',
    ]

    setInterval(function() {
        // If console.log gets spammed, this indirection
        // will somewhat mitigate the issue.
        if (pending.length == 0) {
            return
        }

        pending = pending.slice(-LOG_BUFFER_SIZE)

        for (var i = 0; i < pending.length; i++) {
            var lvlId = pending[i][1]
            if (lvlId < currentLvlId) {
                continue
            }
            var lineContent = pending[i][0]
            if (typeof lineContent === 'string') {
                var lineCount = pending[i][2]
                var lineIndent = pending[i][3]
                var logLine = document.createElement('div')
                logLine.setAttribute('class', 'loglvl-' + lvlNames[lvlId])
                if (lineCount > 1) {
                    logLine.innerText = lineIndent + "<" + lineCount + "> " + lineContent
                } else {
                    logLine.innerText = lineIndent + lineContent
                }
                consoleElem.appendChild(logLine)
            } else {
                var tab = document.createElement('table')
                var tHead = document.createElement('thead')
                var tBody = document.createElement('tbody')
                var head = lineContent['head']
                var rows = lineContent['rows']
                var tr = document.createElement('tr')
                for (var j = 0; j < head.length; j++) {
                    var cell = document.createElement('th')
                    cell.innerText = head[j]
                    tr.appendChild(cell)
                }
                tHead.appendChild(tr)
                tab.appendChild(tHead)
                for (var j = 0; j < rows.length; j++) {
                    var elem = rows[j];
                    var tr = document.createElement('tr')
                    for (var k = 0; k < head.length; k++) {
                        if (k === 0) {
                            var cell = document.createElement('th')
                        } else {
                            var cell = document.createElement('td')
                        }
                        cell.innerText = elem[head[k]]
                        tr.appendChild(cell)
                    }
                    tBody.appendChild(tr)
                }
                tab.appendChild(tBody)
                consoleElem.appendChild(tab)
            }
        }

        pending.length = 0

        // Cleanup stuff that has scrolled out of view
        var cleanNodes = []
        for (var i = consoleElem.children.length - LOG_BUFFER_SIZE; i >= 0; i--) {
            cleanNodes.push(consoleElem.children[i])
        }
        for (var i = 0; i < cleanNodes.length; i++) {
            consoleElem.removeChild(cleanNodes[i])
        }

        consoleElem.scrollTop = consoleElem.scrollHeight - consoleElem.clientHeight;
    }, 100);

    function isPlainObj(o) {
        return typeof o == 'object' && o.constructor == Object;
    }

    function loggerFn(level) {
        var lvlId = lvlIds[level]
        var builtinLogFn = console[level] || function(){}
        return function() {
            builtinLogFn.apply(console, arguments)
            if (level === 'assert') {
                if (!!arguments[0]) {
                    return
                }
                msg = arguments[1]
                arguments = ['Assertion failed: ' + msg].concat(
                    Array.prototype.slice.call(arguments, 2)
                )
            }
            var msgParts = []
            for (var i = 0; i < arguments.length; i++) {
                msgParts.push(stringify(arguments[i]))
            }
            if (msgParts.length > 1 && typeof msgParts[0] === 'string') {
                var msgFmt = msgParts[0]
                var msg = msgFmt.replace(/\%[^a-z]*[a-z]/g, function(m, code) {
                    if (msgParts.length == 1) {
                        return m
                    }
                    var part = msgParts.splice(1, 1)[0]
                    // TODO implement formatting based on codes
                    // https://developer.mozilla.org/en-US/docs/Web/API/console#Using_string_substitutions
                    return part
                })
                msgParts[0] = msg
            }
            var newText = msgParts.join(", ");
            if (pending.length > 0) {
                var prev = pending[pending.length - 1]
                var prevText = prev[0]
                var prevLvlId = prev[1]
                if (prevText == newText && prevLvlId == lvlId) {
                    prev[2] += 1
                    return
                }
            }
            addEntry([newText, lvlId, 1, indent])
        }
    }

    console.info = loggerFn('info')
    console.log = loggerFn('log')
    console.warn = loggerFn('warn')
    console.error = loggerFn('error')
    console.assert = loggerFn('assert')
    var builtinClear = console.clear || function(){}
    console.clear = function() {
        builtinClear.apply(console, arguments)
        pending.length = 0
        history.length = 0
        consoleElem.innerHTML = ''
    }
    console._replay = function(logLvl) {
        logLvl = logLvl || 'log'
        currentLvlId = lvlIds[logLvl]
        consoleElem.innerHTML = ''
        pending = [].concat(history)
    }
    var builtinGroup = console.group || function(){}
    var builtinGroupCollapsed = console.groupCollapsed || function(){}
    var builtinGroupEnd = console.groupEnd || function(){}

    console.group = function(label) {
        builtinGroup.apply(console, arguments)
        addEntry(['+ ' + (label || 'console.group'), 2, 1, indent])
        indent = indent + '| '
    }
    console.groupCollapsed = function(label) {
        builtinGroupCollapsed.apply(console, arguments)
        addEntry(['+ ' + (label || 'console.group'), 2, 1, indent])
        indent = indent + '| '
    }
    console.groupEnd = function() {
        builtinGroupEnd.apply(console, arguments)
        indent = indent.slice(0, -2)
    }

    var startTimes = {}
    var objWithNow = window.performance || Date
    var builtinTime = console.time || function(){}
    var builtinTimeEnd = console.timeEnd || function(){}

    console.time = function(label) {
        builtinTime.apply(console, arguments)
        startTimes[label] = objWithNow.now()
    }
    console.timeEnd = function(label) {
        builtinTimeEnd.apply(console, arguments)
        var startTime = startTimes[label]
        var duration = startTime ? objWithNow.now() - startTime : 0
        duration = Math.floor(duration)
        var msg = (label || 'console.time') + ' ' + duration + ' ms'
        addEntry([msg, 2, 1, indent])
    }

    var builtinTable = console.table || function(){}
    console.table = function(data) {
        builtinTable.apply(console, arguments)
        var head = ['(index)']
        var seenProps = {}
        var rows = []
        if (Array.isArray(data)) {
            for (var i = 0; i < data.length; i++) {
                var row = {'(index)': i}
                var elem = data[i]
                if (Array.isArray(elem)) {
                    for (var j = 0; j < elem.length; j++) {
                        if (!seenProps[j]) {
                            seenProps[j] = true
                            head.push(j)
                        }
                        row[j] = stringify(elem[j])
                    }
                } else {
                    for (var propName in elem) {
                        if (!seenProps[propName]) {
                            seenProps[propName] = true
                            head.push(propName)
                        }
                        row[propName] = stringify(elem[propName])
                    }
                }
                rows.push(row)
            }
        } else {
            // assume it's an object
            head.push('Values')
            for (var propName in data) {
                rows.push({
                    '(index)': propName,
                    'Values': stringify(data[propName])
                })
            }
        }
        var table = {
            'head': head,
            'rows': rows,
        }
        addEntry([table, 2, 1, indent])
    }
    return console;
});