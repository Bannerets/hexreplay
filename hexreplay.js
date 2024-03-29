// (function () {

"use strict";

// ----------------------------------------------------------------------
// Compatibility

var compatibility = function() {
    if ("classList" in SVGElement.prototype === false) {
	// Internet Explorer lacks classList on SVG elements.
	Object.defineProperty(SVGElement.prototype, "classList", {
	    get: function() {
		var self = this;
		var classList = new Object();
		classList.add = function(cls) {
		    var classes = self.getAttribute("class") || "";
		    var list = classes.split(" ");
		    var index = list.indexOf(cls);
		    if (index === -1) {
			list.unshift(cls);
		    }
		    classes = list.join(" ");
		    self.setAttribute("class", classes);
		}
		classList.remove = function(cls) {
		    var classes = self.getAttribute("class") || "";
		    var list = classes.split(" ");
		    var index = list.indexOf(cls);
		    if (index !== -1) {
			list.splice(index, 1);
		    }
		    classes = list.join(" ");
		    self.setAttribute("class", classes);
		}
		classList.contains = function(cls) {
		    var classes = self.getAttribute("class") || "";
		    var list = classes.split(" ");
		    var index = list.indexOf(cls);
		    return index !== -1;
		}
		classList.toggle = function(cls) {
		    if (this.contains(cls)) {
			this.remove(cls);
		    } else {
			this.add(cls);
		    }
		}
		return classList;
	    }
	});
    }

    if ("forEach" in NodeList.prototype === false) {
	// Internet Explorer lacks forEach on NodeList.
	NodeList.prototype.forEach = function(fn) {
	    Array.prototype.forEach.call(this, fn);
	}
    }

    if ("matches" in Element.prototype === false) {
	Element.prototype.matches = Element.prototype.msMatchesSelector;
    }
    
    if ("closest" in Element.prototype === false) {
	Element.prototype.closest = function (selector) {
	    var el = this;
	    while (el.matches && !el.matches(selector)) {
		el = el.parentNode;
	    }
	    return el.matches ? el : null;
	};
    }

    if ("scrollTo" in Element.prototype === false) {
	Element.prototype.scrollTo = function (options) {
	    this.scrollTop = options.top;
	    this.scrollLeft = options.left;
	}
    }
}


compatibility();

// ----------------------------------------------------------------------
// General-purpose

function dateString() {
    function pad(s, n) {
        s = s.toString();
        while (s.length < n) {
            s = "0" + s;
        }
        return s;
    }

    var date = new Date();
    var year = pad(date.getFullYear(), 4);
    var month = pad(date.getMonth()+1, 2);
    var day = pad(date.getDate(), 2);
    return year + month + day;
}

function download(blob, filename) {
    if (window.navigator.msSaveOrOpenBlob) { // IE10+                       
        window.navigator.msSaveOrOpenBlob(blob, filename);
    } else { // Others                                                      
        var a = document.createElement("a");
        var url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        a.type = blob.type;
        a.classList.add("hide");
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

// Vertically scroll the contents of the container so that target is
// visible within the container. If smooth=true, animate the scolling
// action.
function makeVisible(target, container, smooth) {
    var trect = target.getBoundingClientRect();
    var crect = container.getBoundingClientRect();
    var oldtop = container.scrollTop;
    var oldleft = container.scrollLeft;
    var ty = trect.y || trect.top;
    var cy = crect.y || crect.top;
    var rely = ty - cy + oldtop;
    var scrollTopMax = rely;
    var scrollTopMin = rely + trect.height - crect.height;

    if (oldtop < scrollTopMin) {
	container.scrollTo({
	    left: oldleft,
	    top: scrollTopMin,
	    behavior: smooth ? "smooth" : "instant"
	});
    } else if (oldtop > scrollTopMax) {
	container.scrollTo({
	    left: oldleft,
	    top: scrollTopMax,
	    behavior: smooth ? "smooth" : "instant"
	});
    }
}

// ----------------------------------------------------------------------
// Constants

function Const() {
}

Const.black = "black";
Const.white = "white";
Const.empty = "empty";

Const.cell = "cell";
Const.pass = "pass";
Const.swap_pieces = "swap-pieces";
Const.swap_sides = "swap-sides";
Const.resign = "resign";
Const.forfeit = "forfeit";

Const.longDiagonal = "longDiagonal";
Const.shortDiagonal = "shortDiagonal";
Const.horizontal = "horizontal";
Const.vertical = "vertical";

// ----------------------------------------------------------------------
// Cell

// A cell on the hex board. File and rank are 0-based, i.e., the cell
// a2 is represented as {file: 0, rank: 1}. When ordered, file is
// always mentioned before rank.
function Cell(file, rank) {
    this.file = file;
    this.rank = rank;
}

// Check equality of cells.
Cell.prototype.equals = function(c) {
    return (this.file === c.file && this.rank === c.rank);
}

Cell.prototype.swap = function() {
    return new Cell(this.rank, this.file);
}

// Auxiliary function. Convert an integer to a file symbol: a..z,
// aa..zz, aaa..zzz and so on. This way we can (in principle) support
// board sizes greater than 26.
Cell.fileToString = function(x) {
    if (x < 0) {
        return "-" + Cell.fileToString(-1-x);
    } else if (x < 26) {
        return String.fromCharCode(97 + x);
    } else {
        var rest = Cell.fileToString(Math.floor(x/26 - 1));
        var last = String.fromCharCode(97 + (x % 26));
        return rest + last;
    }
}

// Auxiliary function. Convert an integer to a rank symbol.
Cell.rankToString = function(x) {
    return (x+1).toString();
}

// Auxiliary function. Convert a pair of integers to a cell name.
Cell.cellname = function(file, rank) {
    return Cell.fileToString(file) + Cell.rankToString(rank);
}

// Get the name of a cell (e.g., "a1").
Cell.prototype.toString = function () {
    return Cell.cellname(this.file, this.rank);
}

// Convert a file symbol to an integer.
Cell.stringToFile = function(s) {
    if (s.length === 0) {
        throw "Cell.stringToFile: " + s;
    }
    if (s[0] === "-") {
        return -Cell.stringToFile(s.substring(1))-1;
    }
    var acc = -1;
    for (var i=0; i<s.length; i++) {
        var c = s.charCodeAt(i) - 97;
        if (c < 0 || c > 25) {
            throw "Cell.stringToFile: " + s;
        }
        acc += 1;
        acc *= 26;
        acc += c;
    }
    return acc;
}

// Convert a rank symbol to an integer.
Cell.stringToRank = function(s) {
    return parseInt(s) - 1;
}

// Convert a cell name (such as "a1") to a cell.
Cell.fromString = function (s) {
    var regexp = /^([a-z]+)([0-9]+)$/;
    var match = s.match(regexp);
    if (!match) {
        return null;
    }
    var file = Cell.stringToFile(match[1]);
    var rank = Cell.stringToRank(match[2]);
    return new Cell(file, rank);
}

// ----------------------------------------------------------------------
// Dimension

function Dimension(files, ranks) {
    if (ranks === undefined) {
        ranks = files;
    }
    this.files = files;
    this.ranks = ranks;
}

// Formatting for HTML form, hash.
Dimension.prototype.format = function () {
    if (this.files == this.ranks) {
        return this.files.toString();
    } else {
        return this.files + "x" + this.ranks;
    }
}

// Parsing for HTML form, hash.
Dimension.parse = function (s) {
    // Parse an integer with optional whitespace (and return undefined
    // if it's anything else).
    function fromInt(s) {
        s = s.trim();
        for (var i=0; i<s.length; i++) {
            var c = s.charCodeAt(i);
            if (c < "0".charCodeAt(0) || c > "9".charCodeAt(0)) {
                return undefined;
            }
        }
        var n = parseInt(s);
        if (isNaN(n)) {
            return undefined;
        }
        return n;
    }            

    var files, ranks;
    var x = s.indexOf("x");
    if (x == -1) {
        x = s.indexOf("X");
    }
    if (x == -1) {
        files = fromInt(s);
        ranks = files;
    } else {
        files = fromInt(s.slice(0, x));
        ranks = fromInt(s.slice(x+1));
    }
    if (typeof files === "undefined" || typeof ranks === "undefined") {
        return undefined;
    }
    return new Dimension(files, ranks);
}

// Formatting for SGF.
Dimension.prototype.toSGF = function() {
    if (this.files == this.ranks) {
        return this.files.toString();
    } else {
        return this.files + ":" + this.ranks;
    }
}

Dimension.prototype.swap = function() {
    return new Dimension(this.ranks, this.files);
}

Dimension.prototype.equals = function(dim) {
    return dim.files === this.files && dim.ranks === this.ranks;
}

// ----------------------------------------------------------------------
// Board

// This holds a DOM element to display a board.

function Board(dim, rotation, mirrored) {
    var self = this;

    if (rotation === undefined) {
	rotation = 9;
    }
    if (mirrored === undefined) {
	mirrored = false;
    }
    
    this.dim = dim;
    this.rotation = this.mod12(rotation);
    this.mirrored = mirrored;

    // Internal parameters.
    this.unit = 80;
    this.borderradius = 1.2;
    this.excentricity_acute = 0.5;
    this.excentricity_obtuse = 0.5;

    // Create the board's DOM element.
    this.dom = document.createElement("div");
    this.dom.classList.add("board");

    // Keep track up previous values of dom.offsetWidth and
    // dom.offsetHeight to avoid unnecessary updates.
    this.offsetWidth = undefined;
    this.offsetHeight = undefined;
    
    // A user-supplied function to call when a cell is clicked.
    this.onclick = function (cell) {};
    
    // Update the board's appearance.
    this.draw_svg();
    this.update();

    window.addEventListener("resize", function () {self.rescale()});

    this.dom.addEventListener("mousedown", function(event) {
        var cell = event.target.closest(".cell");
        if (cell) {
            self.onclick(Cell.fromString(cell.id));
        }
    });
}

Board.prototype.mod12 = function(x) {
    x = x % 12;
    if (x < 0) {
	x += 12;
    }
    return x;
}

// Use this when the SVG does not yet exist in the DOM tree, or when
// the contents should be cleared. If the SVG already exists and the
// content should be preserved, use update().
Board.prototype.draw_svg = function() {
    // Delete old contents.
    this.dom.innerText = "";
    
    // Create new svg element.
    this.svg = this.svg_of_board();

    this.offsetWidth = undefined;
    this.offsetHeight = undefined;

    this.dom.appendChild(this.svg);
}

// Update the rotation / mirroring of the board, preserving the
// existing contents and DOM structure. This also computes the
// viewBox.
Board.prototype.update = function () {
    // Update all rotations (and unrotations);
    var theta;
    var scale;
    if (this.mirrored) {
        theta = 180 * (this.rotation - 2) / 6;
        scale = "scale(-1,1)";
    } else {
        theta = 180 * (this.rotation + 2) / 6;
        scale = "";
    }
    var rotation = "rotate(" + theta + ")";
    var unrotation = "rotate(" + (-theta) + ")";
    var transform = rotation + " " + scale;
    var untransform = scale + " " + unrotation;
    
    var rotatable = this.svg.querySelectorAll(".rotatable");
    rotatable.forEach(function(e) {
	e.setAttribute("transform", transform);
    });
    var unrotatable = this.svg.querySelectorAll(".unrotatable");
    unrotatable.forEach(function(e) {
	e.setAttribute("transform", untransform);
    });

    // Update the viewBox.
    // Coordinate system.
    var rad = Math.PI * (this.rotation + 2) / 6;
    var ax = this.unit * Math.cos(rad);
    var ay = this.unit * Math.sin(rad);
    var bx = this.unit * Math.cos(rad + Math.PI/3);
    var by = this.unit * Math.sin(rad + Math.PI/3);

    // Compute the centers of the four corner hexes.
    var p0 = {x: 0, y: 0};
    var p1 = {x: (this.dim.files-1)*ax, y: (this.dim.files-1)*ay}
    var p2 = {x: (this.dim.ranks-1)*bx, y: (this.dim.ranks-1)*by}
    var p3 = {x: p1.x + p2.x, y: p1.y + p2.y}

    // ViewBox
    var margin = 1.5 * this.unit;
    var x0 = Math.min(p0.x, p1.x, p2.x, p3.x) - margin;
    var y0 = Math.min(p0.y, p1.y, p2.y, p3.y) - margin;
    var x1 = Math.max(p0.x, p1.x, p2.x, p3.x) + margin;
    var y1 = Math.max(p0.y, p1.y, p2.y, p3.y) + margin;
    var width = x1 - x0;
    var height = y1 - y0;
    this.svg.setAttribute("viewBox", x0 + " " + y0 + " " + width + " " + height);
}

// Rescale SVG to container. This must be called upon initialization
// (*after* the board element is integrated in the DOM tree, so that
// its size is known), and upon any event that may affect the
// element's size. The window's "resize" event is already handled.
Board.prototype.rescale = function() {
    var domOffsetWidth = this.dom.offsetWidth;
    var domOffsetHeight = this.dom.offsetHeight;

    if (this.offsetWidth !== undefined && this.offsetHeight !== undefined && domOffsetWidth === this.offsetWidth && domOffsetHeight === this.offsetHeight) {
        // Performance issues on Chrome: don't rescale unnecessarily.
        return;
    }

    this.offsetWidth = domOffsetWidth;
    this.offsetHeight = domOffsetHeight;
    
    this.svg.setAttribute("width", domOffsetWidth);
    this.svg.setAttribute("height", domOffsetHeight);
}

// Set the logical size of the board. This also clears the board.
Board.prototype.setSize = function(dim) {
    if (dim.equals(this.dim)) {
	this.clear();
	return;
    }
    this.dim = dim;
    this.draw_svg();
    this.update();
}

Board.prototype.svg_of_board = function() {
    var files = this.dim.files;
    var ranks = this.dim.ranks;

    var ax = this.unit;
    var ay = 0
    var bx = this.unit * 0.5;
    var by = this.unit * Math.sqrt(3/4);

    // Hex coordinates:
    //        *     *
    //     *     c     *
    //        0     a
    //     *     d     *
    //        e     * 
    //           b
    //        *     *
    //           *
    function coord(a, b, c, d, e) {
	if (c === undefined) {
	    c = 0;
	}
	if (d === undefined) {
	    d = 0;
	}
	if (e === undefined) {
	    e = 0;
	}
        var a1 = a + (2*c + d - e)/3;
        var b1 = b + (-c + d + 2*e)/3;
        return {
            x: a1*ax + b1*bx,
            y: a1*ay + b1*by
        };
    }
    function xystr(xy) {
        return xy.x.toFixed(0) + " " + xy.y.toFixed(0);
    }
    function coordstr(a, b, c, d, e) {
        return xystr(coord(a, b, c, d, e));
    }

    // Return an SVG path corresponding to hex (file, rank).
    function hexpath(file, rank) {
        var hex = ""
        hex += "M" + coordstr(file, rank, 0, -1, 0);
        hex += "L" + coordstr(file, rank, 0, 0, -1);
        hex += " " + coordstr(file, rank, 1, 0, 0);
        hex += " " + coordstr(file, rank, 0, 1, 0);
        hex += " " + coordstr(file, rank, 0, 0, 1);
        hex += " " + coordstr(file, rank, -1, 0, 0);
        hex += "z";
        return hex;
    }
    
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "500px");
    svg.setAttribute("height", "300px");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    var svgNS = svg.namespaceURI;

    var defs = document.createElementNS(svgNS, "defs");

    var filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "shadow");
    var feGaussianBlur = document.createElementNS(svgNS, "feGaussianBlur");
    feGaussianBlur.setAttribute("in", "SourceAlpha");
    feGaussianBlur.setAttribute("stdDeviation", "3");
    filter.appendChild(feGaussianBlur);
    var feOffset = document.createElementNS(svgNS, "feOffset");
    feOffset.setAttribute("dx", "5");
    feOffset.setAttribute("dy", "5");
    filter.appendChild(feOffset);
    var feComponentTransfer = document.createElementNS(svgNS, "feComponentTransfer");
    var feFuncA = document.createElementNS(svgNS, "feFuncA");
    feFuncA.setAttribute("type", "linear");
    feFuncA.setAttribute("slope", "0.7");
    feComponentTransfer.appendChild(feFuncA);
    filter.appendChild(feComponentTransfer);
    var feMerge = document.createElementNS(svgNS, "feMerge");
    var feMergeNode1 = document.createElementNS(svgNS, "feMergeNode");
    feMerge.appendChild(feMergeNode1);
    var feMergeNode2 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode2.setAttribute("in", "SourceGraphic");
    feMerge.appendChild(feMergeNode2);
    filter.appendChild(feMerge);
    defs.appendChild(filter);    
    
    var filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "shadow2");
    var feGaussianBlur = document.createElementNS(svgNS, "feGaussianBlur");
    feGaussianBlur.setAttribute("in", "SourceAlpha");
    feGaussianBlur.setAttribute("stdDeviation", "3");
    filter.appendChild(feGaussianBlur);
    var feOffset = document.createElementNS(svgNS, "feOffset");
    feOffset.setAttribute("dx", "5");
    feOffset.setAttribute("dy", "5");
    filter.appendChild(feOffset);
    var feComponentTransfer = document.createElementNS(svgNS, "feComponentTransfer");
    var feFuncA = document.createElementNS(svgNS, "feFuncA");
    feFuncA.setAttribute("type", "linear");
    feFuncA.setAttribute("slope", "0.8");
    feComponentTransfer.appendChild(feFuncA);
    filter.appendChild(feComponentTransfer);
    var feMerge = document.createElementNS(svgNS, "feMerge");
    var feMergeNode1 = document.createElementNS(svgNS, "feMergeNode");
    feMerge.appendChild(feMergeNode1);
    var feMergeNode2 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode2.setAttribute("in", "SourceGraphic");
    feMerge.appendChild(feMergeNode2);
    filter.appendChild(feMerge);
    defs.appendChild(filter);    
    
    var grad = document.createElementNS(svgNS, "radialGradient");
    grad.setAttribute("id", "black-gradient");
    grad.setAttribute("cx", "30%");
    grad.setAttribute("cy", "30%");
    grad.setAttribute("r", "0.5");
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "15%");
    stop.setAttribute("stop-color", "#666666");
    grad.appendChild(stop);
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "100%");
    stop.setAttribute("stop-color", "#030303");
    grad.appendChild(stop);
    defs.appendChild(grad);
    svg.appendChild(defs);
    
    var grad = document.createElementNS(svgNS, "radialGradient");
    grad.setAttribute("id", "white-gradient");
    grad.setAttribute("cx", "30%");
    grad.setAttribute("cy", "30%");
    grad.setAttribute("r", "0.5");
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "0%");
    stop.setAttribute("stop-color", "#ffffff");
    grad.appendChild(stop);
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "90%");
    stop.setAttribute("stop-color", "#d7d0c9");
    grad.appendChild(stop);
    defs.appendChild(grad);
    svg.appendChild(defs);
    
    var grad = document.createElementNS(svgNS, "radialGradient");
    grad.setAttribute("id", "red-gradient");
    grad.setAttribute("cx", "30%");
    grad.setAttribute("cy", "30%");
    grad.setAttribute("r", "0.6");
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "0%");
    stop.setAttribute("stop-color", "#ff7878");
    grad.appendChild(stop);
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "30%");
    stop.setAttribute("stop-color", "#e02020");
    grad.appendChild(stop);
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "100%");
    stop.setAttribute("stop-color", "#880000");
    grad.appendChild(stop);
    defs.appendChild(grad);
    svg.appendChild(defs);
    
    var grad = document.createElementNS(svgNS, "radialGradient");
    grad.setAttribute("id", "blue-gradient");
    grad.setAttribute("cx", "30%");
    grad.setAttribute("cy", "30%");
    grad.setAttribute("r", "0.6");
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "0%");
    stop.setAttribute("stop-color", "#7070ff");
    grad.appendChild(stop);
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "30%");
    stop.setAttribute("stop-color", "#3030e0");
    grad.appendChild(stop);
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "100%");
    stop.setAttribute("stop-color", "#000080");
    grad.appendChild(stop);
    defs.appendChild(grad);
    svg.appendChild(defs);

    var g = document.createElementNS(svgNS, "g");
    g.classList.add("rotatable");
    svg.appendChild(g);

    // Cell outline
    var outline = document.createElementNS(svgNS, "path");
    var path = ""
    path += "M" + coordstr(0, 0, 0, -1, 0);
    for (var i=0; i<ranks; i++) {
        path += "L" + coordstr(0, i, -1, 0, 0);
        path += "L" + coordstr(0, i, 0, 0, 1);
    }
    for (var i=1; i<files; i++) {
        path += "L" + coordstr(i, ranks-1, -1, 0, 0);
        path += "L" + coordstr(i, ranks-1, 0, 0, 1);
    }
    for (var i=ranks-1; i>=0; i--) {
        path += "L" + coordstr(files-1, i, 0, 1, 0);
        path += "L" + coordstr(files-1, i, 1, 0, 0);
    }
    for (var i=files-1; i>=0; i--) {
        path += "L" + coordstr(i, 0, 0, 0, -1);
        path += "L" + coordstr(i, 0, 0, -1, 0);
    }
    path += "z";
    outline.setAttribute("d", path);
    outline.classList.add("outline");
    g.appendChild(outline);

    // Border
    var r = this.borderradius;
    var e = this.excentricity_acute;
    var r4 = (r-e/2) * Math.sqrt(1/3) * this.unit;
    var e2 = this.excentricity_obtuse;
    var r2 = e2/2 + (r - 3/4*e2) / Math.sqrt(3);
    var r3 = (r-3*e2/4) * Math.sqrt(1/3) * this.unit;

    function arc(r, clockwise, file, rank, c, d, e) {
        return "A" + r.toFixed(0) + " " + r.toFixed(0) + " 0 0 " + (clockwise ? "1" : "0") + " " + coordstr(file, rank, c, d, e);
    }
    
    var border = document.createElementNS(svgNS, "path");
    var borderblack = "";
    borderblack += "M" + coordstr(0, 0, 0, -e, -r+e/2);
    borderblack += arc(r4, false, 0, 0, 0, -r-e/2, 0);
    for (var i=0; i<files; i++) {
        borderblack += "L" + coordstr(i, 0, 0, -1, 0);
        borderblack += "L" + coordstr(i, 0, 0, 0, -1);
    }
    borderblack += "L" + coordstr(files-1, 0, 0.5, 0, -0.5);
    borderblack += "L" + coordstr(files-1, 0, r2, 0, -r2);
    borderblack += arc(r3, false, files-1, 0, e2/2, 0, -r+e2/4);
    borderblack += "z";

    borderblack += "M" + coordstr(files-1, ranks-1, 0, e, r-e/2);
    borderblack += arc(r4, false, files-1, ranks-1, 0, r+e/2, 0);
    for (var i=0; i<files; i++) {
        borderblack += "L" + coordstr(files-1-i, ranks-1, 0, 1, 0);
        borderblack += "L" + coordstr(files-1-i, ranks-1, 0, 0, 1);
    }
    borderblack += "L" + coordstr(0, ranks-1, -0.5, 0, 0.5);
    borderblack += "L" + coordstr(0, ranks-1, -r2, 0, r2);
    borderblack += arc(r3, false, 0, ranks-1, -e2/2, 0, r-e2/4);
    borderblack += "z";
    
    border.setAttribute("d", borderblack);
    border.classList.add("black-border");
    g.appendChild(border);
    
    var border = document.createElementNS(svgNS, "path");
    var borderwhite = "";
    borderwhite += "M" + coordstr(0, 0, -r+e/2, -e, 0);
    borderwhite += arc(r4, !false, 0, 0, 0, -r-e/2, 0);
    for (var i=0; i<ranks; i++) {
        borderwhite += "L" + coordstr(0, i, 0, -1, 0);
        borderwhite += "L" + coordstr(0, i, -1, 0, 0);
    }
    borderwhite += "L" + coordstr(0, ranks-1, -0.5, 0, 0.5);
    borderwhite += "L" + coordstr(0, ranks-1, -r2, 0, r2);
    borderwhite += arc(r3, !false, 0, ranks-1, -r+e2/4, 0, e2/2);
    borderwhite += "z";

    borderwhite += "M" + coordstr(files-1, ranks-1, r-e/2, e, 0);
    borderwhite += arc(r4, !false, files-1, ranks-1, 0, r+e/2, 0);
    for (var i=0; i<ranks; i++) {
        borderwhite += "L" + coordstr(files-1, ranks-1-i, 0, 1, 0);
        borderwhite += "L" + coordstr(files-1, ranks-1-i, 1, 0, 0);
    }
    borderwhite += "L" + coordstr(files-1, 0, 0.5, 0, -0.5);
    borderwhite += "L" + coordstr(files-1, 0, r2, 0, -r2);
    borderwhite += arc(r3, !false, files-1, 0, r-e2/4, 0, -e2/2);
    borderwhite += "z";

    border.setAttribute("d", borderwhite);
    border.classList.add("white-border");
    g.appendChild(border);
    
    // Clickable cells and stones
    for (var rank=0; rank<ranks; rank++) {
        for (var file=0; file<files; file++) {
            var g1 = document.createElementNS(svgNS, "g");
            g1.setAttribute("id", Cell.cellname(file, rank));
            var xy = coord(file, rank);
            g1.setAttribute("transform", "translate(" + xy.x + "," + xy.y + ")");
            g1.classList.add("cell");
            
            var path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", hexpath(0, 0));
            path.classList.add("cell-bg");
            if (Math.min(file, rank, files-file-1, ranks-rank-1) % 2 === 1) {
                path.classList.add("shaded");
            }
            g1.appendChild(path);
            var tooltip = document.createElementNS(svgNS, "title");
            tooltip.textContent = Cell.cellname(file, rank);
            g1.appendChild(tooltip);

            var g2 = document.createElementNS(svgNS, "g");
            g2.classList.add("cell-content");
            g2.classList.add("unrotatable");

            var stone = document.createElementNS(svgNS, "circle");
            stone.setAttribute("cx", 0);
            stone.setAttribute("cy", 0);
            stone.setAttribute("r", 0.43*this.unit);
            stone.classList.add("stone-circle");
            g2.appendChild(stone);

            var dot = document.createElementNS(svgNS, "circle");
            var xy = coord(file, rank);
            dot.setAttribute("cx", 0);
            dot.setAttribute("cy", 0);
            dot.setAttribute("r", 0.06 * this.unit);
            dot.classList.add("dot");
            g2.appendChild(dot);

            var swap = document.createElementNS(svgNS, "text");
            var xy = coord(file, rank);
            swap.classList.add("swaplabel");
            swap.setAttribute("x", 0);
            swap.setAttribute("y", 10);
            swap.textContent = "S";
            g2.appendChild(swap);

            var text = document.createElementNS(svgNS, "text");
            var xy = coord(file, rank);
            text.classList.add("movelabel");
            text.setAttribute("x", 0);
            text.setAttribute("y", 10);
            text.textContent = "99";
            g2.appendChild(text);
            
            g1.appendChild(g2);
            g.appendChild(g1);
        }
    }
    
    // Grid
    var grid = document.createElementNS(svgNS, "path");
    var hexes = "";
    for (var rank=0; rank<ranks; rank++) {
        for (var file=0; file<files; file++) {
            hexes += hexpath(file, rank);
        }
    }
    grid.setAttribute("d", hexes);
    grid.classList.add("grid");
    g.appendChild(grid);

    // Coordinate labels
    for (var rank=0; rank<ranks; rank++) {
        var g1 = document.createElementNS(svgNS, "g");
        var xy = coord(-1.1, rank);
        g1.setAttribute("transform", "translate(" + xy.x + "," + xy.y + ")");
        var text = document.createElementNS(svgNS, "text");
        text.classList.add("coordlabel");
        text.classList.add("unrotatable");
        text.setAttribute("x", 0);
        text.setAttribute("y", 10);
        text.textContent = Cell.rankToString(rank);
        g1.appendChild(text);
        g.appendChild(g1);
    }
    for (var rank=0; rank<ranks; rank++) {
        var g1 = document.createElementNS(svgNS, "g");
        var xy = coord(files+0.1, rank);
        g1.setAttribute("transform", "translate(" + xy.x + "," + xy.y + ")");
        var text = document.createElementNS(svgNS, "text");
        text.classList.add("coordlabel");
        text.classList.add("unrotatable");
        text.setAttribute("x", 0);
        text.setAttribute("y", 10);
        text.textContent = Cell.rankToString(rank);
        g1.appendChild(text);
        g.appendChild(g1);
    }
    for (var file=0; file<files; file++) {
        var g1 = document.createElementNS(svgNS, "g");
        var xy = coord(file, -1.1);
        g1.setAttribute("transform", "translate(" + xy.x + "," + xy.y + ")");
        var text = document.createElementNS(svgNS, "text");
        text.classList.add("coordlabel");
        text.classList.add("unrotatable");
        text.setAttribute("x", 0);
        text.setAttribute("y", 10);
        text.textContent = Cell.fileToString(file);
        g1.appendChild(text);
        g.appendChild(g1);
    }
    for (var file=0; file<files; file++) {
        var g1 = document.createElementNS(svgNS, "g");
        var xy = coord(file, ranks+0.1);
        g1.setAttribute("transform", "translate(" + xy.x + "," + xy.y + ")");
        var text = document.createElementNS(svgNS, "text");
        text.classList.add("coordlabel");
        text.classList.add("unrotatable");
        text.setAttribute("x", 0);
        text.setAttribute("y", 10);
        text.textContent = Cell.fileToString(file);
        g1.appendChild(text);
        g.appendChild(g1);
    }
    
    return svg;
}

// Set the cell's content to value, which is Const.black, Const.white,
// or Const.empty. Also set the optional label and swap status.
Board.prototype.setStone = function(cell, color, label, swap) {
    if (label === undefined) {
	label = "";
    }
    if (swap === undefined) {
	swap = false;
    }
    
    var cell = document.getElementById(cell.toString());
    if (!cell) {
        return;
    }
    cell.classList.remove("stone");
    cell.classList.remove("black");
    cell.classList.remove("white");
    cell.classList.remove("swap");
    if (color === Const.black) {
        cell.classList.add("stone");
        cell.classList.add("black");
    } else if (color === Const.white) {
        cell.classList.add("stone");
        cell.classList.add("white");
    }
    if (swap) {
        cell.classList.add("swap");
    }
    var movelabel = cell.querySelector(".movelabel");
    if (!movelabel) {
        return;
    }
    movelabel.textContent = label;    
}

// Get the contents of the cell.
Board.prototype.getColor = function(cell) {
    var cell = document.getElementById(cell.toString());
    if (cell.classList.contains("black")) {
        return Const.black;
    } else if (cell.classList.contains("white")) {
        return Const.white;
    } else {
        return Const.empty;
    }
}

// Check whether the cell is empty.
Board.prototype.isEmpty = function(cell) {
    return this.getColor(cell) === Const.empty;
}

// Clear all "last" markings.
Board.prototype.clearLast = function () {
    var cells = this.svg.querySelectorAll(".last");
    cells.forEach(function (c) {
        c.classList.remove("last");
    });
}

// Set the "last" marking on a cell.
Board.prototype.setLast = function(cell) {
    var cell = document.getElementById(cell.toString());
    if (!cell) {
        return;
    }
    cell.classList.add("last");
}

// Clear the board.
Board.prototype.clear = function() {
    var cells = this.svg.querySelectorAll(".cell");
    cells.forEach(function(cell) {
        cell.classList.remove("black");
        cell.classList.remove("white");
        cell.classList.remove("stone");
    });
}

// Swap-pieces the board state. This involves swapping the board
// dimensions as well. This swap method is implemented for all boards,
// and doesn't care whether swapping is legal or not. The swap flag on
// all stones is toggled, so this can also be used to undo a swap.
Board.prototype.swap_pieces = function() {
    var dict = this.saveContents();
    this.setSize(this.dim.swap()); // also clears the board
    var dict2 = {};
    for (var c in dict) {
        var cell = Cell.fromString(c).swap();
        dict2[cell] = {
            color: dict[c].color === Const.black ? Const.white : Const.black,
            label: dict[c].label,
            swap: !dict[c].swap
        }
    }
    this.restoreContents(dict2);
}

// Swap-sides the board state. The only effect is to toggle the swap
// flag on the stones. Self-inverse.
Board.prototype.swap_sides = function() {
    var stones = this.svg.querySelectorAll(".stone");
    stones.forEach(function(cell) {
        cell.classList.toggle("swap");
    });
}

// Store the board contents in a data structure. This is used during
// updates that need to redraw the SVG.
Board.prototype.saveContents = function() {
    var black = this.svg.querySelectorAll(".cell.black");
    var white = this.svg.querySelectorAll(".cell.white");
    var dict = {};
    black.forEach(function(cell) {
        var c = Cell.fromString(cell.id);
        var swap = cell.classList.contains("swap");
        var label = cell.querySelector(".movelabel").textContent;
        dict[c] = {
            color: Const.black,
            label: label,
            swap: swap
        };
    });
    white.forEach(function(cell) {
        var c = Cell.fromString(cell.id);
        var swap = cell.classList.contains("swap");
        var label = cell.querySelector(".movelabel").textContent;
        dict[c] = {
            color: Const.white,
            label: label,
            swap: swap
        };
    });
    return dict;
}

// Restore the board contents from a data structure. The board must be
// of the correct dimensions and empty.
Board.prototype.restoreContents = function(dict) {
    for (var c in dict) {
        this.setStone(Cell.fromString(c), dict[c].color, dict[c].label, dict[c].swap);
    }
}

// Mirror the board about the specified axis, which is one of
// Const.longDiagonal, Const.shortDiagonal, Const.horizontal,
// Const.vertical.
Board.prototype.mirror = function(axis) {
    switch (axis) {
    case Const.longDiagonal:
        this.mirrored = !this.mirrored;
        break;
    case Const.shortDiagonal:
        this.mirrored = !this.mirrored;
        this.rotation = this.mod12(this.rotation + 6);
        break;
    case Const.horizontal:
        this.mirrored = !this.mirrored;
        this.rotation = this.mod12(-this.rotation);
        break;
    case Const.vertical:
        this.mirrored = !this.mirrored;
        this.rotation = this.mod12(6-this.rotation);
        break;
    }
    this.update();
}

// Rotate the board by the given "step", which measured in hours
// clockwise.
Board.prototype.rotate = function(step) {
    this.rotation = this.mod12(this.rotation + step);
    this.update();
}

Board.prototype.setNumbered = function(bool) {
    if (bool) {
        this.dom.classList.add("numbered");
    } else {
        this.dom.classList.remove("numbered");
    }
}

Board.prototype.setRedBlue = function(bool) {
    if (bool) {
        this.dom.classList.add("redblue");
    } else {
        this.dom.classList.remove("redblue");
    }
}

Board.prototype.setCursor = function(color) {
    if (color === Const.white) {
        this.svg.classList.add("cursor-white");
        this.svg.classList.remove("cursor-black");
    } else {
        this.svg.classList.add("cursor-black");
        this.svg.classList.remove("cursor-white");
    }
}

// ----------------------------------------------------------------------
// Moves

// A move is either a cell or one of the special moves Move.pass,
// Move.swap_pieces, Move.swap_sides, Move.resign, Move.forfeit.
function Move(type) {
    this.type = type;
}

Move.cell = function (cell) {
    var m = new Move(Const.cell);
    m.cell = cell;
    return m;
}
Move.pass = new Move(Const.pass);
Move.swap_pieces = new Move(Const.swap_pieces);
Move.swap_sides = new Move(Const.swap_sides);
Move.resign = function(player) {
    var m = new Move(Const.resign);
    m.player = player
    return m;
}
Move.forfeit = function(player) {
    var m = new Move(Const.forfeit);
    m.player = player
    return m;
}

Move.prototype.getPlayer = function() {
    switch (this.type) {
    case Const.resign:
    case Const.forfeit:
        return this.player;
        break;
    }
    return null;
}

Move.prototype.toSGF = function() {
    switch (this.type) {
    case Const.cell:
        return this.cell.toString();
        break;
    case Const.swap_pieces:
        return "swap-pieces";
        break;
    case Const.swap_sides:
        return "swap-sides";
        break;
    case Const.pass:
        return "pass";
        break;
    case Const.resign:
        return "resign";
        break;
    case Const.forfeit:
        return "forfeit";
        break;
    }
}

// ----------------------------------------------------------------------
// Move list

// This object is only in charge of the movelist display, i.e., the
// DOM element. The logical move list is kept in the GameState object.

function MoveDisplay(container) {
    var self = this;

    this.redblue = false;
    
    this.dom = container;
    this.dom.innerText = "";

    this.childlist = [];
    this.highlighted = undefined;
    
    this.push(null);
    
    // A user-supplied function to call when a move is clicked.
    this.onclick = function (n) {};
    
    this.dom.addEventListener("click", function (event) {
        var move = event.target.closest(".move");
        if (move) {
            var id = move.id;
            var n = parseInt(id.substring(5)); // remove move- prefix
            self.onclick(n);
        }
    });
}

// Push a move to the end of the movelist. The move can be null for an
// empty move (only used at the start of the movelist).
MoveDisplay.prototype.push = function(move) {
    var n = this.childlist.length;
    var div = this.formatMove(move, n);
    this.childlist.push({n: n, div: div, move: move});
    this.dom.appendChild(div);
}

// Pop a move from the movelist.
MoveDisplay.prototype.pop = function() {
    var child = this.childlist.pop();
    if (child !== undefined) {
        this.dom.removeChild(child.div);
    }
}

// Truncate movelist to length n+1.
MoveDisplay.prototype.truncate = function(n) {
    while (this.childlist.length > n+1) {
        this.pop();
    }
}

// Clear the movelist.
MoveDisplay.prototype.clear = function() {
    this.truncate(0);
}

// Highlight the given element (or none if n === undefined)
MoveDisplay.prototype.highlight = function(n) {
    // Remove the previous highlight, if any.
    var k = this.highlighted;
    if (k !== undefined && k < this.childlist.length) {
        this.childlist[k].div.classList.remove("current");
    }
    
    // Check validity of n
    if (n < 0 || n >= this.childlist.length) {
        n = undefined;
    }
    this.highlighted = n;

    // Add the new highlight, and scroll to it.
    if (n !== undefined) {
        this.childlist[n].div.classList.add("current");
        makeVisible(this.childlist[n].div, this.dom, false);
    }
}

MoveDisplay.prototype.formatPlayer = function(player) {
    if (this.redblue) {
        switch (player) {
        case Const.black:
            return "red\xA0\xA0";
            break;
        case Const.white:
            return "blue\xA0";
            break;
        default:
            return player;
            break;
        }
    } else {
        switch (player) {
        case Const.black:
            return "black";
            break;
        case Const.white:
            return "white";
            break;
        default:
            return player;
            break;
        }
    }        
}

// Format a move for the move list.
MoveDisplay.prototype.formatMove = function(move, n) {
    var div = document.createElement("div");
    div.classList.add("move");
    div.setAttribute("id", "move-" + n);
    if (move === null) {
        div.innerText = "\xA0";
        return div;
    }
    var s;
    switch (move.move.type) {
    case Const.cell:
        s = move.move.cell.toString();
        break;
    case Const.swap_pieces:
    case Const.swap_sides:
        s = "swap";
        break;
    case Const.pass:
        s = "pass";
        break;
    case Const.resign:
        s = "resign";
        break;
    case Const.forfeit:
        s = "forfeit";
        break;
    }
    var numdiv = document.createElement("div");
    numdiv.classList.add("number");
    numdiv.innerText = move.number + '.';
    div.appendChild(numdiv);
    var playerdiv = document.createElement("div");
    playerdiv.classList.add("player");
    playerdiv.innerText = this.formatPlayer(move.player);
    div.appendChild(playerdiv);
    var actiondiv = document.createElement("div");
    actiondiv.classList.add("action");
    actiondiv.innerText = s;
    div.appendChild(actiondiv);
    return div;
}

MoveDisplay.prototype.setRedBlue = function(bool) {
    if (bool !== this.redblue) {
        this.redblue = bool;
        this.updatePlayers();
    }
}

// Update the player names in all moves. This is done in response to a
// change from black/white to red/blue mode or vice versa.
MoveDisplay.prototype.updatePlayers = function() {
    for (var i=1; i<this.childlist.length; i++) {
        var child = this.childlist[i];
        var playerdiv = child.div.querySelector(".player");
        if (playerdiv !== undefined && child.move !== null) {
            playerdiv.innerText = this.formatPlayer(child.move.player);
        }
    }
}

// ----------------------------------------------------------------------
// Game state

function GameState(board, movedisplay) {
    var self = this;
    this.movelist = [];
    this.currentmove = 0;
    this.board = board;
    this.dim = this.board.dim; // Holds the initial dimension of the
                               // game, rather than the current
                               // dimension.
    this.movedisplay = movedisplay;
    this.numbered = false;
    this.redblue = false;

    // Keep track of current hash to avoid unnecessary updates.
    this.currentHash = undefined;
    
    // Connect click action.
    this.board.onclick = function(cell) {
        self.UIplay(Move.cell(cell));
    }

    // Connect click action for movedisplay.
    this.movedisplay.onclick = function(n) {
        console.log(n);
        self.UIgotoMove(n);
    };
    
    // A callback function to update button states.
    this.onupdate = function() {
    }
}

// Check whether the current move is a resign move.
GameState.prototype.resigned = function() {
    var n = this.currentmove;
    if (n == 0) {
        return false;
    }
    return this.movelist[n-1].move.type === Const.resign;
}

// Check whether the current move is a forfeit move.
GameState.prototype.forfeited = function() {
    var n = this.currentmove;
    if (n == 0) {
        return false;
    }
    return this.movelist[n-1].move.type === Const.forfeit;
}

// Check whether the given move is legal.
GameState.prototype.isLegal = function(move) {
    switch (move.type) {
    case Const.cell:
        return this.canMove(move.cell);
        break;
    case Const.swap_pieces:
    case Const.swap_sides:
        return this.canSwap();
        break;
    case Const.pass:
        return this.canPass();
        break;
    case Const.resign:
    case Const.forfeit:
        return this.canResign();
        break;
    }        
}

// Check if making a move would truncate the movelist
GameState.prototype.isDestructive = function(move) {
    return this.currentmove < this.movelist.length;
}

// Truncate movelist to current position.
GameState.prototype.truncate = function() {
    this.movelist.length = this.currentmove;
    this.movedisplay.truncate(this.currentmove);
}

GameState.prototype.currentPlayer = function () {
    var self = this;
    function player(n) {
        if (n === 0) {
            return Const.black;
        }
        var last = self.movelist[n-1];
        switch (last.move.type) {
        case Const.swap_sides:
            return last.player;
            break;
        case Const.resign:
        case Const.forfeit:
            return player(n-1);
            break;
        default:
            return last.player === Const.black ? Const.white : Const.black;
            break;
        }
    }
    return player(this.currentmove);
}

// Play the requested move, if possible. Return true on success, false
// on failure.
GameState.prototype.play = function(move) {
    if (!this.isLegal(move)) {
        return false;
    }
    if (this.resigned() || this.forfeited()) {
        this.currentmove -= 1;
    }
    this.truncate();
    var player = move.getPlayer() || this.currentPlayer();
    this.currentmove += 1;
    var n = this.currentmove;
    this.movelist.push({
        number: n,
        player: player,
        move: move
    });
    this.movedisplay.push({
        number: n,
        player: player,
        move: move
    });
    this.playBoardMove(n, player, move);
    this.setLast();
    return true;
}

GameState.prototype.UIplay = function(move) {
    // Special case: click on existing stone to swap
    if (move.type === Const.cell && !this.board.isEmpty(move.cell)) {
        move = Move.swap_pieces;
    }
    if (!this.isLegal(move)) {
        return false;
    }
    // If this move erases part of the move list, add old state to the
    // browser history.
    if (this.isDestructive(move)) {
        var pos = this.currentmove;
        this.UIlast();
        history.pushState(null, null);
        this.gotoMove(pos);
    }
    var r = this.play(move);
    if (r) {
        this.UIupdate();
    }
    return r;
}

// Let the current player resign.
GameState.prototype.resign = function() {
    var player = this.currentPlayer();
    return this.play(Move.resign(player));
}

GameState.prototype.UIresign = function() {
    var r = this.resign();
    if (r) {
        this.UIupdate();
    }
    return r;
}

GameState.prototype.playBoardMove = function(n, player, move) {
    switch (move.type) {
    case Const.cell:
        this.board.setStone(move.cell, player, n, false);
        break;
    case Const.pass:
        break;
    case Const.swap_pieces:
        this.board.swap_pieces();
        break;
    case Const.swap_sides:
        this.board.swap_sides();
        break;
    case Const.resign:
        break;
    case Const.forfeit:
        break;
    }
}

GameState.prototype.undoBoardMove = function(n, player, move) {
    switch (move.type) {
    case Const.cell:
        this.board.setStone(move.cell, Const.empty);
        break;
    case Const.pass:
        break;
    case Const.swap_pieces:
        this.board.swap_pieces();
        break;
    case Const.swap_sides:
        this.board.swap_sides();
        break;
    case Const.resign:
        break;
    case Const.forfeit:
        break;
    }
}

// Redo the next move. Return true on success, false on failure.
GameState.prototype.redo = function() {
    var n = this.currentmove;

    if (n >= this.movelist.length) {
        return false;
    }
    var move = this.movelist[n];
    this.playBoardMove(move.number, move.player, move.move);
    this.currentmove++;
    this.setLast();
    return true;
}

// Redo the next move. Return true on success, false on failure.
GameState.prototype.UIredo = function() {
    var r = this.redo();
    if (r) {
        this.UIupdate();
    }
    return r;
}

// Undo the last move. Return true on success, false on failure.
GameState.prototype.undo = function() {
    var n = this.currentmove;

    if (n <= 0) {
        return false;
    }
    var move = this.movelist[n-1];
    this.undoBoardMove(move.number, move.player, move.move);
    this.currentmove--;
    this.setLast();
    return true;
}

// Undo the last move. Return true on success, false on failure.
GameState.prototype.UIundo = function() {
    var r = this.undo();
    if (r) {
        this.UIupdate();
    }
    return r;
}

// Go to the start of the move list.
GameState.prototype.first = function() {
    while (this.currentmove > 0) {
        this.undo();
    }
    return true;
}

// Go to the start of the move list.
GameState.prototype.UIfirst = function() {
    var r = this.first();
    if (r) {
        this.UIupdate();
    }
    return r;
}

// Go to the end of the move list.
GameState.prototype.last = function() {
    while (this.currentmove < this.movelist.length) {
        this.redo();
    }
    return true;
}

// Go to the start of the move list.
GameState.prototype.UIlast = function() {
    var r = this.last();
    if (r) {
        this.UIupdate();
    }
    return r;
}

// Go to a specific move number.
GameState.prototype.gotoMove = function(n) {
    while (this.currentmove > n && this.currentmove > 0) {
        this.undo();
    }
    while (this.currentmove < n && this.currentmove < this.movelist.length) {
        this.redo();
    }
    return this.currentmove === n;
}

GameState.prototype.UIgotoMove = function(n) {
    var r = this.gotoMove(n);
    if (r) {
        this.UIupdate();
    }
    return r;
}

// Mark the appropriate move as "last".
GameState.prototype.setLast = function () {
    this.board.clearLast();
    var n = this.currentmove;
    if (n === 0) {
        return;
    }
    var move = this.movelist[n-1].move;
    switch (move.type) {
    case Const.cell:
        this.board.setLast(move.cell);
        break;
    case Const.swap_pieces:
        var move2 = this.movelist[n-2].move;
        this.board.setLast(move2.cell.swap());
        break;
    case Const.swap_sides:
        var move2 = this.movelist[n-2].move;
        this.board.setLast(move2.cell);
        break;
    }
    return;        
}

// Set the game size. Return true on success and false on failure
// (including when the size is unchanged).
GameState.prototype.setSize = function(dim) {
    if (dim.files < 1 || dim.files > 30 || dim.ranks < 1 || dim.ranks > 30) {
        return false;
    }
    if (this.board.dim.equals(dim)) {
        return false;
    }
    this.board.setSize(dim);
    this.dim = dim;
    this.clear();
    return true;
}

GameState.prototype.nonEmpty = function() {
    return this.movelist.length > 0;
}

GameState.prototype.UIsetSize = function(dim) {
    if (this.nonEmpty()) {
        history.pushState(null, null);
    }
    var r = this.setSize(dim);
    if (r) {
        this.UIupdate();
    }
    return r;
}

// Set the game orientation.
GameState.prototype.setOrientation = function(rotation, mirrored) {
    this.board.rotation = this.board.mod12(rotation);
    this.board.mirrored = mirrored;
    this.board.update();
}

GameState.prototype.UIsetOrientation = function(rotation, mirrored) {
    this.setOrientation(rotation, mirrored);
    this.UIupdate();
}

// Clear the move list.
GameState.prototype.clear = function() {
    this.movelist = [];
    this.movedisplay.clear();
    this.currentmove = 0;
    this.board.clear();
}

GameState.prototype.UIclear = function() {
    if (this.nonEmpty()) {
        history.pushState(null, null);
    }
    this.clear();
    this.UIupdate();
}

// Update all UI components that need to be updated as a whole (do not
// support incremental updates). Currently, this is the move list and
// hash. Only functions whose name starts with UI call this. This is
// to ensure that the UI isn't needlessly updated multiple times.
GameState.prototype.UIupdate = function() {
    var newHash = this.URLHash();
    this.currentHash = newHash;
    window.location.replace(newHash);
    this.onupdate();
    board.setCursor(this.currentPlayer());
    this.board.rescale();  // because move list might have changed size
    this.movedisplay.highlight(this.currentmove);
}

// Format a move for the URL string.
GameState.prototype.hashMove = function(move) {
    switch (move.move.type) {
    case Const.cell:
        return move.move.cell.toString();
        break;
    case Const.swap_pieces:
        return ":s";
        break;
    case Const.swap_sides:
        return ":S";
        break;
    case Const.pass:
        return ":p";
        break;
    case Const.resign:
        if (move.player === Const.black) {
            return ":rb";
        } else {
            return ":rw";
        }
        break;
    case Const.forfeit:
        if (move.player === Const.black) {
            return ":fb";
        } else {
            return ":fw";
        }
        break;
    }
}

// Construct a local-URL string (the part after '#').
GameState.prototype.URLHash = function() {
    var acc = "#";
    acc += this.dim.format();
    var orient = this.board.mod12(this.board.rotation);
    if (orient === 0) {
	orient = 12;
    }
    if (orient !== 10) {
        acc += "r" + orient.toFixed(0);
    }
    if (this.board.mirrored) {
        acc += "m";
    }
    if (this.numbered) {
        acc += "n";
    }
    if (this.redblue) {
        acc += "c1";
    }
    acc += ","
    if (this.currentmove === 0) {
        acc += ",";
    }
    for (var i=0; i<this.movelist.length; i++) {
        var move = this.movelist[i];
        acc += this.hashMove(move);
        if (i === this.currentmove-1) {
            acc += ",";
        }
    }
    // remove trailing commas.
    var len = acc.length;
    while (len > 0 && acc[len-1] === ",") {
        len--;
        acc = acc.substring(0, len);
    }
        
    return acc;
}

// Mirror the board.
GameState.prototype.mirror = function(axis) {
    this.board.mirror(axis);
}

GameState.prototype.UImirror = function(axis) {
    this.mirror(axis);
    this.UIupdate();
}

// Rotate the board.
GameState.prototype.rotate = function(step) {
    this.board.rotate(step);
}

GameState.prototype.UIrotate = function(step) {
    this.rotate(step);
    this.UIupdate();
}

GameState.prototype.setNumbered = function(bool) {
    this.numbered = bool;
    this.board.setNumbered(bool);
}

GameState.prototype.UIsetNumbered = function(bool) {
    this.setNumbered(bool);
    this.UIupdate();
}

GameState.prototype.setRedBlue = function(bool) {
    this.redblue = bool;
    this.board.setRedBlue(bool);
    this.movedisplay.setRedBlue(bool);
}

GameState.prototype.UIsetRedBlue = function(bool) {
    this.setRedBlue(bool);
    this.UIupdate();
}

// Initialize from URLHash.
GameState.prototype.fromURLHash = function(hash) {
    function parse(s, regex) {
        var match = s.match(regex);
        if (!match) {
            return null;
        } else {
            return {
                match: match[1],
                rest: match[2]
            };
        }
    }

    function parse_move(s) {
        switch (s) {
        case ":s":
            return Move.swap_pieces;
            break;
        case ":S":
            return Move.swap_sides;
            break;
        case ":p":
            return Move.pass;
            break;
        case ":rb":
            return Move.resign(Const.black);
            break;
        case ":rw":
            return Move.resign(Const.white);
            break;
        case ":fb":
            return Move.forfeit(Const.black);
            break;
        case ":fw":
            return Move.forfeit(Const.white);
            break;
        default:
            return Move.cell(Cell.fromString(s));
            break;
        }            
    }

    if (hash.length > 0 && hash[0] === "#") {
        hash = hash.substring(1);
    }
    
    var dim = new Dimension(11);
    var rotation = 10;
    var mirrored = false;
    var numbered = false;
    var coloring = 0;
    
    var parts = hash.split(",");

    // Parse parameters.
    var s = parts[0] ? parts[0] : "";
    var p;
    if ((p = parse(s, /^([1-9][0-9]*x[1-9][0-9]*|[1-9][0-9]*)(.*)$/)) !== null) {
        dim = Dimension.parse(p.match);
        s = p.rest;
    }
    while ((p = parse(s, /^(r[1-9][0-9]*|m|n|c[1-9][0-9]*)(.*)$/)) !== null) {
        switch (p.match[0]) {
        case "r":
            rotation = parseInt(p.match.substring(1));
            break;
        // case "m":
        //     mirrored = true;
        //     break;
        case "n":
            numbered = true;
            break;
        case "c":
            coloring = parseInt(p.match.substring(1));
            break;
        }
        s = p.rest;
    }
    // If there is an unknown parameter, it and any subsequent
    // parameters are ignored.
    this.clear();
    this.setSize(dim);
    this.setOrientation(rotation, mirrored);
    this.setNumbered(numbered);
    this.setRedBlue(coloring === 1);
    
    // Parse moves.
    var s = parts[1] ? parts[1] : ""
    var p;
    while ((p = parse(s, /^([a-z]+[1-9][0-9]*|:s|:S|:p|:rb|:rw|:fb|:fw)(.*)$/)) !== null) {
        var r = this.play(parse_move(p.match));
        if (!r) {
            return;
        }
        s = p.rest;
    }
    var pos = this.currentmove;
    var s = parts[2] ? parts[2] : "";
    var p;
    while ((p = parse(s, /^([a-z]+[1-9][0-9]*|:s|:S|:p|:rb|:rw|:fb|:fw)(.*)$/)) !== null) {
        var r = this.play(parse_move(p.match));
        if (!r) {
            break;
        }
        s = p.rest;
    }
    // If there's an illegal or ill-formed move, it and any subsequent
    // moves are ignored.
    this.gotoMove(pos);
}

GameState.prototype.UIfromURLHash = function(hash) {
    if (hash === this.currentHash) {
        return;
    }
    this.fromURLHash(hash);
    this.UIupdate();
}

// Determine whether moving in the given cell is possible.
GameState.prototype.canMove = function(cell) {
    if (cell.file < 0 || cell.file >= board.dim.files) {
        return false;
    }
    if (cell.rank < 0 || cell.rank >= board.dim.ranks) {
        return false;
    }
    return this.board.isEmpty(cell);
}

// Determine whether swapping is possible.
GameState.prototype.canSwap = function() {
    var n = this.currentmove;
    if (this.resigned() || this.forfeited()) {
        n -= 1;
    }
    return n === 1 && this.movelist[0].move.type === Const.cell;
}

// Determine whether passing is possible.
GameState.prototype.canPass = function() {
    return true;
}

// Determine whether resigning and forfeiting are possible.
GameState.prototype.canResign = function() {
    return true;
}

// Determine whether "first" and "undo" are possible.
GameState.prototype.canUndo = function() {
    return this.currentmove > 0;
}

// Determine whether "last" and "redo" are possible.
GameState.prototype.canRedo = function() {
    return this.currentmove < this.movelist.length;
}

// Convert the game to SGF
GameState.prototype.toSGF = function() {
    var acc = "";
    acc += "(";
    acc += ";";
    acc += "AP[hexworld:0.0]";
    acc += "FF[4]";
    acc += "GM[11]";
    acc += "SZ[" + this.dim.toSGF() + "]";

    for (var i=0; i<this.movelist.length; i++) {
        var move = this.movelist[i];
        var player = move.player === Const.black ? "B" : "W";
        acc += ";" + player + "[" + move.move.toSGF() + "]";
    }

    acc += ")";    
    return acc;    
}

GameState.prototype.UIdownloadSGF = function () {
    var sgf = this.toSGF();
    var blob = new Blob([sgf], {type: "application/x-smartgameformat"});
    var filename = dateString() + "-hexworld.sgf";
    download(blob, filename);
}

// ----------------------------------------------------------------------
// Set up DOM tree.

var main = document.getElementById("board-container");
var board = new Board(new Dimension(11), 9, false);
main.appendChild(board.dom);
board.rescale();
var movelist_panel = document.getElementById("movelist-container");
var movedisplay = new MoveDisplay(movelist_panel);
var state = new GameState(board, movedisplay);

// ----------------------------------------------------------------------
// Activate menus

var menus = document.querySelectorAll(".menu-toggle");
menus.forEach(function(m) {
    m.addEventListener("click", function(e) {
        m.parentNode.classList.toggle("show");
    });
    document.addEventListener("click", function(e) {
        if (!m.contains(e.target)) {
            m.parentNode.classList.remove("show");
        }
    });
});

// ----------------------------------------------------------------------
// Map buttons

var link_swap = document.getElementById("item-swap");
var link_pass = document.getElementById("item-pass");
var link_resign = document.getElementById("item-resign");
var link_bw = document.getElementById("item-bw");
var link_rg = document.getElementById("item-rg");
var link_about = document.getElementById("item-about");
var link_download = document.getElementById("item-download");
var button_rotate_left = document.getElementById("button-rotate-left");
var button_rotate_right = document.getElementById("button-rotate-right");
var button_first = document.getElementById("button-first");
var button_undo = document.getElementById("button-undo");
var button_redo = document.getElementById("button-redo");
var button_last = document.getElementById("button-last");
var button_clear = document.getElementById("button-clear");
var button_numbered = document.getElementById("button-numbered");

link_swap.addEventListener("click", function () {
    state.UIplay(Move.swap_pieces);
});
link_pass.addEventListener("click", function () {
    state.UIplay(Move.pass);
});
link_resign.addEventListener("click", function () {
    state.UIresign();
});
link_about.addEventListener("click", function () {
    window.open("about.html", "about");
});
link_download.addEventListener("click", function () {
    state.UIdownloadSGF();
});
button_rotate_left.addEventListener("click", function () {
    state.UIrotate(-1);
});
button_rotate_right.addEventListener("click", function () {
    state.UIrotate(1);
});
button_first.addEventListener("click", function () {
    state.UIfirst();
});
button_undo.addEventListener("click", function () {
    state.UIundo();
});
button_redo.addEventListener("click", function () {
    state.UIredo();
});
button_last.addEventListener("click", function () {
    state.UIlast();
});
button_clear.addEventListener("click", function () {
    state.UIclear();
});
button_numbered.addEventListener("click", function () {
    button_numbered.classList.toggle("checked");
    state.UIsetNumbered(button_numbered.classList.contains("checked"));
});
link_bw.addEventListener("click", function () {
     state.UIsetRedBlue(false);
});
link_rg.addEventListener("click", function () {
     state.UIsetRedBlue(true);
});
var input = document.getElementById("input-size");
input.addEventListener("keydown", function (event) {
    if (event.keyCode !== 13) {
        return;
    }
    var size = Dimension.parse(input.value);
    if (size !== undefined) {
        state.UIsetSize(size);
    }
    input.blur()
});
input.addEventListener("blur", function (event) {
    input_update(input);
});
function input_update(input) {
    var value = state.dim;
    input.value = value.format();
}
state.onupdate = function() {
    input_update(input);
    if (state.numbered) {
        button_numbered.classList.add("checked");
    } else {
        button_numbered.classList.remove("checked");
    }

    function setEnabled(elt, bool) {
        if (bool) {
            elt.removeAttribute("disabled");
            elt.classList.remove("disabled");
        } else {
            elt.setAttribute("disabled", "disabled");
            elt.classList.add("disabled");
        }
    }
    
    setEnabled(link_swap, state.canSwap());
    setEnabled(link_pass, state.canPass());
    setEnabled(link_resign, state.canResign());
    setEnabled(button_first, state.canUndo());
    setEnabled(button_undo, state.canUndo());
    setEnabled(button_redo, state.canRedo());
    setEnabled(button_last, state.canRedo());
};

function inputFocus() {
    var a = document.activeElement;
    if (a === input) {
        return true;
    }
    return false;
}

// ----------------------------------------------------------------------
// Keyboard shortcuts

document.addEventListener("keydown", function(e) {
    // Ignore keyboard input when any input field is in focus.
    if (inputFocus()) {
        return false;
    }
    if (e.keyCode === "S".charCodeAt(0) && e.ctrlKey === false && e.shiftKey === false) {
        document.getElementById("button-swap-pieces").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === "P".charCodeAt(0) && e.ctrlKey === false && e.shiftKey === false) {
        document.getElementById("button-undo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === "N".charCodeAt(0) && e.ctrlKey === false && e.shiftKey === false) {
        document.getElementById("button-redo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === "F".charCodeAt(0) && e.ctrlKey === false && e.shiftKey === false) {
        document.getElementById("button-first").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === "L".charCodeAt(0) && e.ctrlKey === false && e.shiftKey === false) {
        document.getElementById("button-last").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 37 && e.ctrlKey === false && e.shiftKey === false) {
        // Left
        document.getElementById("button-undo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 38 && e.ctrlKey === false && e.shiftKey === false) {
        // Up
        document.getElementById("button-undo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 39 && e.ctrlKey === false && e.shiftKey === false) {
        // Right
        document.getElementById("button-redo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 40 && e.ctrlKey === false && e.shiftKey === false) {
        // Down
        document.getElementById("button-redo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 36 && e.ctrlKey === false && e.shiftKey === false) {
        // Home
        document.getElementById("button-first").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 35 && e.ctrlKey === false && e.shiftKey === false) {
        // End
        document.getElementById("button-last").click();
        e.preventDefault();
        return true
    }
    return false;
});

// ----------------------------------------------------------------------
// Handle URL hash

window.addEventListener("hashchange", function (e) {
    var hash = window.location.hash;
    state.UIfromURLHash(hash);
});

state.UIfromURLHash(window.location.hash);

// })();
