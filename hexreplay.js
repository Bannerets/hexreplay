(function () {
    "use strict";

    function svg_of_board(files=11, ranks=11, orientation=0, mirror=false) {
        var theta = -Math.PI * (orientation + 2) / 6;
        var ax = 100 * Math.cos(theta);
        var ay = -100 * Math.sin(theta);
        var bx = 100 * Math.cos(theta - Math.PI / 3);
        var by = -100 * Math.sin(theta - Math.PI / 3);

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
        
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "500px");
        svg.setAttribute("height", "300px");
        svg.setAttribute("viewBox", box.x0.toFixed(0) + " " + box.y0.toFixed(0) + " " + (box.x1-box.x0).toFixed(0) + " " + (box.y1-box.y0).toFixed(0));
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        var svgNS = svg.namespaceURI;
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
        borderblack += "A" + r3 + " " + r3 + " 0 0 0 " + coordstr(0, 0, 0, -r, 0);
        for (var i=0; i<files; i++) {
            borderblack += "L" + coordstr(i, 0, 0, -1, 0);
            borderblack += "L" + coordstr(i, 0, 0, 0, -1);
        }
        borderblack += "L" + coordstr(files-1, 0, 0.5, 0, -0.5);
        borderblack += "L" + coordstr(files-1, 0, r2, 0, -r2);
        borderblack += "A" + r3 + " " + r3 + " 0 0 0 " + coordstr(files-1, 0, 0, 0, -r);
        borderblack += "z";

        borderblack += "M" + coordstr(files-1, ranks-1, 0, 0, r);
        borderblack += "A" + r3 + " " + r3 + " 0 0 0 " + coordstr(files-1, ranks-1, 0, r, 0);
        for (var i=0; i<files; i++) {
            borderblack += "L" + coordstr(files-1-i, ranks-1, 0, 1, 0);
            borderblack += "L" + coordstr(files-1-i, ranks-1, 0, 0, 1);
        }
        borderblack += "L" + coordstr(0, ranks-1, -0.5, 0, 0.5);
        borderblack += "L" + coordstr(0, ranks-1, -r2, 0, r2);
        borderblack += "A" + r3 + " " + r3 + " 0 0 0 " + coordstr(0, ranks-1, 0, 0, r);
        borderblack += "z";
        
        border.setAttribute("d", borderblack);
        border.setAttribute("stroke", "#000000");
        border.setAttribute("stroke-width", "5");
        border.setAttribute("fill", "#000000");
        g.appendChild(border);
        
        var border = document.createElementNS(svgNS, "path");
        var borderwhite = "";
        borderwhite += "M" + coordstr(0, 0, -r, 0, 0);
        borderwhite += "A" + r3 + " " + r3 + " 0 0 1 " + coordstr(0, 0, 0, -r, 0);
        for (var i=0; i<ranks; i++) {
            borderwhite += "L" + coordstr(0, i, 0, -1, 0);
            borderwhite += "L" + coordstr(0, i, -1, 0, 0);
        }
        borderwhite += "L" + coordstr(0, ranks-1, -0.5, 0, 0.5);
        borderwhite += "L" + coordstr(0, ranks-1, -r2, 0, r2);
        borderwhite += "A" + r3 + " " + r3 + " 0 0 1 " + coordstr(0, ranks-1, -r, 0, 0);
        borderwhite += "z";

        borderwhite += "M" + coordstr(files-1, ranks-1, r, 0, 0);
        borderwhite += "A" + r3 + " " + r3 + " 0 0 1 " + coordstr(files-1, ranks-1, 0, r, 0);
        for (var i=0; i<ranks; i++) {
            borderwhite += "L" + coordstr(files-1, ranks-1-i, 0, 1, 0);
            borderwhite += "L" + coordstr(files-1, ranks-1-i, 1, 0, 0);
        }
        borderwhite += "L" + coordstr(files-1, 0, 0.5, 0, -0.5);
        borderwhite += "L" + coordstr(files-1, 0, r2, 0, -r2);
        borderwhite += "A" + r3 + " " + r3 + " 0 0 1 " + coordstr(files-1, 0, r, 0, 0);
        borderwhite += "z";

        border.setAttribute("d", borderwhite);
        border.setAttribute("stroke", "#000000");
        border.setAttribute("stroke-width", "5");
        border.setAttribute("fill", "#ffffff");
        g.appendChild(border);
        
        // Hexes
        var path = document.createElementNS(svgNS, "path");
        var hexes = "";
        for (var rank=0; rank<ranks; rank++) {
            for (var file=0; file<files; file++) {
                hexes += "M" + coordstr(file, rank, 0, -1, 0);
                hexes += "L" + coordstr(file, rank, 0, 0, -1);
                hexes += " " + coordstr(file, rank, 1, 0, 0);
                hexes += " " + coordstr(file, rank, 0, 1, 0);
                hexes += " " + coordstr(file, rank, 0, 0, 1);
                hexes += " " + coordstr(file, rank, -1, 0, 0);
                hexes += "z";
            }
        }
        path.setAttribute("d", hexes);
        path.setAttribute("stroke", "#000000");
        path.setAttribute("stroke-width", "5");
        path.setAttribute("fill", "#ff0000");
        path.setAttribute("fill", "none");
        g.appendChild(path);

        return svg;
    }

    var boardarea = document.getElementById("boardarea");
    var svg = svg_of_board(6, 5, 10);
    boardarea.appendChild(svg);

})();
