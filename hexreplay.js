// (function () {

"use strict";

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
    var regexp = /^([a-z]+)([0-9]+)$/g;
    var matches = s.matchAll(regexp).next().value;
    if (!matches) {
        return null;
    }
    var file = Cell.stringToFile(matches[1]);
    var rank = Cell.stringToRank(matches[2]);
    return new Cell(file, rank);
}

// ----------------------------------------------------------------------
// Dimension

function Dimension(files, ranks = undefined) {
    if (ranks === undefined) {
        ranks = files;
    }
    this.files = files;
    this.ranks = ranks;
}

// Formatting for HTML form.
Dimension.prototype.format = function () {
    if (this.files == this.ranks) {
        return this.files.toString();
    } else {
        return this.files + "x" + this.ranks;
    }
}

// Parsing for HTML form.
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

Dimension.prototype.swap = function() {
    return new Dimension(this.ranks, this.files);
}

Dimension.prototype.equals = function(dim) {
    return dim.files === this.files && dim.ranks === this.ranks;
}

// ----------------------------------------------------------------------
// Board

// This holds a DOM element to display a board.

function Board(dim, rotation = 9, mirrored = false) {
    var self = this;

    this.dim = dim;
    this.rotation = rotation;
    this.mirrored = mirrored;

    // Internal parameters.
    this.unit = 80;
    this.borderradius = 1.2;
    this.excentricity_acute = 0.5;
    this.excentricity_obtuse = 0.5;

    // Create the board's DOM element.
    this.dom = document.createElement("div");
    this.dom.classList.add("board");

    // A user-supplied function to call when a cell is clicked.
    this.onclick = function (cell) {};
    
    // Update the board's appearance.
    this.draw_svg();
    this.rescale();

    window.addEventListener("resize", function () {self.rescale()});

    this.dom.addEventListener("mousedown", function(event) {
        var cell = event.target.closest(".cell");
        if (cell) {
            self.onclick(Cell.fromString(cell.id));
        }
    });
}

// Use this when the SVG does not yet exist in the DOM tree, or when
// the contents should be cleared. If the SVG already exists and the
// content should be preserved, use update().
Board.prototype.draw_svg = function() {
    // Delete old contents.
    this.dom.innerHTML = "";
    
    // Create new svg element.
    this.svg = this.svg_of_board();

    this.dom.appendChild(this.svg);
}

// Redraw the board, preserving the existing contents.
Board.prototype.update = function () {
    var dict = this.saveContents();
    this.draw_svg();
    this.rescale();
    this.restoreContents(dict);
}

// Rescale SVG to container. This must be called upon initialization
// (*after* the board element is integrated in the DOM tree, so that
// its size is known), and upon any event that may affect the
// element's size. The window's "resize" event is already handled.
Board.prototype.rescale = function() {
    this.svg.setAttribute("width", this.dom.offsetWidth);
    this.svg.setAttribute("height", this.dom.offsetHeight);
}

// Set the logical size of the board. This also clears the board.
Board.prototype.setSize = function(dim) {
    this.dim = dim;
    this.draw_svg();
    this.rescale();
}

Board.prototype.svg_of_board = function() {
    var files = this.dim.files;
    var ranks = this.dim.ranks;
    var rotation = this.rotation;
    var mirrored = this.mirrored;
    
    var theta = -Math.PI * (rotation + 2) / 6;
    if (!mirrored) {
        var ax = this.unit * Math.cos(theta);
        var ay = -this.unit * Math.sin(theta);
        var bx = this.unit * Math.cos(theta - Math.PI / 3);
        var by = -this.unit * Math.sin(theta - Math.PI / 3);
    } else {
        var ax = this.unit * Math.cos(theta - Math.PI / 3);
        var ay = -this.unit * Math.sin(theta - Math.PI / 3);
        var bx = this.unit * Math.cos(theta);
        var by = -this.unit * Math.sin(theta);
    }            

    // Hex coordinates:
    //        ·     ·
    //     ·     c     ·
    //        0     a
    //     ·     d     ·
    //        e     · 
    //           b
    //        ·     ·
    //           ·
    function coord(a, b, c=0, d=0, e=0) {
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
    function coordstr(a, b, c=0, d=0, e=0) {
        return xystr(coord(a, b, c, d, e));
    }

    function boundingbox(points) {
        var len = points.length;
        if (len === 0) { // nonsense
            return {x0: 0, x1: 1, y0: 0, y1: 1};
        }
        var x0 = points[0].x;
        var x1 = points[0].x;
        var y0 = points[0].y;
        var y1 = points[0].y;
        for (var i=1; i<points.length; i++) {
            x0 = Math.min(x0, points[i].x);
            x1 = Math.max(x1, points[i].x);
            y0 = Math.min(y0, points[i].y);
            y1 = Math.max(y1, points[i].y);
        }
        return {x0: x0, x1: x1, y0: y0, y1: y1};
    }
    
    var box = boundingbox([
        coord(0, -1, 0, 0, -1),
        coord(0, -1, 0, -1, 0),
        coord(-1, 0, 0, -1, 0),
        coord(-1, 0, -1, 0, 0),
        coord(-1, ranks, 0, -1, 0, 0),
        coord(-1, ranks, 0, 0, 1),
        coord(files-1, ranks, 0, 0, 1),
        coord(files-1, ranks, 0, 1, 0),
        coord(files, ranks-1, 0, 1, 0),
        coord(files, ranks-1, 1, 0, 0),
        coord(files, -1, 1, 0, 0),
        coord(files, -1, 0, 0, -1)
    ]);

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
    svg.setAttribute("viewBox", box.x0.toFixed(0) + " " + box.y0.toFixed(0) + " " + (box.x1-box.x0).toFixed(0) + " " + (box.y1-box.y0).toFixed(0));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    var svgNS = svg.namespaceURI;

    var defs = document.createElementNS(svgNS, "defs");

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
    stop.setAttribute("stop-color", "#ff6060");
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
    stop.setAttribute("stop-color", "#5858ff");
    grad.appendChild(stop);
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "30%");
    stop.setAttribute("stop-color", "#2020e0");
    grad.appendChild(stop);
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "100%");
    stop.setAttribute("stop-color", "#000060");
    grad.appendChild(stop);
    defs.appendChild(grad);
    svg.appendChild(defs);
    
    var g = document.createElementNS(svgNS, "g");
    g.setAttribute("transform", "scale(1,1)");
    svg.appendChild(g);

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
    borderblack += arc(r4, mirrored, 0, 0, 0, -r-e/2, 0);
    for (var i=0; i<files; i++) {
        borderblack += "L" + coordstr(i, 0, 0, -1, 0);
        borderblack += "L" + coordstr(i, 0, 0, 0, -1);
    }
    borderblack += "L" + coordstr(files-1, 0, 0.5, 0, -0.5);
    borderblack += "L" + coordstr(files-1, 0, r2, 0, -r2);
    borderblack += arc(r3, mirrored, files-1, 0, e2/2, 0, -r+e2/4);
    borderblack += "z";

    borderblack += "M" + coordstr(files-1, ranks-1, 0, e, r-e/2);
    borderblack += arc(r4, mirrored, files-1, ranks-1, 0, r+e/2, 0);
    for (var i=0; i<files; i++) {
        borderblack += "L" + coordstr(files-1-i, ranks-1, 0, 1, 0);
        borderblack += "L" + coordstr(files-1-i, ranks-1, 0, 0, 1);
    }
    borderblack += "L" + coordstr(0, ranks-1, -0.5, 0, 0.5);
    borderblack += "L" + coordstr(0, ranks-1, -r2, 0, r2);
    borderblack += arc(r3, mirrored, 0, ranks-1, -e2/2, 0, r-e2/4);
    borderblack += "z";
    
    border.setAttribute("d", borderblack);
    border.classList.add("black-border");
    g.appendChild(border);
    
    var border = document.createElementNS(svgNS, "path");
    var borderwhite = "";
    borderwhite += "M" + coordstr(0, 0, -r+e/2, -e, 0);
    borderwhite += arc(r4, !mirrored, 0, 0, 0, -r-e/2, 0);
    for (var i=0; i<ranks; i++) {
        borderwhite += "L" + coordstr(0, i, 0, -1, 0);
        borderwhite += "L" + coordstr(0, i, -1, 0, 0);
    }
    borderwhite += "L" + coordstr(0, ranks-1, -0.5, 0, 0.5);
    borderwhite += "L" + coordstr(0, ranks-1, -r2, 0, r2);
    borderwhite += arc(r3, !mirrored, 0, ranks-1, -r+e2/4, 0, e2/2);
    borderwhite += "z";

    borderwhite += "M" + coordstr(files-1, ranks-1, r-e/2, e, 0);
    borderwhite += arc(r4, !mirrored, files-1, ranks-1, 0, r+e/2, 0);
    for (var i=0; i<ranks; i++) {
        borderwhite += "L" + coordstr(files-1, ranks-1-i, 0, 1, 0);
        borderwhite += "L" + coordstr(files-1, ranks-1-i, 1, 0, 0);
    }
    borderwhite += "L" + coordstr(files-1, 0, 0.5, 0, -0.5);
    borderwhite += "L" + coordstr(files-1, 0, r2, 0, -r2);
    borderwhite += arc(r3, !mirrored, files-1, 0, r-e2/4, 0, -e2/2);
    borderwhite += "z";

    border.setAttribute("d", borderwhite);
    border.classList.add("white-border");
    g.appendChild(border);
    
    // Clickable cells and stones
    for (var rank=0; rank<ranks; rank++) {
        for (var file=0; file<files; file++) {
            var g1 = document.createElementNS(svgNS, "g");
            g1.setAttribute("id", Cell.cellname(file, rank));
            g1.classList.add("cell");
            
            var path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", hexpath(file, rank));
            path.classList.add("background");
            if (Math.min(file, rank, files-file-1, ranks-rank-1) % 2 === 1) {
                path.classList.add("shaded");
            }
            g1.appendChild(path);
            var tooltip = document.createElementNS(svgNS, "title");
            tooltip.innerHTML = Cell.cellname(file, rank);
            g1.appendChild(tooltip);

            var stone = document.createElementNS(svgNS, "circle");
            var xy = coord(file, rank);
            stone.setAttribute("cx", xy.x);
            stone.setAttribute("cy", xy.y);
            stone.setAttribute("r", 0.43 * this.unit);
            stone.classList.add("black-stone");
            g1.appendChild(stone);

            var stone = document.createElementNS(svgNS, "circle");
            var xy = coord(file, rank);
            stone.setAttribute("cx", xy.x);
            stone.setAttribute("cy", xy.y);
            stone.setAttribute("r", 0.42 * this.unit);
            stone.classList.add("white-stone");
            g1.appendChild(stone);

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

    // Labels
    for (var rank=0; rank<ranks; rank++) {
        var xy = coord(-1.1, rank);
        var text = document.createElementNS(svgNS, "text");
        text.classList.add("label");
        text.setAttribute("x", xy.x);
        text.setAttribute("y", xy.y + 10);
        text.innerHTML = Cell.rankToString(rank);
        g.appendChild(text);
    }
    for (var rank=0; rank<ranks; rank++) {
        var xy = coord(files+0.1, rank);
        var text = document.createElementNS(svgNS, "text");
        text.classList.add("label");
        text.setAttribute("x", xy.x);
        text.setAttribute("y", xy.y + 10);
        text.innerHTML = Cell.rankToString(rank);
        g.appendChild(text);
    }
    for (var file=0; file<files; file++) {
        var xy = coord(file, -1.1);
        var text = document.createElementNS(svgNS, "text");
        text.classList.add("label");
        text.setAttribute("x", xy.x);
        text.setAttribute("y", xy.y + 10);
        text.innerHTML = Cell.fileToString(file);
        g.appendChild(text);
    }
    for (var file=0; file<files; file++) {
        var xy = coord(file, ranks+0.1);
        var text = document.createElementNS(svgNS, "text");
        text.classList.add("label");
        text.setAttribute("x", xy.x);
        text.setAttribute("y", xy.y + 10);
        text.innerHTML = Cell.fileToString(file);
        g.appendChild(text);
    }
    
    return svg;
}

// Set the cell's content to value, which is Const.black, Const.white, or Const.empty.
Board.prototype.setStone = function(cell, value) {
    var cell = document.getElementById(cell.toString());
    if (cell) {
        cell.classList.remove("black");
        cell.classList.remove("white");
        if (value === Const.black) {
            cell.classList.add("black");
        } else if (value === Const.white) {
            cell.classList.add("white");
        }
    }
}

// Get the contents of the cell.
Board.prototype.getStone = function(cell) {
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
    return this.getStone(cell) === Const.empty;
}

// Clear the board.
Board.prototype.clear = function() {
    var cells = this.svg.querySelectorAll(".cell");
    cells.forEach(function(cell) {
        cell.classList.remove("black");
        cell.classList.remove("white");
    });
}

// Swap the board state. This involves swapping the board dimensions
// as well. This swap method is implemented for all boards, and
// doesn't care whether swapping is legal or not.
Board.prototype.swap = function() {
    var dict = this.saveContents();
    this.setSize(this.dim.swap()); // also clears the board
    var dict2 = {};
    for (var c in dict) {
        var cell = Cell.fromString(c).swap();
        dict2[cell] = dict[c] === Const.black ? Const.white : Const.black;
    }
    this.restoreContents(dict2);
}

// Store the board contents in a data structure. This is used during
// updates that need to redraw the SVG.
Board.prototype.saveContents = function() {
    var black = this.svg.querySelectorAll(".cell.black");
    var white = this.svg.querySelectorAll(".cell.white");
    var dict = {};
    black.forEach(function(cell) {
        var c = Cell.fromString(cell.id);
        dict[c] = Const.black;
    });
    white.forEach(function(cell) {
        var c = Cell.fromString(cell.id);
        dict[c] = Const.white;
    });
    return dict;
}

// Restore the board contents from a data structure. The board must be
// of the correct dimensions and empty.
Board.prototype.restoreContents = function(dict) {
    for (var c in dict) {
        this.setStone(Cell.fromString(c), dict[c]);
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
        this.rotation += 6;
        break;
    case Const.horizontal:
        this.mirrored = !this.mirrored;
        this.rotation = -this.rotation;
        break;
    case Const.vertical:
        this.mirrored = !this.mirrored;
        this.rotation = 6-this.rotation;
        break;
    }
    this.update();
}

// Rotate the board by the given "step", which measured in hours
// clockwise.
Board.prototype.rotate = function(step) {
    if (this.mirrored) {
        this.rotation += step;
    } else {
        this.rotation += step;
    }
    this.update();
}

// ----------------------------------------------------------------------
// Game logic

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

function GameState(board, movelist_panel) {
    self = this;
    this.movelist = [];
    this.currentmove = 0;
    this.board = board;
    this.dim = this.board.dim; // Holds the initial dimension of the
                               // game, rather than the current
                               // dimension.
    this.movelist_panel = movelist_panel;

    // Connect click action.
    this.board.onclick = function(cell) {
        self.UIplay(Move.cell(cell));
    }

    // Connect click action for movelist.
    this.movelist_panel.addEventListener("click", function(event) {
        var move = event.target.closest(".move");
        var id = move.id;
        var n = parseInt(id.substring(5)); // remove move- prefix
        self.UIgotoMove(n);
    });
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
    // No legal moves after resigning.
    if (this.resigned() || this.forfeited()) {
        return false;
    }
    switch (move.type) {
    case Const.cell:
        if (move.cell.file < 0 || move.cell.file >= board.dim.files) {
            return false;
        }
        if (move.cell.rank < 0 || move.cell.rank >= board.dim.ranks) {
            return false;
        }
        return this.board.isEmpty(move.cell);
        break;
    case Const.swap_pieces:
    case Const.swap_sides:
        return this.currentmove === 1;
        break;
    case Const.pass:
    case Const.resign:
    case Const.forfeit:
        return true;
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
}

GameState.prototype.currentPlayer = function () {
    var n = this.currentmove;
    if (this.currentmove >= 2 && this.movelist[1].move.type === Const.swap_sides) {
        n += 1;
    }
    return n % 2 === 0 ? Const.black : Const.white
}

// Play the requested move, if possible. Return true on success, false
// on failure.
GameState.prototype.play = function(move) {
    if (!this.isLegal(move)) {
        return false;
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
    this.playBoardMove(n, player, move);
    return true;
}

GameState.prototype.UIplay = function(move) {
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
    this.UIupdate();
    return r;
}

GameState.prototype.playBoardMove = function(n, player, move) {
    switch (move.type) {
    case Const.cell:
        this.board.setStone(move.cell, player);
        break;
    case Const.pass:
        break;
    case Const.swap_pieces:
        this.board.swap();
        break;
    case Const.swap_sides:
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
        this.board.swap();
        break;
    case Const.swap_sides:
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
    return true;
}

// Redo the next move. Return true on success, false on failure.
GameState.prototype.UIredo = function() {
    var r = this.redo();
    this.UIupdate();
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
    return true;
}

// Undo the last move. Return true on success, false on failure.
GameState.prototype.UIundo = function() {
    var r = this.undo();
    this.UIupdate();
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
    this.UIupdate();
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
    this.UIupdate();
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
    this.UIupdate();
    return r;
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

GameState.prototype.UIsetSize = function(dim) {
    history.pushState(null, null);
    var r = this.setSize(dim);
    this.UIupdate();
    return r;
}

// Set the game orientation.
GameState.prototype.setOrientation = function(rotation, mirrored) {
    this.board.rotation = rotation;
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
    this.currentmove = 0;
    this.board.clear();
}

GameState.prototype.UIclear = function() {
    history.pushState(null, null);
    this.clear();
    this.UIupdate();
}

// Format a move for the move list.
GameState.prototype.formatMove = function(move, n, current) {
    var div = document.createElement("div");
    div.classList.add("move");
    div.setAttribute("id", "move-" + n);
    if (n === current) {
        div.classList.add("current");
    }
    if (move === null) {
        div.innerHTML = "&nbsp;";
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
    numdiv.innerHTML = move.number + '.';
    div.appendChild(numdiv);
    var playerdiv = document.createElement("div");
    playerdiv.classList.add("player");
    playerdiv.innerHTML = move.player;
    div.appendChild(playerdiv);
    var actiondiv = document.createElement("div");
    actiondiv.classList.add("action");
    actiondiv.innerHTML = s;
    div.appendChild(actiondiv);
    return div;
}

// Vertically scroll the contents of the container so that target is
// visible within the container. If smooth=true, animate the scolling
// action.
function makeVisible(target, container, smooth) {
    var trect = target.getBoundingClientRect();
    var crect = container.getBoundingClientRect();
    var oldtop = container.scrollTop;
    var oldleft = container.scrollLeft;
    var rely = trect.y + oldtop;
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

// Scroll the move list so that move i is visible.
GameState.prototype.scroll_movelist = function(i) {
    var item = document.querySelector("#move-"+i);
    if (!item) {
        return;
    }
    var panel = document.getElementById("movelist-panel");
    makeVisible(item, panel, true);
}

// Format the move list.
GameState.prototype.draw_movelist = function() {
    var p = this.movelist_panel;
    p.innerHTML = "";
    p.appendChild(this.formatMove(null, 0, this.currentmove));
    for (var i=0; i<this.movelist.length; i++) {
        var move = this.movelist[i];
        p.appendChild(this.formatMove(move, i+1, this.currentmove));
    }
    this.scroll_movelist(this.currentmove);
}

// Update all UI components that need to be updated as a whole (do not
// support incremental updates). Currently, this is the move list and
// hash. Only functions whose name starts with UI call this. This is
// to ensure that the UI isn't needlessly updated multiple times.
GameState.prototype.UIupdate = function() {
    this.draw_movelist();
    // temporarily disable popstate, to avoid bottomless recursion.
    var old_enable_popstate = enable_popstate;
    enable_popstate = false;
    window.location.replace(this.URLHash());
    enable_popstate = old_enable_popstate;
    input_update(input);
    this.board.rescale();  // because move list might have changed size
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
    var orient = this.board.rotation % 12;
    if (orient < 0) {
        orient += 12;
    }
    if (orient !== 10) {
        acc += "r" + (orient);
    }
    if (this.board.mirrored) {
        acc += "m";
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

// Initialize from URLHash.
GameState.prototype.fromURLHash = function(hash) {
    function parse(s, regex) {
        var matches = s.matchAll(regex).next().value;
        if (!matches) {
            return null;
        } else {
            return {
                match: matches[1],
                rest: matches[2]
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
    
    var parts = hash.split(",");

    // Parse parameters.
    var s = parts[0] ? parts[0] : "";
    var p;
    if ((p = parse(s, /^([1-9][0-9]*x[1-9][0-9]*|[1-9][0-9]*)(.*)$/g)) !== null) {
        dim = Dimension.parse(p.match);
        s = p.rest;
    }
    while ((p = parse(s, /^(r[1-9][0-9]*|m)(.*)$/g)) !== null) {
        switch (p.match[0]) {
        case "r":
            rotation = parseInt(p.match.substring(1));
            break;
        case "m":
            mirrored = true;
            break;
        }
        s = p.rest;
    }
    // If there is an unknown parameter, it and any subsequent
    // parameters are ignored.
    this.clear();
    this.setSize(dim);
    this.setOrientation(rotation, mirrored);
    
    // Parse moves.
    var s = parts[1] ? parts[1] : ""
    var p;
    while ((p = parse(s, /^([a-z]+[1-9][0-9]*|:s|:S|:p|:rb|:rw|:fb|:fw)(.*)$/g)) !== null) {
        var r = this.play(parse_move(p.match));
        if (!r) {
            return;
        }
        s = p.rest;
    }
    var pos = this.currentmove;
    var s = parts[2] ? parts[2] : "";
    var p;
    while ((p = parse(s, /^([a-z]+[1-9][0-9]*|:s|:S|:p|:rb|:rw|:fb|:fw)(.*)$/g)) !== null) {
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
    this.fromURLHash(hash);
    this.UIupdate();
}

// ----------------------------------------------------------------------
// Testing

var main = document.getElementById("board-container");
var board = new Board(new Dimension(11), 9, false);
main.appendChild(board.dom);
board.rescale();
var movelist_panel = document.getElementById("movelist-panel");
var state = new GameState(board, movelist_panel);

// ----------------------------------------------------------------------
// Map buttons

document.getElementById("button-swap-pieces").addEventListener("click", function () {
    state.UIplay(Move.swap_pieces);
});
document.getElementById("button-swap-sides").addEventListener("click", function () {
    state.UIplay(Move.swap_sides);
});
document.getElementById("button-pass").addEventListener("click", function () {
    state.UIplay(Move.pass);
});
document.getElementById("button-resign-black").addEventListener("click", function () {
    state.UIplay(Move.resign(Const.black));
});
document.getElementById("button-resign-white").addEventListener("click", function () {
    state.UIplay(Move.resign(Const.white));
});
document.getElementById("button-rotate-left").addEventListener("click", function () {
    state.UIrotate(-1);
});
document.getElementById("button-rotate-right").addEventListener("click", function () {
    state.UIrotate(1);
});
document.getElementById("button-first").addEventListener("click", function () {
    state.UIfirst();
});
document.getElementById("button-undo").addEventListener("click", function () {
    state.UIundo();
});
document.getElementById("button-redo").addEventListener("click", function () {
    state.UIredo();
});
document.getElementById("button-last").addEventListener("click", function () {
    state.UIlast();
});
document.getElementById("button-clear").addEventListener("click", function () {
    state.UIclear();
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

function inputFocus() {
    var a = document.activeElement;
    if (a === input) {
        return true;
    }
    return false;
}

// Keyboard shortcuts
document.addEventListener("keydown", function(e) {
    // Ignore keyboard input when any input field is in focus.
    if (inputFocus()) {
        return false;
    }
    if (e.keyCode === "S".charCodeAt(0) && e.ctrlKey == false && e.shiftKey == false) {
        document.getElementById("button-swap-pieces").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === "P".charCodeAt(0) && e.ctrlKey == false && e.shiftKey == false) {
        document.getElementById("button-undo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === "N".charCodeAt(0) && e.ctrlKey == false && e.shiftKey == false) {
        document.getElementById("button-redo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === "F".charCodeAt(0) && e.ctrlKey == false && e.shiftKey == false) {
        document.getElementById("button-first").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === "L".charCodeAt(0) && e.ctrlKey == false && e.shiftKey == false) {
        document.getElementById("button-last").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 37 && e.ctrlKey == false && e.shiftKey == false) {
        // Left
        document.getElementById("button-undo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 38 && e.ctrlKey == false && e.shiftKey == false) {
        // Up
        document.getElementById("button-undo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 39 && e.ctrlKey == false && e.shiftKey == false) {
        // Right
        document.getElementById("button-redo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 40 && e.ctrlKey == false && e.shiftKey == false) {
        // Down
        document.getElementById("button-redo").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 36 && e.ctrlKey == false && e.shiftKey == false) {
        // Home
        document.getElementById("button-first").click();
        e.preventDefault();
        return true
    }
    if (e.keyCode === 35 && e.ctrlKey == false && e.shiftKey == false) {
        // End
        document.getElementById("button-last").click();
        e.preventDefault();
        return true
    }
    return false;
});

var enable_popstate = true;

window.addEventListener("popstate", function (e) {
    if (enable_popstate) {
        state.UIfromURLHash(window.location.hash);
    }
});

state.UIfromURLHash(window.location.hash);

//board.dom.classList.add("redblue");

// })();
