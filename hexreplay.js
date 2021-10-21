(function () {
    "use strict";

    function fileToString(x) {
        if (x < 0) {
            return "-" + this.fileToString(-1-x);
        } else if (x < 26) {
            return String.fromCharCode(97 + x);
        } else {
            var rest = this.fileToString(Math.floor(x/26 - 1));
            var last = String.fromCharCode(97 + (x % 26));
            return rest + last;
        }
    }
    
    function rankToString(x) {
        return (x+1).toString();
    }
    
    function cellname(file, rank) {
        return fileToString(file) + rankToString(rank);
    }
        
    function svg_of_board(files=11, ranks=11, orientation=0, mirror=false) {
        var theta = -Math.PI * (orientation + 2) / 6;
        if (!mirror) {
            var ax = 100 * Math.cos(theta);
            var ay = -100 * Math.sin(theta);
            var bx = 100 * Math.cos(theta - Math.PI / 3);
            var by = -100 * Math.sin(theta - Math.PI / 3);
        } else {
            var ax = 100 * Math.cos(theta - Math.PI / 3);
            var ay = -100 * Math.sin(theta - Math.PI / 3);
            var bx = 100 * Math.cos(theta);
            var by = -100 * Math.sin(theta);
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
        stop.setAttribute("offset", "0%");
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
        var r = 1.2;
        var r2 = r / Math.sqrt(3);
        var r3 = r * Math.sqrt(1/3) * 100;

        var border = document.createElementNS(svgNS, "path");
        var borderblack = "";
        borderblack += "M" + coordstr(0, 0, 0, 0, -r);
        borderblack += "A" + r3.toFixed(0) + " " + r3.toFixed(0) + " 0 0 " + (mirror ? "1" : "0") + " " + coordstr(0, 0, 0, -r, 0);
        for (var i=0; i<files; i++) {
            borderblack += "L" + coordstr(i, 0, 0, -1, 0);
            borderblack += "L" + coordstr(i, 0, 0, 0, -1);
        }
        borderblack += "L" + coordstr(files-1, 0, 0.5, 0, -0.5);
        borderblack += "L" + coordstr(files-1, 0, r2, 0, -r2);
        borderblack += "A" + r3.toFixed(0) + " " + r3.toFixed(0) + " 0 0 " + (mirror ? "1" : "0") + " " + coordstr(files-1, 0, 0, 0, -r);
        borderblack += "z";

        borderblack += "M" + coordstr(files-1, ranks-1, 0, 0, r);
        borderblack += "A" + r3.toFixed(0) + " " + r3.toFixed(0) + " 0 0 " + (mirror ? "1" : "0") + " " + coordstr(files-1, ranks-1, 0, r, 0);
        for (var i=0; i<files; i++) {
            borderblack += "L" + coordstr(files-1-i, ranks-1, 0, 1, 0);
            borderblack += "L" + coordstr(files-1-i, ranks-1, 0, 0, 1);
        }
        borderblack += "L" + coordstr(0, ranks-1, -0.5, 0, 0.5);
        borderblack += "L" + coordstr(0, ranks-1, -r2, 0, r2);
        borderblack += "A" + r3.toFixed(0) + " " + r3.toFixed(0) + " 0 0 " + (mirror ? "1" : "0") + " " + coordstr(0, ranks-1, 0, 0, r);
        borderblack += "z";
        
        border.setAttribute("d", borderblack);
        border.classList.add("black-border");
        g.appendChild(border);
        
        var border = document.createElementNS(svgNS, "path");
        var borderwhite = "";
        borderwhite += "M" + coordstr(0, 0, -r, 0, 0);
        borderwhite += "A" + r3.toFixed(0) + " " + r3.toFixed(0) + " 0 0 " + (mirror ? "0" : "1") + " " + coordstr(0, 0, 0, -r, 0);
        for (var i=0; i<ranks; i++) {
            borderwhite += "L" + coordstr(0, i, 0, -1, 0);
            borderwhite += "L" + coordstr(0, i, -1, 0, 0);
        }
        borderwhite += "L" + coordstr(0, ranks-1, -0.5, 0, 0.5);
        borderwhite += "L" + coordstr(0, ranks-1, -r2, 0, r2);
        borderwhite += "A" + r3.toFixed(0) + " " + r3.toFixed(0) + " 0 0 " + (mirror ? "0" : "1") + " " + coordstr(0, ranks-1, -r, 0, 0);
        borderwhite += "z";

        borderwhite += "M" + coordstr(files-1, ranks-1, r, 0, 0);
        borderwhite += "A" + r3.toFixed(0) + " " + r3.toFixed(0) + " 0 0 " + (mirror ? "0" : "1") + " " + coordstr(files-1, ranks-1, 0, r, 0);
        for (var i=0; i<ranks; i++) {
            borderwhite += "L" + coordstr(files-1, ranks-1-i, 0, 1, 0);
            borderwhite += "L" + coordstr(files-1, ranks-1-i, 1, 0, 0);
        }
        borderwhite += "L" + coordstr(files-1, 0, 0.5, 0, -0.5);
        borderwhite += "L" + coordstr(files-1, 0, r2, 0, -r2);
        borderwhite += "A" + r3.toFixed(0) + " " + r3.toFixed(0) + " 0 0 " + (mirror ? "0" : "1") + " " + coordstr(files-1, 0, r, 0, 0);
        borderwhite += "z";

        border.setAttribute("d", borderwhite);
        border.classList.add("white-border");
        g.appendChild(border);
        
        // Clickable cells and stones
        for (var rank=0; rank<ranks; rank++) {
            for (var file=0; file<files; file++) {
                var g1 = document.createElementNS(svgNS, "g");
                g1.classList.add("cellgroup");
                
                var path = document.createElementNS(svgNS, "path");
                path.setAttribute("d", hexpath(file, rank));
                path.setAttribute("id", cellname(file, rank));
                path.classList.add("cell");
                g1.appendChild(path);
                var tooltip = document.createElementNS(svgNS, "title");
                tooltip.innerHTML = cellname(file, rank);
                g1.appendChild(tooltip);

                var stone = document.createElementNS(svgNS, "circle");
                var xy = coord(file, rank);
                stone.setAttribute("cx", xy.x);
                stone.setAttribute("cy", xy.y);
                stone.setAttribute("r", "41");
                stone.classList.add("black-stone");
                g1.appendChild(stone);

                var stone = document.createElementNS(svgNS, "circle");
                var xy = coord(file, rank);
                stone.setAttribute("cx", xy.x);
                stone.setAttribute("cy", xy.y);
                stone.setAttribute("r", "40");
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
            text.innerHTML = rankToString(rank);
            g.appendChild(text);
        }
        for (var rank=0; rank<ranks; rank++) {
            var xy = coord(files+0.1, rank);
            var text = document.createElementNS(svgNS, "text");
            text.classList.add("label");
            text.setAttribute("x", xy.x);
            text.setAttribute("y", xy.y + 10);
            text.innerHTML = rankToString(rank);
            g.appendChild(text);
        }
        for (var file=0; file<files; file++) {
            var xy = coord(file, -1.1);
            var text = document.createElementNS(svgNS, "text");
            text.classList.add("label");
            text.setAttribute("x", xy.x);
            text.setAttribute("y", xy.y + 10);
            text.innerHTML = fileToString(file);
            g.appendChild(text);
        }
        for (var file=0; file<files; file++) {
            var xy = coord(file, ranks+0.1);
            var text = document.createElementNS(svgNS, "text");
            text.classList.add("label");
            text.setAttribute("x", xy.x);
            text.setAttribute("y", xy.y + 10);
            text.innerHTML = fileToString(file);
            g.appendChild(text);
        }
        
        return svg;
    }

    var boardarea = document.getElementById("boardarea");
    var svg = svg_of_board(6, 5, 10, false);
    svg.setAttribute("id", "board");
    boardarea.appendChild(svg);

    // Resize SVG to container.
    function resize_svg() {
        var svg = document.getElementById("board");
        var container = document.getElementById("boardarea");
        svg.setAttribute("width", container.offsetWidth);
        svg.setAttribute("height", container.offsetHeight);
    }

    resize_svg();

    window.addEventListener("resize", resize_svg);

    // Testing clicks
    document.addEventListener("click", function(event) {
        console.log(event.target);
        if (!event.target.matches(".cell")) {
            return;
        }
        console.log("cell click: " + event.target.id);
    }, false);

    // Testing stones
    document.getElementById("a3").parentElement.classList.add("black");
    document.getElementById("b2").parentElement.classList.add("white");
    document.getElementById("c1").parentElement.classList.add("black");
    
})();
