/**
 * http://paulbourke.net/geometry/pointlineplane/
 */
define(["require", "exports", "svgjs"], function (require, exports, svgjs) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var procsvg;
    (function (procsvg) {
        procsvg.PI = Math.PI;
        procsvg.TAU = Math.PI * 2;
        procsvg.RAD_PER_DEGREE = procsvg.TAU / 360;
        let PREC_FACTOR = null;
        /**
         * Set precision of coordinates in Point and Vector
         *
         * The main reason to lower precision is to limit the
         * size of the svg files with long paths.
         */
        function setRoundingPrecision(precision) {
            PREC_FACTOR = Math.pow(10, precision);
        }
        procsvg.setRoundingPrecision = setRoundingPrecision;
        setRoundingPrecision(6);
        function round(num) {
            return Math.round(num * PREC_FACTOR) / PREC_FACTOR;
        }
        class Coords {
            constructor(x, y, z) {
                if (this.constructor !== Point && this.constructor !== Vector) {
                    throw "Illegal instantiation of baseclass 'Coords', use 'Vector' or 'Point'";
                }
                var coords;
                if (arguments.length == 2 || arguments.length == 3) {
                    coords = Array.prototype.slice.call(arguments);
                }
                else if (arguments.length == 1 && Array.isArray(arguments[0])) {
                    coords = arguments[0];
                }
                if (Array.isArray(coords)) {
                    if (coords.length == 2) {
                        this.x = coords[0];
                        this.y = coords[1];
                        this.z = 0;
                        return;
                    }
                    if (coords.length == 3) {
                        this.x = coords[0];
                        this.y = coords[1];
                        this.z = coords[2] || 0;
                        return;
                    }
                    throw "Coords can only have 2 or 3 dimensions";
                }
                throw "Coords can only be constructed with ";
            }
            inverse() {
                let t = this;
                return vector(-t.x, -t.y, -t.z);
            }
            toString() {
                let t = this;
                return t.constructor.name + "(x: " + t.x + ", y: " + t.y + ", z: " + t.z + ")";
            }
        }
        procsvg.Coords = Coords;
        class Vector extends Coords {
            constructor(x, y, z) {
                super(x, y, z);
            }
            scale(f) {
                let t = this;
                return vector(t.x * f, t.y * f, t.z * f);
            }
            add(v) {
                let t = this;
                return vector(t.x + v.x, t.y + v.y, t.z + v.z);
            }
            sub(v) {
                return this.add(v.inverse());
            }
            mul(v) {
                let t = this;
                return vector(t.x * v.x, t.y * v.y, t.z * v.z);
            }
            /**
             * Divide by another vector (whatever that means)
             *     (x: x₁/x₂, y: y₁/y₂, z: z₁/z₂)
             */
            div(v) {
                let t = this;
                let x = v.x == 0 ? 0 : t.x / v.x;
                let y = v.y == 0 ? 0 : t.y / v.y;
                let z = v.z == 0 ? 0 : t.z / v.z;
                return vector(x, y, z);
            }
            /**
             * Dot Froduct: v₁.x*v₂.x + v₁.y*v₂.y + v₁.z*v₂.z
             */
            dot(v) {
                let t = this;
                return t.x * v.x + t.y * v.y + t.z * v.z;
            }
            /**
             * Magnitude: sqrt(v.x²+v.y²+v.z²)
             */
            mag() {
                let t = this;
                return Math.sqrt(t.x * t.x + t.y * t.y + t.z * t.z);
            }
            /**
             * See Vector.mag
             */
            len() {
                this.len = this.mag;
                return this.len();
            }
            // https://stackoverflow.com/questions/14607640/rotating-a-vector-in-3d-space
            rotateOnZ(rad) {
                let sin_r = Math.sin(-rad);
                let cos_r = Math.cos(-rad);
                return vector(this.x * cos_r - this.y * sin_r, this.x * sin_r + this.y * cos_r, this.z);
            }
            rotateOnY(rad) {
                let sin_r = Math.sin(-rad);
                let cos_r = Math.cos(-rad);
                return vector(this.x * cos_r + this.z * sin_r, this.y, -this.x * sin_r + this.z * cos_r);
            }
            rotateOnX(rad) {
                let sin_r = Math.sin(-rad);
                let cos_r = Math.cos(-rad);
                return vector(this.x, this.y * cos_r - this.z * sin_r, this.y * sin_r + this.z * cos_r);
            }
            rotateDeg(degrees) {
                return this.rotateOnZ(degrees * procsvg.RAD_PER_DEGREE);
            }
            rotate(rad) {
                // TODO: can't we make this an alias somehow?
                return this.rotateOnZ(rad);
            }
        }
        procsvg.Vector = Vector;
        function vector(x, y, z) {
            return new Vector(x, y, z);
        }
        procsvg.vector = vector;
        class Point extends Coords {
            constructor(x, y, z) {
                super(x, y, z);
                all_points.push(this);
            }
            add(v) {
                let t = this;
                return point(t.x + v.x, t.y + v.y, t.z + v.z);
            }
            sub(vXp) {
                let t = this;
                if (vXp instanceof Point) {
                    return vector(t.x - vXp.x, t.y - vXp.y, t.z - vXp.z);
                }
                if (vXp instanceof Vector) {
                    return this.add(vXp.inverse());
                }
            }
            line(vXp) {
                if (vXp instanceof Point) {
                    return line(this, vXp);
                }
                if (vXp instanceof Vector) {
                    return line(this, this.add(vXp));
                }
            }
            // slope(p: Point): Vector {
            //     return
            // }
            eq(p) {
                let t = this;
                return (t.x === p.x && t.y === p.y && t.z === p.z);
            }
        }
        procsvg.Point = Point;
        function point(x, y, z) {
            return new Point(x, y, z);
        }
        procsvg.point = point;
        class Line {
            constructor(p1, p2) {
                this.p1 = p1;
                this.p2 = p2;
            }
            vector() {
                return vector(this.p2.x - this.p1.x, this.p2.y - this.p1.y, this.p2.z - this.p1.z);
            }
            point(eps) {
                if (typeof eps == 'undefined') {
                    eps = 1e-20;
                }
                let v = this.vector();
                if (Math.abs(v.x) > eps || Math.abs(v.z) > eps || Math.abs(v.z) > eps) {
                    return;
                }
                return this.p1;
            }
            intersection(l, eps) {
                if (typeof eps == 'undefined') {
                    eps = 1e-20;
                }
                let p1 = this.p1;
                let p2 = this.p2;
                let p3 = l.p1;
                let p4 = l.p2;
                let v43 = vector(p4.x - p3.x, p4.y - p3.y, p4.z - p3.z);
                if (Math.abs(v43.x) < eps && Math.abs(v43.y) < eps && Math.abs(v43.z) < eps) {
                    return;
                }
                let v21 = vector(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
                if (Math.abs(v21.x) < eps && Math.abs(v21.y) < eps && Math.abs(v21.z) < eps) {
                    return;
                }
                let v13 = vector(p1.x - p3.x, p1.y - p3.y, p1.z - p3.z);
                let d4321 = v43.x * v21.x + v43.y * v21.y + v43.z * v21.z;
                let d4343 = v43.x * v43.x + v43.y * v43.y + v43.z * v43.z;
                let d2121 = v21.x * v21.x + v21.y * v21.y + v21.z * v21.z;
                let denom = d2121 * d4343 - d4321 * d4321;
                if (Math.abs(denom) < eps) {
                    return;
                }
                let d1343 = v13.x * v43.x + v13.y * v43.y + v13.z * v43.z;
                let d1321 = v13.x * v21.x + v13.y * v21.y + v13.z * v21.z;
                let numer = d1343 * d4321 - d1321 * d4343;
                let mua = numer / denom;
                let mub = (d1343 + d4321 * mua) / d4343;
                let pa = point(p1.x + mua * v21.x, p1.y + mua * v21.y, p1.z + mua * v21.z);
                let pb = point(p3.x + mub * v43.x, p3.y + mub * v43.y, p3.z + mub * v43.z);
                return line(pa, pb);
            }
            toString() {
                return this.constructor.name + "(" +
                    "p1: " + this.p1.toString() + ", " +
                    "p2: " + this.p2.toString() +
                    ")";
            }
        }
        procsvg.Line = Line;
        function line(p1, p2) {
            return new Line(p1, p2);
        }
        procsvg.line = line;
        class Path {
            constructor(points) {
                if (!(this instanceof Path)) {
                    throw "Illegal invocation. Use 'new Path(...)' or 'path(...)'";
                }
            }
            toString() {
                let t = this;
                return this.constructor.name + "(" + this.points.join(", ") + ")";
            }
        }
        procsvg.Path = Path;
        let all_points = [];
        let draw = null;
        let PPU_X = 1;
        let PPU_Y = 1;
        function setScale(pixelsPerUnit, pixelsPerUnitY) {
            PPU_X = pixelsPerUnit;
            PPU_Y = pixelsPerUnitY || pixelsPerUnit;
        }
        procsvg.setScale = setScale;
        function reset() {
            let container = document.getElementById('viewer-container');
            var pixWidth;
            var pixHeight;
            if (arguments.length < 2) {
                pixWidth = container.clientWidth;
                pixHeight = container.clientHeight;
            }
            if (arguments.length == 1) {
                let requestedAspectRatio = arguments[0];
                let containerAspectRatio = pixWidth / pixHeight;
                if (requestedAspectRatio > containerAspectRatio) {
                    pixHeight = Math.floor(pixWidth / requestedAspectRatio);
                }
                else {
                    pixWidth = Math.floor(pixHeight * requestedAspectRatio);
                }
            }
            if (arguments.length == 2) {
                pixWidth = arguments[0];
                pixHeight = arguments[1];
            }
            all_points.length = 0;
            if (draw == null) {
                draw = svgjs('viewer-container');
            }
            else {
                draw.clear();
            }
            draw.size(container.clientWidth, container.clientHeight);
            // svg-pan-zoom will fit so the whole image is in the
            // view container. We need to draw an invisible rect
            // so that it respects our width and height.
            draw.rect(pixWidth, pixHeight).attr({
                'fill-opacity': 0,
                'stroke-width': 0,
            });
            return {
                pixW: pixWidth, pixelWidth: pixWidth,
                pixH: pixHeight, pixelHeight: pixHeight,
                draw: draw,
            };
        }
        procsvg.reset = reset;
        function debugRenderPoints(size) {
            let colors = [
                "#000",
                "#F00",
                "#FFF",
                "#0F0",
                "#00F",
                "#0FF",
                "#F0F",
                "#FF0",
            ];
            size = size || 1;
            for (let i = 0; i < all_points.length; i++) {
                size *= 0.999;
                let o = size / 2;
                let p = all_points[i];
                let x = p.x - o;
                let y = p.y - o;
                move(circle(size), x, y).attr({
                    'fill': colors[i % colors.length],
                    'stroke': colors[(i + 1) % colors.length],
                    'stroke-width': size / 2,
                });
            }
        }
        procsvg.debugRenderPoints = debugRenderPoints;
        function circle(size) {
            return ellipse(size, size);
        }
        procsvg.circle = circle;
        function ellipse(width, height) {
            return draw.ellipse(round(width * PPU_X), round(height * PPU_Y));
        }
        procsvg.ellipse = ellipse;
        function poly(points) {
            let arrPoints = [];
            for (var i = 0; i < points.length; i++) {
                var p = points[i];
                arrPoints.push(round(p.x * PPU_X));
                arrPoints.push(round(p.y * PPU_Y));
            }
            return draw.polygon(arrPoints);
        }
        procsvg.poly = poly;
        function rect(width, height) {
            return draw.rect(round(width * PPU_X), round(height * PPU_Y));
        }
        procsvg.rect = rect;
        function move(shape, p_or_x, y) {
            let p;
            let x;
            if (p_or_x instanceof Point) {
                p = p_or_x;
                x = p.x;
                y = p.y;
            }
            else if (typeof p_or_x === 'number') {
                x = p_or_x;
            }
            return shape.move(round(x * PPU_X), round(y * PPU_Y));
        }
        procsvg.move = move;
        procsvg.ORIGIN = point(0, 0, 0);
    })(procsvg || (procsvg = {}));
    exports.default = procsvg;
});
//# sourceMappingURL=procsvg.js.map