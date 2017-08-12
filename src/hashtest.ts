
"use strict";

function hash1a(s: string): string {
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    s = s || '';
    var h = 5381,
        i = s.length;

    while(i) {
        h = (h * 33) ^ s.charCodeAt(--i);
    }

    /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
    * integers. Since we want the results to be always positive, convert the
    * signed int to an unsigned by doing an unsigned bitshift. */
    return (h >>> 0).toString(36);
}


function hash1b(s: string): string {
    s = s || '';
    var h = 5381,
        i = s.length;

    while(i) {
        h = (h * 33) ^ s.charCodeAt(--i);
    }

    return h.toString(36);
}


/*
http://erlycoder.com/49/javascript-hash-functions-to-convert-string-into-integer-hash-
http://www.cse.yorku.ca/~oz/hash.html

sdbm

This algorithm was created for sdbm (a public-domain reimplementation of ndbm)
database library. It was found to do well in scrambling bits, causing better
distribution of the keys and fewer splits. it also happens to be a good general
hashing function with good distribution.

The actual function is hash(i) = hash(i - 1) * 65599 + str[i]; what is included
below is the faster version used in gawk. [there is even a faster, duff-device
version] the magic constant 65599 was picked out of thin air while experimenting
with different constants, and turns out to be a prime. This is one of the
algorithms used in berkeley db (see sleepycat ) and elsewhere.

*/
function hash2a(s: string): string {
    var h = 0, i = 0;
    s = s || '';
    for (; i < s.length; i++) {
        h = s.charCodeAt(i) + (h << 6) + (h << 16) - h;
    }
    return h.toString(36);
}

function hash2b(s: string): string {
    s = s || '';
    var h = 5381, i = s.length;
    while (i) {
        h = s.charCodeAt(--i) + (h << 6) + (h << 16) - h;
    }
    return h.toString(36);
}

function hash2c(s: string): string {
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

function hash3a(s: string): string {
    if (s.length == 0) {
        return '';
    }
    var h = 0,
        chr, i;
    for (i = 0; i < s.length; i++) {
        chr = s.charCodeAt(i);
        h = (h << 5) - h + chr;
        h = h & h; //Convert to 32bit integer
    }
    return h.toString(36);
}

function hash3b(s: string): string {
    if (s.length == 0) {
        return '';
    }
    var h = 0, i = s.length;
    while (i) {
        h = (h << 5) - h + s.charCodeAt(--i);
        h = h & h; //Convert to 32bit integer
    }
    return h.toString(36);
}


function hash3c(s: string): string {
    if (s.length == 0) {
        return '';
    }
    var h = 0, i = s.length;
    while (i) {
        h = (h << 5) - h + s.charCodeAt(--i);
    }
    return h.toString(36);
}

function hashFnv32a(s: string): string {
    var h = 0x811c9dc5;

    // Strips unicode bits, only the lower 8 bits of the values are used
    for (var i = 0; i < s.length; i++) {
        h = h ^ (s.charCodeAt(i) & 0xFF);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }

    return (h >>> 0).toString(36);
}


function hashFnv32b(s: string): string {
    var h = 0x811c9dc5, i = s.length;

    while (i) {
        h = h ^ s.charCodeAt(--i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }

    return h.toString(36);
}

var numInputs = 1000000
let inputs: string[] = [] 
const inputSize = 100

for (var i = 0; i < numInputs; i++) {
    var input: string = ''
    while (input.length < inputSize) {
        input += ' ' + i + ' ' + Math.random().toString(36)
    }
    inputs[i] = input.slice(0, inputSize)
}

function ident(s: string): string {
    return s
}

let hashFuncs = [
    ident,
    hash1a,
    hash1b,
    hash2a,
    hash2b,
    hash2c,
    hash3a,
    hash3b,
    hash3c,
    hashFnv32a,
    hashFnv32b,
]

for (var index = 0; index < hashFuncs.length; index++) {
    var hashFn: any = hashFuncs[index];
    var input: string
    let outputs: {[s: string]: boolean} = {}
    for (var i = 0; i < numInputs; i++) {
        input = inputs[i];
        outputs[hashFn(input)] = true
    }
    var t0 = +new Date()
    for (var i = 0; i < numInputs; i++) {
        hashFn(inputs[i]);
    }
    var usPerHash = 1000 * (+new Date() - t0) / inputs.length;
    console.log(
        hashFn.name,
        '\truntime', usPerHash, '\tus/hash',
        '\tcollisions', inputs.length - Object.keys(outputs).length
    )
}

