// puzzle.js - javascript code for Jochen's sliding picture puzzle
// Copyright 2010 Jochen Voss <voss@seehuhn.de>
// http://seehuhn.de/pages/webpuzzle
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

function measure(elem) {
    var short_names = {
        mt: 'margin-top',
        btw: 'border-top-width',
        pt: 'padding-top',
        mr: 'margin-right',
        brw: 'border-right-width',
        pr: 'padding-right',
        mb: 'margin-bottom',
        bbw: 'border-bottom-width',
        pb: 'padding-bottom',
        ml: 'margin-left',
        blw: 'border-left-width',
        pl: 'padding-left'
    };
    var style = window.getComputedStyle(elem, null);
    var sum = 0;
    for (var i = 1; i < arguments.length; ++i) {
        var arg = arguments[i];
        var expansion = short_names[arg];
        var name = (expansion == undefined ? arg : expansion);
        sum += parseFloat(style.getPropertyValue(name));
    }
    return sum;
}

function setup_drag(elem, get_pos, set_pos, done_cb, cursor) {
    function down_cb(e) {
        var pos = get_pos();
        var dx = e.pageX - pos[0];
        var dy = e.pageY - pos[1];
        function move_cb(e) {
            set_pos(e.pageX - dx, e.pageY - dy);
            e.stopPropagation();
            e.preventDefault();
        }
        function up_cb(e) {
            document.removeEventListener('mousemove', move_cb, true);
            document.removeEventListener('mouseup', up_cb, true);
            if (cursor) document.body.style.cursor = 'default';
            if (done_cb) done_cb();
        }
        document.addEventListener('mousemove', move_cb, true);
        document.addEventListener('mouseup', up_cb, true);
        if (cursor) document.body.style.cursor = 'move';
        e.stopPropagation();
        e.preventDefault();
    }
    elem.addEventListener('mousedown', down_cb, false);
}

function dialog(title, body, buttons, callback) {
    var dialog = document.createElement('div');
    dialog.className = 'dialog';
    var str = '<div class="titlebar"><h1>' + title + '</h1></div>\n';
    str += body + '\n';
    str += '<p class="buttons">';
    dialog.innerHTML = str;

    var pb = dialog.lastChild;
    function get_cb(val) {
        return function() {
            dialog.parentNode.removeChild(dialog);
            callback(val);
        };
    }
    for (var i = 0; i < buttons.length; ++i) {
        var b = document.createElement('button');
        b.setAttribute('type', 'button');
        b.innerHTML = buttons[i];
        b.onclick = get_cb(buttons[i]);
        pb.appendChild(b);
    }

    document.body.appendChild(dialog);
    pb.lastChild.focus();
    setup_drag(dialog.firstChild,
               function() { return [dialog.offsetLeft, dialog.offsetTop]; },
               function(x, y) { dialog.style.left = x + 'px';
                                dialog.style.top = y + 'px'; });
}

var slide_tab = [0.1, 0.2, 0.6, 0.9, 1.0];
function slide_elem(elem, x1, y1) {
    var x0 = elem.offsetLeft;
    var y0 = elem.offsetTop;
    var i = 0;

    function move_it() {
        var q = slide_tab[i];
        elem.style.left = (q * x1 + (1 - q) * x0) + 'px';
        elem.style.top = (q * y1 + (1 - q) * y0) + 'px';
        i += 1;
        return i < slide_tab.length;
    }
    function move_cb() {
        if (move_it()) setTimeout(move_cb, 10);
    }
    move_cb();

    try {
        sound.pause();
        sound.currentTime = 0;
        sound.play();
    } catch (err) {
    }
}

function random_permutation(N) {
    var pos = new Array();
    pos.push(0);
    for (var i = 1; i < N; ++i) {
        var j = Math.floor(Math.random() * (i + 1));
        if (j < i) {
            pos.push(pos[j]);
            pos[j] = i;
        } else {
            pos.push(i);
        }
    }
    return pos;
}

function parity(perm) {
    var res = 1;
    for (var i = 1; i < perm.length; ++i) {
        for (var j = 0; j < i; ++j) {
            if (perm[i] < perm[j]) res = -res;
        }
    }
    return res;
}

function is_identity(pos) {
    for (i in pos) {
        if (pos[i] != i) return false;
    }
    return true;
}

/**
 * Instances of Jochen's sliding picture puzzle.
 * @param {HTMLImageElement} puzzle   The image object to use for the tiles.
 * @param {number} mn                 Approximate number of tiles to use.
 * @param {function(boolean)} callback     Callback to be run at the
 *           end of a level.  The callback function receives a single
 *           argument which is true is the next level should be
 *           started and false if the user aborted the game.
 * @constructor
 */
function Puzzle(puzzle, mn, callback) {
    this.callback = callback;
    var w = measure(puzzle, 'width');
    var h = measure(puzzle, 'height');

    var n = Math.round(Math.sqrt(mn * h / w));
    if (n < 2) n = 2;
    var m = Math.round(mn / n);
    if (m < 2) m = 2;
    var N = m * n;
    this.m = m;
    this.n = n;

    var pos, missing;
    function parity2(k0, k1) {
        var j0 = k0 % m;
        var i0 = (k0 - j0) / m;
        var j1 = k1 % m;
        var i1 = (k1 - j1) / m;
        return (i1 - i0 + j1 - j0) % 2 ? -1 : 1;
    }
    while (true) {
        pos = random_permutation(N);
        if (is_identity(pos)) continue;
        missing = Math.floor(Math.random() * N);
        if (parity(pos) == parity2(missing, pos[missing])) break;
    }
    this.missing = missing;
    this.pos = pos;

    this.dx = Math.floor((w - 2) / m);
    this.dy = Math.floor((h - 2) / n);
    var x0 = Math.floor((w - m * this.dx) / 2);
    var y0 = Math.floor((h - n * this.dy) / 2);

    var xbase = puzzle.offsetLeft + measure(puzzle, 'blw', 'pl');
    var ybase = puzzle.offsetTop + measure(puzzle, 'btw', 'pt');

    this.src = puzzle.src;
    puzzle.style.display = "none";

    this.canvas = document.createElement('div');
    this.canvas.className = 'canvas';
    this.canvas.style.left = xbase + 'px';
    this.canvas.style.top = ybase + 'px';
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    puzzle.parentNode.appendChild(this.canvas);
    this.canvas.onmousedown = function(e) {
        // avoid selecting tiles with the mouse by mistake
        e.stopPropagation();
        e.preventDefault();
    };

    for (var k = 0; k < N; ++k) {
        if (k == this.missing) continue;

        var tile = document.createElement('img');
        tile.className = 'tile';
        tile.id = 't' + k;
        tile.style.width = w + 'px';
        tile.style.height = h + 'px';
        tile.src = this.src;
        var j = k % this.m;
        var i = (k - j) / this.m;
        var l = x0 + j * this.dx;
        var r = x0 + (j + 1) * this.dx - 2;
        var t = y0 + i * this.dy;
        var b = y0 + (i + 1) * this.dy - 2;
        tile.style.clip = 'rect(' + t + 'px,' + r + 'px,' +
                                    b + 'px,' + l + 'px)';
        this.canvas.appendChild(tile);

        this.place_tile(k, pos[k], false);
    }
    this.arm();
}

/**
 * Place a puzzle tile on the screen.
 * @param {number} k      The index of the tile.
 * @param {number} pos    The new location of the tile.
 * @param {boolean} slide_flag   Whether to slide the tile from it
 *             current position to the new position.
 */
Puzzle.prototype.place_tile = function(k, pos, slide_flag) {
    var tile = document.getElementById('t' + k);
    var j0 = k % this.m;
    var i0 = (k - j0) / this.m;
    var j1 = pos % this.m;
    var i1 = (pos - j1) / this.m;
    if (slide_flag) {
        slide_elem(tile, (j1 - j0) * this.dx, (i1 - i0) * this.dy);
    } else {
        tile.style.left = (j1 - j0) * this.dx + 'px';
        tile.style.top = (i1 - i0) * this.dy + 'px';
    }
};

/**
 * Start the animation which moves a tile into the free slot.
 * @param {number} k    The index of the tile to move.
 */
Puzzle.prototype.move = function(k) {
    var tmp = this.pos[this.missing];
    this.pos[this.missing] = this.pos[k];
    this.pos[k] = tmp;
    this.place_tile(k, tmp, true);
    if (true || is_identity(this.pos)) {
        this.disarm();
    } else {
        this.arm();
    }
};

/**
 * Install the event handlers for a level.
 */
Puzzle.prototype.arm = function() {
    var m = this.m;
    var N = this.m * this.n;
    var pos0 = this.pos[this.missing];
    var j0 = pos0 % m;
    var i0 = (pos0 - j0) / m;
    for (var k = 0; k < N; ++k) {
        if (k == this.missing) continue;

        var tile = document.getElementById('t' + k);
        var pos = this.pos[k];
        var j = pos % m;
        var i = (pos - j) / m;
        var obj = this;
        var cb = (function(k) {
            return function(e) { obj.move(k) };
        })(k);

        if (i == i0 && j + 1 == j0) {
            tile.style.cursor = 'url(curright.png) 30 16, pointer';
            tile.onclick = cb;
        } else if (i + 1 == i0 && j == j0) {
            tile.style.cursor = 'url(curdown.png) 18 30, pointer';
            tile.onclick = cb;
        } else if (i == i0 && j - 1 == j0) {
            tile.style.cursor = 'url(curleft.png) 2 17, pointer';
            tile.onclick = cb;
        } else if (i - 1 == i0 && j == j0) {
            tile.style.cursor = 'url(curup.png) 17 2, pointer';
            tile.onclick = cb;
        } else {
            tile.style.cursor = 'auto';
            tile.onclick = null;
        }
    }
};

/**
 * Uninstall the event handlers for a level.
 */
Puzzle.prototype.disarm = function() {
    for (var k = 0; k < this.N; ++k) {
        if (k == this.missing) continue;
        var tile = document.getElementById('t' + k);
        tile.style.cursor = 'auto';
        tile.onclick = null;
    }
    this.fade();
};

/**
 * Set the transparency of the canvas which obscures the background image.
 * @param {number} a    The new alpha value (20=opaque, 0=transparent).
 */
Puzzle.prototype.set_alpha = function(a) {
    this.fade_count = a;
    if (a > 0) {
        this.canvas.style.background = 'rgba(96,0,0,' + a * 0.05 + ')';
        this.canvas.style.display = 'block';
    } else {
        this.canvas.style.display = 'none';
    }
};

/**
 * Callback function for the final picture fade-in,
 * also shows the continue/abort dialog.
 */
Puzzle.prototype.do_fade = function() {
    this.set_alpha(this.fade_count - 1);
    if (this.fade_count > 0) {
        var obj = this;
        this.fade_id = setTimeout(function() { obj.do_fade(); }, 50);
    } else {
        this.canvas.parentNode.removeChild(this.canvas);
        obj = this;
        game_index += 1;
        localStorage.game_index = game_index + '';
        dialog('Hai vinto!',
               '<p>Bravissima, hai vinto!<br>Ti sei guadagnata la combinazione per il lucchetto fucsia: 143 (che, per inciso, è il numero di giorni che sono passati da quando ci siamo conosciuti, l\'8 Aprile).<br>Vuoi giocare ancora?',
               ['Si', 'No'],
               function(x) { obj.callback(x == 'Si'); });
    }
};

/**
 * Start the fade-in animation at the end of a level.
 */
Puzzle.prototype.fade = function() {
    document.getElementById('puzzle').style.display = "block";
    this.set_alpha(20);
    var obj = this;
    this.fade_id = setTimeout(function() { obj.do_fade(); }, 50);
};

var game_index;

function set_screen(name) {
    if (! name) name = '#play';
    // new screen
    screens = document.getElementsByTagName('div');
    for (var i = 0; i < screens.length; ++i) {
        if (name == '#' + screens[i].id) {
            screens[i].style.display = 'block';
        } else {
            screens[i].style.display = 'none';
        }
    }
    if (name == '#play') {
        cc = document.getElementsByClassName('canvas');
        for (var i = 0; i < cc.length; ++i) {
            cc[i].parentNode.removeChild(cc[i]);
        }
        var change = (function() {
            var list = [
                'anto-sara-olaf.jpg',
            ];
            var puzzle = document.getElementById('puzzle');
            return function() {
                var mn = 12; /* (game_index < list.length ? 12 : Math.floor(Math.random() * 14) + 4); */
                var next = list[game_index % list.length];
                function start() {
                    var level = game_index;
                    var image = next;
                    // level starts
                    new Puzzle(puzzle, mn,
                               function(x) {
                                   if (x) {
                                       change();
                                   } else {
                                       window.location = '/';
                                   }
                                   // level ends
                               });
                }
                if (puzzle.src == next) {
                    start();
                } else {
                    puzzle.src = next;
                    puzzle.onload = start;
                }
            }
        })();
        change();
    }
}

check_hash = (function() {
    var hash;
    return function() {
        if (window.location.hash != hash) {
            hash = window.location.hash;
            set_screen(hash);
        }
    }
})();

function init() {
    sound = document.getElementById('sound');

    if (localStorage.game_index == undefined) {
        game_index = 0;
    } else {
        game_index = parseInt(localStorage.game_index);
    }

    setInterval(check_hash, 100);
}
