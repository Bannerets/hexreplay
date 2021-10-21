// (function () {

"use strict";

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
    if (s.length == 0) {
        throw "Cell.stringToFile: " + s;
    }
    if (s[0] == "-") {
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
// Board

// This holds a DOM element to display a board.

function Board(files = 11, ranks = 11, orientation = 9, mirror = false) {
    var self = this;

    this.files = files;
    this.ranks = ranks;
    this.orientation = orientation;
    this.mirror = mirror;

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
    this.update();

    window.addEventListener("resize", function () {self.resize()});

    this.dom.addEventListener("click", function(event) {
        var cell = event.target.closest(".cell");
        if (cell) {
            self.onclick(Cell.fromString(cell.id));
        }
    });
}

Board.prototype.update = function() {
    // Delete old contents.
    this.dom.innerHTML = "";
    
    // Create new svg element.
    this.svg = this.svg_of_board();

    this.dom.appendChild(this.svg);
}

// Resize SVG to container. This must be called upon initialization
// (*after* the board element is integrated in the DOM tree, so that
// its size is known), and upon any event that may affect the
// element's size. The window's "resize" event is already handled.
Board.prototype.resize = function() {
    this.svg.setAttribute("width", this.dom.offsetWidth);
    this.svg.setAttribute("height", this.dom.offsetHeight);
}

Board.prototype.svg_of_board = function() {
    var files = this.files;
    var ranks = this.ranks;
    var orientation = this.orientation;
    var mirror = this.mirror;
    
    var theta = -Math.PI * (orientation + 2) / 6;
    if (!mirror) {
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
        if (len == 0) { // nonsense
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
    borderblack += arc(r4, mirror, 0, 0, 0, -r-e/2, 0);
    for (var i=0; i<files; i++) {
        borderblack += "L" + coordstr(i, 0, 0, -1, 0);
        borderblack += "L" + coordstr(i, 0, 0, 0, -1);
    }
    borderblack += "L" + coordstr(files-1, 0, 0.5, 0, -0.5);
    borderblack += "L" + coordstr(files-1, 0, r2, 0, -r2);
    borderblack += arc(r3, mirror, files-1, 0, e2/2, 0, -r+e2/4);
    borderblack += "z";

    borderblack += "M" + coordstr(files-1, ranks-1, 0, e, r-e/2);
    borderblack += arc(r4, mirror, files-1, ranks-1, 0, r+e/2, 0);
    for (var i=0; i<files; i++) {
        borderblack += "L" + coordstr(files-1-i, ranks-1, 0, 1, 0);
        borderblack += "L" + coordstr(files-1-i, ranks-1, 0, 0, 1);
    }
    borderblack += "L" + coordstr(0, ranks-1, -0.5, 0, 0.5);
    borderblack += "L" + coordstr(0, ranks-1, -r2, 0, r2);
    borderblack += arc(r3, mirror, 0, ranks-1, -e2/2, 0, r-e2/4);
    borderblack += "z";
    
    border.setAttribute("d", borderblack);
    border.classList.add("black-border");
    g.appendChild(border);
    
    var border = document.createElementNS(svgNS, "path");
    var borderwhite = "";
    borderwhite += "M" + coordstr(0, 0, -r+e/2, -e, 0);
    borderwhite += arc(r4, !mirror, 0, 0, 0, -r-e/2, 0);
    for (var i=0; i<ranks; i++) {
        borderwhite += "L" + coordstr(0, i, 0, -1, 0);
        borderwhite += "L" + coordstr(0, i, -1, 0, 0);
    }
    borderwhite += "L" + coordstr(0, ranks-1, -0.5, 0, 0.5);
    borderwhite += "L" + coordstr(0, ranks-1, -r2, 0, r2);
    borderwhite += arc(r3, !mirror, 0, ranks-1, -r+e2/4, 0, e2/2);
    borderwhite += "z";

    borderwhite += "M" + coordstr(files-1, ranks-1, r-e/2, e, 0);
    borderwhite += arc(r4, !mirror, files-1, ranks-1, 0, r+e/2, 0);
    for (var i=0; i<ranks; i++) {
        borderwhite += "L" + coordstr(files-1, ranks-1-i, 0, 1, 0);
        borderwhite += "L" + coordstr(files-1, ranks-1-i, 1, 0, 0);
    }
    borderwhite += "L" + coordstr(files-1, 0, 0.5, 0, -0.5);
    borderwhite += "L" + coordstr(files-1, 0, r2, 0, -r2);
    borderwhite += arc(r3, !mirror, files-1, 0, r-e2/4, 0, -e2/2);
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
            if (Math.min(file, rank, files-file-1, ranks-rank-1) % 2 == 1) {
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

// Cell values
Board.black = "black";
Board.white = "white";
Board.empty = "empty";

// Set the cell's content to value, which is Board.black, Board.white, or Board.empty.
Board.prototype.setStone = function(cell, value) {
    var cell = document.getElementById(cell.toString());
    if (cell) {
        cell.classList.remove("black");
        cell.classList.remove("white");
        if (value == Board.black) {
            cell.classList.add("black");
        } else if (value == Board.white) {
            cell.classList.add("white");
        }
    }
}

// ----------------------------------------------------------------------
// Game logic

// A move is either a cell or one of the special moves "pass",
// "swap-pieces", "swap-sides", "resign".


// ----------------------------------------------------------------------
// Testing

var main = document.getElementById("main");
var board = new Board(11, 11, 9, false);
main.appendChild(board.dom);

board.resize();

// Clicks
board.onclick = function(cell) {
    console.log("Clicked " + cell);
}

// Stones
board.setStone(new Cell(0,0), Board.black);
board.setStone(new Cell(1,1), Board.white);
board.setStone(new Cell(1,2), Board.black);
board.setStone(new Cell(1,3), Board.white);

// })();
