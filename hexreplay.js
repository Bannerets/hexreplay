// (function () {

"use strict";

// ----------------------------------------------------------------------
// Constants

function Const() {
}

Const.black = "black";
Const.white = "white";
Const.empty = "empty";
Const.move = "move";
Const.pass = "pass";
Const.swap_pieces = "swap-pieces";
Const.swap_sides = "swap-sides";
Const.resign = "resign";
Const.forfeit = "forfeit";

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

function Dimension(files, ranks) {
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

// ----------------------------------------------------------------------
// Board

// This holds a DOM element to display a board.

function Board(files = 11, ranks = 11, orientation = 9, mirrored = false) {
    var self = this;

    this.files = files;
    this.ranks = ranks;
    this.orientation = orientation;
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
    this.resize();

    window.addEventListener("resize", function () {self.resize()});

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
    this.resize();
    this.restoreContents(dict);
}

// Resize SVG to container. This must be called upon initialization
// (*after* the board element is integrated in the DOM tree, so that
// its size is known), and upon any event that may affect the
// element's size. The window's "resize" event is already handled.
Board.prototype.resize = function() {
    this.svg.setAttribute("width", this.dom.offsetWidth);
    this.svg.setAttribute("height", this.dom.offsetHeight);
}

// Set the logical size of the board. This also clears the board.
Board.prototype.setSize = function(files, ranks) {
    this.files = files;
    this.ranks = ranks;
    this.draw_svg();
    this.resize();
}

Board.prototype.svg_of_board = function() {
    var files = this.files;
    var ranks = this.ranks;
    var orientation = this.orientation;
    var mirrored = this.mirrored;
    
    var theta = -Math.PI * (orientation + 2) / 6;
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
    stop.setAttribute("stop-color", "#ff8080");
    grad.appendChild(stop);
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "30%");
    stop.setAttribute("stop-color", "#ff2020");
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
    grad.setAttribute("r", "0.5");
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "0%");
    stop.setAttribute("stop-color", "#a0a0ff");
    grad.appendChild(stop);
    var stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", "100%");
    stop.setAttribute("stop-color", "#0000a0");
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
    this.setSize(this.ranks, this.files); // also clears the board
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

Board.prototype.mirror_long_diagonal = function() {
    this.mirrored = !this.mirrored;
    this.update();
}

Board.prototype.mirror_short_diagonal = function() {
    this.mirrored = !this.mirrored;
    this.orientation += 6;
    this.update();
}

Board.prototype.mirror_horizontal = function() {
    this.mirrored = !this.mirrored;
    this.orientation = -this.orientation;
    this.update();
}

Board.prototype.mirror_vertical = function() {
    this.mirrored = !this.mirrored;
    this.orientation = 6-this.orientation;
    this.update();
}

Board.prototype.rotate = function(step) {
    if (this.mirrored) {
        this.orientation += step;
    } else {
        this.orientation += step;
    }
    this.update();
}

// ----------------------------------------------------------------------
// Game logic

// A move is either a cell or one of the special moves Move.pass,
// Move.swap_pieces, Move.swap_sides, Move.resign, Move.forfeit.
function Move(cell) {
    this.type = Const.move;
    this.cell = cell;
}

Move.pass = {type: Const.pass};
Move.swap_pieces = {type: Const.swap_pieces};
Move.swap_sides = {type: Const.swap_sides};
Move.resign = function(player) {
    return {
        type: Const.resign,
        player: player
    };
}
Move.forfeit = function(player) {
    return {
        type: Const.forfeit,
        player: player
    };
}

Move.getPlayer = function(move) {
    switch (move.type) {
    case Const.resign:
    case Const.forfeit:
        return move.player;
        break;
    }
    return null;
}

function GameState(board, movelist_panel) {
    self = this;
    this.movelist = [];
    this.currentmove = 0;
    this.board = board;
    this.movelist_panel = movelist_panel;

    // Connect click action.
    this.board.onclick = function(cell) {
        self.play(new Move(cell));
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
    // No legal moves after resigning.
    if (this.resigned() || this.forfeited()) {
        return false;
    }
    switch (move.type) {
    case Const.move:
        if (move.cell.file < 0 || move.cell.file >= board.files) {
            return false;
        }
        if (move.cell.rank < 0 || move.cell.rank >= board.ranks) {
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
    var player = Move.getPlayer(move) || this.currentPlayer();
    this.currentmove += 1;
    var n = this.currentmove;
    this.movelist.push({
        number: n,
        player: player,
        move: move
    });
    this.playBoardMove(n, player, move);
    this.update();
    return true;
}

GameState.prototype.playBoardMove = function(n, player, move) {
    switch (move.type) {
    case Const.move:
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
    case Const.move:
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
    this.update();
    return true;
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
    this.update();
    return true;
}

// Go to the start of the move list.
GameState.prototype.first = function() {
    while (this.currentmove > 0) {
        this.undo();
    }
    return true;
}

// Go to the end of the move list.
GameState.prototype.last = function() {
    while (this.currentmove < this.movelist.length) {
        this.redo();
    }
    return true;
}

// Set the game size. Return true on success and false on failure
// (including when the size is unchanged).
GameState.prototype.setSize = function(files, ranks) {
    if (files < 1 || files > 30 || ranks < 1 || ranks > 30) {
        return false;
    }
    if (this.board.files === files && this.board.ranks === ranks) {
        return false;
    }
    this.board.setSize(files, ranks);
    this.clear();
    return true;
}

// Clear the move list.
GameState.prototype.clear = function() {
    this.movelist = [];
    this.currentmove = 0;
    this.board.clear();
    this.update();
}

// Format a move for the move list.
GameState.prototype.formatMove = function(move, current) {
    var acc = "";
    if (current) {
        acc += '<div class="move current">';
    } else {
        acc += '<div class="move">';
    }
    if (move !== null) {
        var s;
        switch (move.move.type) {
        case Const.move:
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
        acc += move.number + '. ';
        acc += move.player + ' ';
        acc += s;
    } else {
        acc += '&nbsp;';
    }
    acc += '</div>';
    return acc;
}

// Format the move list.
GameState.prototype.draw_movelist = function() {
    var p = this.movelist_panel;
    p.innerHTML = "";
    p.innerHTML += this.formatMove(null, this.currentmove === 0);
    for (var i=0; i<this.movelist.length; i++) {
        var move = this.movelist[i];
        p.innerHTML += this.formatMove(move, i === this.currentmove-1);
    }
}

// Update all UI components.
GameState.prototype.update = function() {
    this.draw_movelist();
    window.location.hash = this.URLHash();
}

// Format a move for the URL string.
GameState.prototype.hashMove = function(move) {
    switch (move.move.type) {
    case Const.move:
        return move.move.cell.toString();
        break;
    case Const.swap_pieces:
        return ".s";
        break;
    case Const.swap_sides:
        return ".S";
        break;
    case Const.pass:
        return ".p";
        break;
    case Const.resign:
        if (move.player === Const.black) {
            return ".rb";
        } else {
            return ".rw";
        }
        break;
    case Const.forfeit:
        if (move.player === Const.black) {
            return ".fb";
        } else {
            return ".fw";
        }
        break;
    }
}

// Construct a local-URL string (the part after '#').
GameState.prototype.URLHash = function() {
    var acc = "";
    acc += new Dimension(this.board.files, this.board.ranks).format();
    var orient = this.board.orientation % 12;
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
    return acc;
}

// ----------------------------------------------------------------------
// Testing

var main = document.getElementById("board-container");
var board = new Board(11, 9, 9, false);
main.appendChild(board.dom);
board.resize();
var movelist_panel = document.getElementById("movelist-panel");
var state = new GameState(board, movelist_panel);

// ----------------------------------------------------------------------
// Map buttons

document.getElementById("button-swap-pieces").addEventListener("click", function () {
    state.play(Move.swap_pieces);
});
document.getElementById("button-swap-sides").addEventListener("click", function () {
    state.play(Move.swap_sides);
});
document.getElementById("button-pass").addEventListener("click", function () {
    state.play(Move.pass);
});
document.getElementById("button-resign-black").addEventListener("click", function () {
    state.play(Move.resign(Const.black));
});
document.getElementById("button-resign-white").addEventListener("click", function () {
    state.play(Move.resign(Const.white));
});
document.getElementById("button-rotate-left").addEventListener("click", function () {
    board.rotate(-1);
    state.update();
});
document.getElementById("button-rotate-right").addEventListener("click", function () {
    board.rotate(1);
    state.update();
});
document.getElementById("button-first").addEventListener("click", function () {
    state.first();
});
document.getElementById("button-undo").addEventListener("click", function () {
    state.undo();
});
document.getElementById("button-redo").addEventListener("click", function () {
    state.redo();
});
document.getElementById("button-last").addEventListener("click", function () {
    state.last();
});
var input = document.getElementById("input-size");
input.addEventListener("keydown", function (event) {
    if (event.keyCode !== 13) {
        return;
    }
    var size = Dimension.parse(input.value);
    if (size !== undefined) {
        state.setSize(size.files, size.ranks);
    }
    input.blur()
});
input.addEventListener("blur", function (event) {
    input_update(input);
});
function input_update(input) {
    var value = new Dimension(state.board.files, state.board.ranks);
    input.value = value.format();
}
input_update(input);

state.play(new Move(new Cell(0,0)));
state.play(new Move(new Cell(1,5)));
state.play(new Move(new Cell(2,2)));
state.play(new Move(new Cell(3,8)));
state.play(new Move(new Cell(4,0)));
state.play(new Move(new Cell(6,2)));

board.dom.classList.add("redblue");

// })();
