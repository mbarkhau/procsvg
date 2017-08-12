// BASED on https://github.com/niutech/typescript-compile but using 1.5 transpile function

define('transpile', [
    'console', 'vs/language/typescript/lib/typescriptServices'
], function (console, ts) {
    "use strict";
    function sdbm2xHash(s) {
        s = s || ''
        var h1 = 5381,
            h2 = 5381,
            c,
            i = s.length;
        while (i) {
            c = s.charCodeAt(--i)
            if ((i & 1) === 0) {
                h1 = c + (h1 << 6) + (h1 << 16) - h1;
            } else {
                h2 = c + (h2 << 6) + (h2 << 16) - h2;
            }
        }
        return h1.toString(36) + h2.toString(36);
    }
    function initOpts(outputFileName, transpileOptions) {
        var options = transpileOptions.compilerOptions || ts.getDefaultCompilerOptions()
        options.target           = ts.ScriptTarget.ES2015
        options.module           = ts.ModuleKind.AMD
        options.moduleResolution = ts.ModuleResolutionKind.Classic
        options.noImplicitAny    = true
        options.removeComments   = false
        options.alwaysStrict     = true

        options.isolatedModules = true
        // transpileModule does not write anything to disk so there is no need to verify
        // that there are no conflicts between input and output paths.
        options.suppressOutputPathCheck = true
        // Filename can be non-ts file.
        options.allowNonTsExtensions = true
        // We are not returning a sourceFile for lib file when asked by the program,
        // so pass --noLib to avoid reporting a file not found error.
        options.noLib = true
        // Clear out other settings that would not be used in transpiling this module
        options.lib = undefined;
        options.types = undefined;
        options.noEmit = undefined;
        options.noEmitOnError = undefined;
        options.paths = undefined;
        options.rootDirs = undefined;
        options.declaration = undefined;
        options.declarationDir = undefined;
        options.out = undefined;
        options.outFile = undefined;
        // We are not doing a full typecheck, we are not resolving the whole context,
        // so pass --noResolve to avoid reporting missing file errors.
        options.noResolve = true;
        return options
    }

    function transpileModule(input, inputFileName, outputFileName, transpileOptions) {
        var options = initOpts(outputFileName, transpileOptions)

        var diagnostics = []
        var sourceFile = ts.createSourceFile(inputFileName, input, options.target)
        if (transpileOptions.moduleName) {
            sourceFile.moduleName = transpileOptions.moduleName
        }
        if (transpileOptions.renamedDependencies) {
            sourceFile.renamedDependencies = ts.createMapFromTemplate(transpileOptions.renamedDependencies)
        }

        // Output
        var outputText;
        // Create a compilerHost object to allow the compiler to read and write files
        var newLine = ts.getNewLineCharacter(options);
        var compilerHost = {
            getSourceFile: function (fileName) {
                return fileName === ts.normalizePath(inputFileName) ? sourceFile : undefined;
            },
            writeFile: function (name, text) {
                if (name == outputFileName) {
                    console.assert(outputText === undefined, "Unexpected multiple outputs for the file: '" + name + "'");
                    outputText = text;
                } else {
                    console.error("unexpected transpiler output", name)
                }
            },
            getDefaultLibFileName: function () { return "lib.d.ts"; },
            useCaseSensitiveFileNames: function () { return false; },
            getCanonicalFileName: function (fileName) { return fileName; },
            getCurrentDirectory: function () { return ""; },
            getNewLine: function () { return newLine; },
            fileExists: function (fileName) { return fileName === inputFileName; },
            readFile: function () { return ""; },
            directoryExists: function () { return true; },
            getDirectories: function () { return []; }
        };

        var program = ts.createProgram([inputFileName], options, compilerHost);

        ts.addRange(/*to*/ diagnostics, /*from*/ program.getSyntacticDiagnostics(sourceFile));
        ts.addRange(/*to*/ diagnostics, /*from*/ program.getOptionsDiagnostics());

        // Emit
        program.emit(
            /*targetSourceFile*/ undefined,
            /*writeFile*/ undefined,
            /*cancellationToken*/ undefined,
            /*emitDts*/ undefined,
            transpileOptions.transformers
        );


        for (var i = 0; i < diagnostics.length; i++) {
            var diag = diagnostics[i]
            console.warn(inputFileName, {
                messageText : diag.messageText,
                code        : diag.code,
                start       : diag.start,
                line        : input.slice(0, diag.start).split("\n").length,
            })
        }

        console.assert(outputText !== undefined, "Output generation failed");

        return outputText
    }

    function transpile(input, transpileOptions) {
        transpileOptions = transpileOptions | {}
        var t0 = +new Date()

        // if jsx is specified then treat file as .tsx
        var inputFileName = transpileOptions.fileName || "module.ts"
        console.assert(inputFileName.slice(-3) === '.ts', "input to tranpiile must be a '.ts' file")
        var outputHash = sdbm2xHash(JSON.stringify(transpileOptions) + input)
        var outputFileName = inputFileName.slice(0, -3) + ".js"
        
        console.info("transpiling", inputFileName, "->", outputFileName)

        // Check if we have a cached value
        var ls = window.localStorage
        var ss = window.sessionStorage

        var prevResult = ss.getItem('procsvg_transpile_' + outputHash)
        if (!prevResult) {
            var prevOutputHash = ls.getItem('procsvg_transpile_hash' + outputFileName)
            if (prevOutputHash == outputHash) {
                prevResult = ls.getItem('procsvg_transpile_content' + outputFileName)
            }
        }
        if (prevResult) {
            console.info("using cached", outputFileName)
            return JSON.parse(prevResult)
        }
        
        var outputText = transpileModule(input, inputFileName, outputFileName, transpileOptions)

        var res = {
            outputText    : outputText,
            fileName      : outputFileName,
        }
        var resData = JSON.stringify(res)
        ls.setItem('procsvg_transpile_hash' + outputFileName, outputHash)
        ls.setItem('procsvg_transpile_content' + outputFileName, resData)
        ss.setItem('procsvg_transpile_' + outputHash, resData)
        var duration = (+new Date()) - t0
        console.info("transpile of", inputFileName, "->", outputFileName, "comleted in", duration, "ms")
        return res;
    }

    return transpile
});
