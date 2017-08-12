/**
 * http://paulbourke.net/geometry/pointlineplane/
 */
import * as svgjs from "svgjs";
declare module procsvg {
    const PI: number;
    const TAU: number;
    const RAD_PER_DEGREE: number;
    /**
     * Set precision of coordinates in Point and Vector
     *
     * The main reason to lower precision is to limit the
     * size of the svg files with long paths.
     */
    function setRoundingPrecision(precision: number): void;
    class Coords {
        x: number;
        y: number;
        z: number;
        constructor(x: number, y: number, z?: number);
        inverse(): Vector;
        toString(): string;
    }
    class Vector extends Coords {
        constructor(x: number, y: number, z?: number);
        scale(f: number): Vector;
        add(v: Vector): Vector;
        sub(v: Vector): Vector;
        mul(v: Vector): Vector;
        /**
         * Divide by another vector (whatever that means)
         *     (x: x₁/x₂, y: y₁/y₂, z: z₁/z₂)
         */
        div(v: Vector): Vector;
        /**
         * Dot Froduct: v₁.x*v₂.x + v₁.y*v₂.y + v₁.z*v₂.z
         */
        dot(v: Vector): number;
        /**
         * Magnitude: sqrt(v.x²+v.y²+v.z²)
         */
        mag(): number;
        /**
         * See Vector.mag
         */
        len(): number;
        rotateOnZ(rad: number): Vector;
        rotateOnY(rad: number): Vector;
        rotateOnX(rad: number): Vector;
        rotateDeg(degrees: number): Vector;
        rotate(rad: number): Vector;
    }
    function vector(x: number, y: number, z?: number): Vector;
    class Point extends Coords {
        constructor(x: number, y: number, z?: number);
        add(v: Vector): Point;
        sub(p: Point): Vector;
        sub(v: Vector): Point;
        line(p: Point): Line;
        line(v: Vector): Line;
        eq(p: Point): boolean;
    }
    function point(x: number, y: number, z?: number): Point;
    class Line {
        p1: Point;
        p2: Point;
        constructor(p1: Point, p2: Point);
        vector(): Vector;
        point(eps?: number): Point;
        intersection(l: Line, eps?: number): Line;
        toString(): string;
    }
    function line(p1: Point, p2: Point): Line;
    class Path {
        points: Point[];
        constructor(points: Point);
        toString(): string;
    }
    function setScale(pixelsPerUnit: number, pixelsPerUnitY?: number): void;
    interface ImageContext {
        pixW: number;
        pixelWidth: number;
        pixH: number;
        pixelHeight: number;
        draw: svgjs.Doc;
    }
    function reset(aspectRatio?: number): ImageContext;
    function reset(pixWidth: number, pixHeight: number): ImageContext;
    function debugRenderPoints(size?: number): void;
    function circle(size: number): svgjs.Ellipse;
    function ellipse(width: number, height: number): svgjs.Ellipse;
    function poly(points: Point[]): svgjs.Polygon;
    function rect(width: number, height: number): svgjs.Rect;
    function move(shape: svgjs.Element, p: Point): svgjs.Element;
    function move(shape: svgjs.Element, x: number, y: number): svgjs.Element;
    const ORIGIN: Point;
}
export default procsvg;
