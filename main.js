!function() {

var diameter = 960;

var width = diameter,
    height = width - 100;

var color = d3.scale.category10().domain(d3.range(10));
var yrate = d3.scale.linear()
    .domain([1, 5])
    .range([1.5, .9]);

var tree = d3.layout.tree()
    .size([360, 100])
    .separation(function(a, b) {
        if (! a.depth) { return 0; }
        return (a.parent == b.parent ? 1 : 1.5) / a.depth * yrate(a.depth + 1);
    });

var diagonal = d3.svg.diagonal.radial()
    .projection(function(d) {
        return [
            d.y * (d.depth ? yrate(d.depth + 1) : 1),
            d.x  * Math.PI/ 180 + Math.PI / 2 - Math.PI * 2 / 3
        ];
    });

var radius = d3.scale.pow().exponent(.6)
    .domain([0, 100])
    .range([18, 80]);

var svg = d3.select("body").append("svg")
    .attr("width", diameter)
    .attr("height", height);

var $year = d3.select('body').append('h1')
    .attr('class', 'year');

var svg_guy = svg.append("g")
    .attr("transform", "translate(" + diameter / 2 + "," + (diameter / 2 - 40) + ")");
var svg_guy_link = svg_guy.append('g');
var svg_guy_node = svg_guy.append('g');

var svg_year = svg.append("g");

var nodes,
    links;

var circle;

var nodesById = {};
d3.csv("all.csv?t=" + new Date, function dottype(d) {
    if (! d.id) return null;

    nodesById[d.id] = d;

    d.birth_year = parseInt(d.birth.match(/^(\d+)/)[1], 10);

    if (d.to_date) {
        d.to_date_year = parseInt(d.to_date.match(/^(\d+)/)[1], 10);
    }

    if (d.to) {
        nodesById[d.to]._love = d;

        return null;
    }

    if (d.parent) {
        d.parentId = d.parent;
        delete d.parent;
        d._parent = nodesById[d.parentId];
        d.level = d._parent.level + 1;
    } else {
        d.level = 1;
    }

    d.color = d3.rgb(color(d.level)).brighter(1.8);

    return d;
}, function(error, guys) {
    // console.log(error, guys);

    nodes = guys;

    setUpYears();
});


function pos(d) {
    var a = (d.x || 0) * Math.PI / 180 - Math.PI * 2 / 3,
        r = (d.y || 0) * yrate(d.depth + 1);

    var x = r * Math.cos(a),
        y = r * Math.sin(a);

    // console.log(simpleName(d), 'x,y: ', x, y, 'a,r:', a, r, 'o.x,o.y: ', d.x, d.y);

    return [x, y];
}


function prepareNodes(nodes, year) {
    var count = 0;
    var root = nodes[0];

    var maxLevel = 1;

    nodes.forEach(function(node) {
        node.age = year - node.birth_year + 1;

        delete node.parent;
        delete node.depth;
        delete node.x;
        delete node.y;

        var c;
        if (c = node.children) {
            c.length = 0;
        }

        if (node.level > maxLevel) {
            maxLevel = node.level;
        }

        count++;
        if (node._love && node._love.to_date_year <= year) {
            count++;
            node.love = node._love;
        } else {
            delete node.love;
        }
    });

    tree.size([360, 90 * maxLevel]);

    nodes.forEach(function(node) {
        if (node._parent) {
            if (! node._parent.children) { node._parent.children = []; }

            node._parent.children.push(node);
        }
    });

    nodes.forEach(function(node) {
        var c;
        if ((c = node.children) && (c.length > 1)) {
            c.sort(function(a, b) {
                return a.age > b.age ? -1 : 1;
            });
        }
    });

    return {
        root: root,
        count: count
    };
}

function render(nodes, year) {
    // console.log('render', nodes, year);

    var meta = prepareNodes(nodes, year),
        root = meta.root,
        count = meta.count;

    $year.text(year + ' (' + count + ')');

    var _nodes = tree.nodes(root),
        links = tree.links(_nodes);

    links.forEach(function(link) {
        link.id = [link.source.id, link.target.id].join('~');
    });

    var link = svg_guy_link.selectAll(".link")
        .data(links, function(d) { return d.id; });

    link.exit().remove();

    link.enter().append("path")
        .attr("class", "link");

    link.attr("d", diagonal);

    var node = svg_guy_node.selectAll(".node")
        .data(_nodes, function(d) { return d.id; });

    node.exit().remove();

    var nodeEnter = node.enter().append("g")
        .attr("class", "node")

    nodeEnter.append("circle")
        .style("fill", function(d) { return d.color; })
        .style("opacity", 1e-6)
        .transition()
            .style('opacity', .8);

    nodeEnter.append("image")
        .attr("xlink:href", "t.jpg")
        .attr("class", "photo")
        .attr("transform", function(d) { return "translate(-14)"; })
        .attr("height", "20px")
        .attr("width", "20px")
        .attr("y", 5);

    nodeEnter.append("text")
        .attr("dy", ".31em")
        .attr("transform", function(d) { return "translate(-12)"; })

    node.attr("transform", function(d) { return "translate(" + pos(d).join(',') + ")"; });

    node.selectAll('circle')
        .attr("r", function(d) { return radius(d.age); });

    node.selectAll('text').text(function(d) {
        var name = simpleName(d);

        if (d.love) {
            name += ' + ' + simpleName(d.love);
        }

        return name;
    });
    // .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })

}

function simpleName(d) {
    var fullname = d.first + d.last;

    if (fullname.length <= 2) return fullname;

    return d.last;
}

function setUpYears() {

    var moving,
        currentValue = 1929,
        targetValue = currentValue + 5,
        alpha = .2,
        padding = 40;

    var x = d3.scale.linear()
        .domain([1929, 2013])
        .range([padding, width - padding * 2])
        .clamp(true);

    var brush = d3.svg.brush()
        .x(x)
        .extent([0, 0])
        .on("brush", brushed);

    var axisH = 40,
        axisY = height - axisH;

    svg_year
        .attr("transform", "translate(0," + axisY + ")");

    svg_year.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + padding + ",0)")
        .call(d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickFormat(function(d) { return d; })
            .tickSize(0)
            .tickPadding(12)
        )
        .select(".domain")
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
            .attr("class", "halo");

    var slider = svg_year.append("g")
        .attr("class", "slider")
        .call(brush);

    slider.selectAll(".extent,.resize")
        .remove();

    slider.select(".background")
        .attr("height", axisH)
        .attr("transform", "translate(" + [padding, -axisH / 2].join(',') + ")");

    var handle = slider.append("circle")
        .attr("class", "handle")
        .attr("transform", "translate(" + [padding, 0].join(',') + ")")
        .attr("r", 9);

    slider
        .call(brush.event)
        .transition() // gratuitous intro!
            .duration(750)
            .call(brush.extent([targetValue, targetValue]))
            .call(brush.event);

    function brushed() {
        if (d3.event.sourceEvent) { // not a programmatic event
            targetValue = x.invert(d3.mouse(this)[0] - padding);
            move();
        } else {
            currentValue = brush.extent()[0];

            handle.attr("cx", x(currentValue));

            var year = Math.round(currentValue);

            goYearWhenNeed(year, currentValue == targetValue);
        }
    }

    var lastShowTime = 0,
        lastShowYear = 0;

    function goYearWhenNeed(year, ignoreTime) {
        var now;

        if (lastShowYear !== year) {
            if (ignoreTime || ((now = +new Date) - lastShowTime > 300)) {
                lastShowTime = now;
                lastShowYear = year;

                goYear(year);
            }
        }
    }

    function goYear(year) {
        render(nodes.filter(function(node, idx) {
            if (idx === 0) {
                return true;
            }

            return node.birth_year <= year;
        }), year);
    }

    function move() {
        if (moving) return false;

        moving = true;
        d3.timer(function() {
            var diff = targetValue - currentValue;
            moving = Math.abs(diff) >= 1;

            currentValue = moving
                ? (currentValue + diff * alpha)
                : targetValue;

            slider
                .call(brush.extent([currentValue, currentValue]))
                .call(brush.event);

            var year = Math.round(currentValue),
                now;

            // console.log('xx', targetValue, currentValue, diff, moving, year);

            goYearWhenNeed(year, !moving);

            return !moving;
        });
    }

}

}();

