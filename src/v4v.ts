import V from "procsvg"


// ProcSVG - Procedurally generate SVG Images
// ProcSVG uses SVG.js: http://svgjs.com/getting-started/


const debug = 1
console.clear()

const sideLen = 110

let {pixW, pixH, draw} = V.reset(1 / 1)
// let {pixW, pixH, draw} = V.reset()

V.setScale(pixW / sideLen, pixH / sideLen)
if (debug) {
    V.rect(sideLen, sideLen).attr({'fill': '#F09'})
}

const center = V.point(sideLen / 2, sideLen / 2)

// Think of base as pointing to 12 o'clock
const base = V.vector(0, -100)

const tri1Tside = base.rotate(3 / 12 * V.TAU)
const tri1Lside = base.rotate(5 / 12 * V.TAU)
const tri1Rside = base.rotate(7 / 12 * V.TAU)

const p11 = V.point(
    (sideLen - tri1Tside.x) / 2,
    (sideLen - tri1Lside.y) / 2,
)
const p12 = p11.add(tri1Tside)
const p13 = p11.add(tri1Lside)

const insetBorder = V.vector(0, -3.5)

const p21 = p11.add(insetBorder.rotate(4 / 12 * V.TAU))
const p22 = p12.add(insetBorder.rotate(8 / 12 * V.TAU))
const p23 = p13.add(insetBorder.rotate(0 / 12 * V.TAU))

const inset2to3  = V.vector(0, -21)

const p31 = p21.add(inset2to3.rotate(4 / 12 * V.TAU))
const p32 = p22.add(inset2to3.rotate(8 / 12 * V.TAU))
const p33 = p23.add(inset2to3.rotate(0 / 12 * V.TAU))

const p3c = V.point(center.x, p31.y)

const p41 = p31.add(insetBorder.rotate(4 / 12 * V.TAU))
const p42 = p32.add(insetBorder.rotate(8 / 12 * V.TAU))
const p43 = p33.add(insetBorder.rotate(0 / 12 * V.TAU))

const cutLine4 = V.line(p41, p42)

setTimeout(function() {
    V.move(V.circle(10), p41).attr({'fill': "#F00"})
    V.move(V.circle(10), p42).attr({'fill': "#0F0"})
    V.move(V.circle(10), p31).attr({'fill': "#00F"})
}, 2)

const vTop = p3c.sub(p31).scale(1 / 2)
const vp11 = p3c.add(vTop)
const vp12 = p3c.sub(vTop)
const vp21e = p11.add(insetBorder.rotate(5 / 12 * V.TAU))
const vp21 = vp21e.line(vp11).intersection(cutLine4).point()
// const vp22e = p12.add(insetBorder.rotate(7 / 12 * V.TAU))
// const vp22 = vp22e.line(vp12).intersection(cutLine4).point()

console.table([
    p11,
    p12,
    p41,
    p42,
    vp21,
    // vp22,
])

const poly1 = V.poly([p11, p12, p13]).attr({'fill': "#000"})
poly1.maskWith(
    draw.mask()
    .add(V.rect(sideLen, sideLen).attr({'fill': "#FFF"}))
    .add(V.poly([p21, p22, p23]).attr({'fill': "#000"}))
)

const poly2 = V.poly([p21, p22, p23]).attr({'fill': "#FF0"})
poly2.maskWith(
    draw.mask()
    .add(V.rect(sideLen, sideLen).attr({'fill': "#FFF"}))
    .add(V.poly([p31, p32, p33]).attr({'fill': "#000"}))
)

const poly3 = V.poly([p31, p32, p33]).attr({'fill': "#000"})
poly3.maskWith(
    draw.mask()
    .add(V.rect(sideLen, sideLen).attr({'fill': "#FFF"}))
    .add(V.poly([p41, p42, p43]).attr({'fill': "#000"}))
)

// V.poly([p21, p22, p32, p31]).attr({'fill': "#ff0"})
// V.poly([p22, p23, p33, p32]).attr({'fill': "#ff0"})
// V.poly([p23, p21, p31, p33]).attr({'fill': "#ff0"})
// V.poly([p31, p32, p42, p41]).attr({'fill': "#000"})
// V.poly([p32, p33, p43, p42]).attr({'fill': "#000"})
// V.poly([p33, p31, p41, p43]).attr({'fill': "#000"})

if (debug) {
    V.debugRenderPoints(1/3)
}










