// Global settings
var referenceWidth;
var referenceHeight;
var ratio;
var rows;
var cols;
var cellW;
var cellH;
var gameover;
var tileimg;
var ctx;
var randomSeed;

// Console swiethces
var showWhich;
var mortalHero;
var cowardEvil;
var heroicTrail;
var tileMode;

// Global records
var time;
var startLife;
var life;
var numDead;
var kamikaze;
var anewTriggered;
var newbornTriggered;

// Tile data
var lower;
var lowerNextGen;
var upper;

// NPC position data
var hero;
var evilLord;
var monuments;

function setup() {
	// This is originally intended size
	referenceWidth = 800;
	referenceHeight = 500;
	ratio = referenceHeight / referenceWidth;

	// Get <div> size, and make a canvas fit the container while maintaining the ratio
	var gc = document.getElementById('gameContainer');
	var gcW = gc.offsetWidth;
	var wOff = 0;
	if(gcW > referenceWidth) {
		wOff = gcW - referenceWidth;
		gcW = referenceWidth;
	}
	var gcH = gcW * ratio;
	gc.setAttribute("style", "height: " + gcH + "px");
	createGraphics(gcW, gcH, false, 'gameContainer', 'gameCanvas');
	document.getElementById('gameCanvas').setAttribute('style', 'position: absolute; left: ' + wOff*0.5 + 'px');

	// Set monitor, console and footer's position
	var mon = document.getElementById('monitor');
	var con = document.getElementById('console');
	var foo = document.getElementById('footer');
	mon.setAttribute('style', 'top: ' + (gc.offsetTop + gcH) + 'px;' + (wOff>0?('left: ' + (gc.offsetLeft + wOff) + 'px'):''));
	con.setAttribute('style', 'top: ' + (gc.offsetTop + gcH) + 'px;' + (wOff>0?('right: ' + (document.documentElement.clientWidth - gc.offsetLeft - gc.offsetWidth + wOff) + 'px'):''));
	foo.setAttribute('style', 'top: ' + (con.offsetTop + con.offsetHeight + 40) + 'px');

	// If document width/height changes, apply new size to everything
	checkDocumentHeight(resizeCanvas);

	// Start new game
	startAnew(false);
}

function loadTileImages() {
	for(var i = 0; i < 11; i++) {
		var img = new Image();
		img.src = '/img/' + i + '.png';
		this.push(img);
	}
}

function initTiles() {
	lower = [];
	lowerNextGen = [];
	upper = [];
	for(var y = 0; y < rows; y++) {
		lower[y] = [];
		lowerNextGen[y] = [];
		upper[y] = [];
		for(var x = 0; x < cols; x++) {
			lower[y][x] = floor(Math.random()*11)-5;	// Lower layer starts with random values
			lowerNextGen[y][x] = 0;						// Prepare next-generation lower layer
			upper[y][x] = 0;							// Upper layer starts with 0
		}
	}
}

function switchLayer() {
	showWhich = showWhich == 'lower' ? 'upper' : 'lower';
}

function switchTile() {
	tileMode = tileMode == 'rect' ? 'tile' : 'rect';
}

function draw() {
	background(255);

	/** UNDERLYING DETAILED RULE: Overall flow -- DRAW TILES > CHECK GAME OVER CONDITION > MOVE NPC > GENERATE TO NEXT GENERATION */

	/*******************
	*  1. DRAWING      *
	*******************/

	// Draw tiles
	switch(showWhich) {
		case 'lower':
			stroke(200); strokeWeight(1);
			for(var y = 0; y < rows; y++) {
				for(var x = 0; x < cols; x++) {
					if(lower[y][x] > 0) fill(map(lower[y][x], 0, 5, 255, 0), 255, 255);
					else if(lower[y][x] < 0) fill(255, map(lower[y][x], 0, -5, 255, 0), 255);
					else fill(255);
					rect(x*cellW, y*cellH, cellW, cellH);
				}
			}
			break;
		case 'upper':
			stroke(200); strokeWeight(1);
			for(var y = 0; y < rows*0.5; y++) {
				for(var x = 0; x < cols*0.5; x++) {
					if(tileMode == 'rect') {
						if(upper[y][x] > 0) fill(map(upper[y][x], 0, 5, 255, 0), 255, 255);
						else if(upper[y][x] < 0) fill(255, map(upper[y][x], 0, -5, 255, 0), 255);
						else fill(255);
						rect(x*cellW*2, y*cellH*2, cellW*2, cellH*2);
					} else if(tileMode == 'tile') {
						if(upper[y][x]+5 < 0 || upper[y][x]+5 >= 11) console.log(upper[y][x]);
						ctx.drawImage(tileimg[upper[y][x]+5], x*cellW*2, y*cellH*2, cellW*2, cellH*2);
					}
				}
			}
			break;
		default: throw("Exception at showWhich: " + showWhich);
	}

	// Draw monuments
	if(heroicTrail) {
		stroke(255); strokeWeight(2); fill(0, 255, 0);
		for(var i = 0; length = monuments.length, i < length; i++) rect(monuments[i].x*cellW*2, monuments[i].y*cellH*2, cellW*2, cellH*2);
	}

	// Draw NPCs
	if(!kamikaze) {
		stroke(55); strokeWeight(2);
		fill(0); rect(evilLord.x*cellW*2, evilLord.y*cellH*2, cellW*2, cellH*2);
		if(!newbornTriggered) { fill(255, 255, 0); rect(hero.x*cellW*2, hero.y*cellH*2, cellW*2, cellH*2); }
	}

	// Show monitor
	var mon = document.getElementById('monitor');
	mon.innerHTML = '<span style="position: absolute; width: 50%">TIME: ' + time + '</span>' +
		(mortalHero ? '<span style="position: absolute; left: 50%">LIFE: ' + life + '</span><br />' +
		'<span style="color: white; word-wrap: break-word; line-height: 160%; position: absolute; width: 100%">' + (function showDead(num) {
			if(num > 0) return '&#9751;' + showDead(num-1);
			else return '';
		})(numDead) + '</span>'
		: '');

	if(gameover) {
		if(!anewTriggered) {
			var newgame = window.setTimeout(startAnew, 3000, [false]);
			anewTriggered = true;
		}
		return;
	}

	if(newbornTriggered) return;


	/*******************
	*  2. NPCS         *
	*******************/

 	// Move NPCs
 	/***** RULE 01: They look for the evilest neighboring tile and goes one step toward that tile, as if a hero loves to risk his life and the evil lord feel happy to be in his hideout, or a den *****/
 	/***** RULE 02: If there is no one and only evilest tile in their neighbor, they look one step further for four directions, and if there is a evilest tile, move one step toward that tile *****/
	var nextStep = function() {
		// Look for first four neighbors
		var x = this.x;
		var y = this.y;
		var neighbor = [];
		neighbor[0] = upper[y==0?floor(rows*0.5)-1:y-1][x];	// UP
		neighbor[1] = upper[y>=floor(rows*0.5)-1?0:y+1][x];	// DOWN
		neighbor[2] = upper[y][x==0?floor(cols*0.5)-1:x-1];	// LEFT
		neighbor[3] = upper[y][x>=floor(cols*0.5)-1?0:x+1];	// RIGHT
		neighbor[4] = upper[y][x];							// reference
		var smallest = 4;
		var sameFlag = false;
		for(var i = 0; i < 4; i++) {
			if(neighbor[smallest] > neighbor[i]) { smallest = i; sameFlag = false; }
			else if(neighbor[smallest] == neighbor[i]) sameFlag = true;
		}
		if(!sameFlag && smallest != 4) {
			this.step++;
			switch(smallest) {
				case 0: this.y--; return;
				case 1: this.y++; return;
				case 2: this.x--; return;
				case 3: this.x++; return;
			}
		}

		// Look for second four neighbors
		neighbor[0] = upper[y-2<0?floor(rows*0.5)+y-2:y-2][x];					// UP
		neighbor[1] = upper[y+2>=floor(rows*0.5)?y+2-floor(rows*0.5):y+2][x];	// DOWN
		neighbor[2] = upper[y][x-2<0?floor(cols*0.5)+x-2:x-2];					// LEFT
		neighbor[3] = upper[y][x+2>=floor(cols*0.5)?x+2-floor(cols*0.5):x+2];	// RIGHT
		neighbor[4] = upper[y][x];							// reference
		smallest = 4;
		sameFlag = false;
		for(var i = 0; i < 4; i++) {
			if(neighbor[smallest] > neighbor[i]) { smallest = i; sameFlag = false; }
			else if(neighbor[smallest] == neighbor[i]) sameFlag = true;
		}
		if(!sameFlag && smallest != 4) {
			this.step++;
			switch(smallest) {
				case 0: this.y--; return;
				case 1: this.y++; return;
				case 2: this.x--; return;
				case 3: this.x++; return;
			}
		}

		return;
	}

	// Save NPCs original location to prevent crossing each other
	var pHero = hero;
	var pEvilLord = evilLord;

	// Move NPCs
	nextStep.apply(hero);
	if(hero.x < 0) hero.x = floor(cols*0.5)-1;
	else if(hero.x >= floor(cols*0.5)-1) hero.x = 0;
	if(hero.y < 0) hero.y = floor(rows*0.5)-1;
	else if(hero.y >= floor(rows*0.5)-1) hero.y = 0;
	nextStep.apply(evilLord);
	if(evilLord.x < 0) evilLord.x = floor(cols*0.5)-1;
	else if(evilLord.x >= floor(cols*0.5)-1) evilLord.x = 0;
	if(evilLord.y < 0) evilLord.y = floor(rows*0.5)-1;
	else if(evilLord.y >= floor(rows*0.5)-1) evilLord.y = 0;

	// Check if they were crossing each other, and if so, pull back the EVIL LORD
	/** UNDERLYING DETAILED RULE: If a HERO and the EVIL LORD crosses each other, cancel EVIL LORD's move **/
	if(hero.x == pEvilLord.x && hero.y == pEvilLord.y && evilLord.x == pHero.x && evilLord.y == pHero.y) evilLord = pEvilLord;

	// Check game over condition
	if(hero.x == evilLord.x && hero.y == evilLord.y) gameover = true;

	// NPCs do their job
	/***** RULE 03: They make a upper layer tile that they’re stepping on into maximum level of good/evil tile, and make four neighboring tiles into level one good/evil tiles unless the tiles are better/eviler than level one *****/
	var doHeroicStuff = function() { upper[this.y][this.x] = 5;
	upper[this.y==0?floor(rows*0.5)-1:this.y-1][this.x] = upper[this.y==0?floor(rows*0.5)-1:this.y-1][this.x] <= 0 ? 1 : upper[this.y==0?floor(rows*0.5)-1:this.y-1][this.x];
	upper[this.y>=floor(rows*0.5)-1?0:this.y+1][this.x] = upper[this.y>=floor(rows*0.5)-1?0:this.y+1][this.x] <= 0 ? 1 : upper[this.y>=floor(rows*0.5)-1?0:this.y+1][this.x];
	upper[this.y][this.x==0?floor(cols*0.5)-1:this.x-1] = upper[this.y][this.x==0?floor(cols*0.5)-1:this.x-1] <= 0 ? 1 : upper[this.y][this.x==0?floor(cols*0.5)-1:this.x-1];
	upper[this.y][this.x>=floor(cols*0.5)-1?0:this.x+1] = upper[this.y][this.x>=floor(cols*0.5)-1?0:this.x+1] <= 0 ? 1 : upper[this.y][this.x>=floor(cols*0.5)-1?0:this.x+1]; }
	var doEvilStuff = function() { upper[this.y][this.x] = -5;
	upper[this.y==0?floor(rows*0.5)-1:this.y-1][this.x] = upper[this.y==0?floor(rows*0.5)-1:this.y-1][this.x] >= 0 ? -1 : upper[this.y==0?floor(rows*0.5)-1:this.y-1][this.x];
	upper[this.y>=floor(rows*0.5)-1?0:this.y+1][this.x] = upper[this.y>=floor(rows*0.5)-1?0:this.y+1][this.x] >= 0 ? -1 : upper[this.y>=floor(rows*0.5)-1?0:this.y+1][this.x];
	upper[this.y][this.x==0?floor(cols*0.5)-1:this.x-1] = upper[this.y][this.x==0?floor(cols*0.5)-1:this.x-1] >= 0 ? -1 : upper[this.y][this.x==0?floor(cols*0.5)-1:this.x-1];
	upper[this.y][this.x>=floor(cols*0.5)-1?0:this.x+1] = upper[this.y][this.x>=floor(cols*0.5)-1?0:this.x+1] >= 0 ? -1 : upper[this.y][this.x>=floor(cols*0.5)-1?0:this.x+1]; }
	/** UNDERLYING DETAILED RULE: HERO does his job first, unless 'COWARD EVIL' switch is on **/
	if(cowardEvil) { doEvilStuff.apply(evilLord); doHeroicStuff.apply(hero); } else { doHeroicStuff.apply(hero); doEvilStuff.apply(evilLord); }

	// On HERO's death
	life = startLife - hero.step;
	/***** RULE 04(optional): Hero starts with life point, which is (rows^2+cols^2)^0.5, and consumes one on every step he makes *****/
	/***** RULE 05(optional): When a hero runs out of his life, he disappears and a new hero appears on random position *****/
	/***** RULE 06(optional): On hero's death, a monument appears which constantly does a job that hero would do *****/
	if(life <= 0) {
		if(!newbornTriggered) {
			// Increment death count
			numDead++;

			// Leave monument if the option is on
			if(heroicTrail) {
				var m = { "x": hero.x, "y": hero.y };
				monuments.push(m);
			}

			if(!gameover) {
				// Create new HERO
				setTimeout(function() {
					hero = { "x": floor(Math.random()*cols*0.5), "y": floor(Math.random()*rows*0.5), "step": 0 };
					life = startLife - hero.step;
					newbornTriggered = false;
				}, 1000);
				newbornTriggered = true;
			} else {
				// HERO slayed the EVIL LORD with his last breath
				kamikaze = true;
			}
		} else return;
	}

	// Monuments do its works
	if(heroicTrail) {
		for(var i = 0; length = monuments.length, i < length; i++) doHeroicStuff.apply(monuments[i]);
	}



	/*******************
	*  3. LOWER LAYER  *
	*******************/

	// Cellular automata for lower layer
	for(var y = 0; y < rows; y++) {
		for(var x = 0; x < cols; x++) {
			var numGood = 0;
			var numEvil = 0;
			for(var yoff = -1; yoff <= 1; yoff++) {
				for(var xoff = -1; xoff <= 1; xoff++) {
					if(yoff == 0 && xoff == 0) continue;
					var ytarget = y + yoff;
					var xtarget = x + xoff;
					if(ytarget < 0) ytarget = rows-1; else if(ytarget >= rows) ytarget = 0;
					if(xtarget < 0) xtarget = cols-1; else if(xtarget >= cols) xtarget = 0;
					if(lower[ytarget][xtarget] > 0) numGood++;
					else if(lower[ytarget][xtarget] < 0) numEvil++;
				}
			}
			/***** RULE 01: If there're more good/evil neighbors than its counterpart, step one toward good/evil *****/
			/***** RULE 02: If there're even numbers of good/evil neighbors, stay the same *****/
			if(numGood > numEvil) lowerNextGen[y][x] = lower[y][x] + 1;
			else if(numGood < numEvil) lowerNextGen[y][x] = lower[y][x] - 1;

			/***** RULE 03: If a good tile maxes out it’s level and still needs to be better, it becomes level 1 evil, as if corruption happens within long peace *****/
			/***** RULE 04: If a evil tile maxes out it’s level and still needs to be eviler, it becomes level 1 good, as if rebellion happens within severe oppression *****/
			if(lowerNextGen[y][x] > 5) lowerNextGen[y][x] = -1;
			if(lowerNextGen[y][x] < -5) lowerNextGen[y][x] = 1;
		}
	}

	// Proceed to next generation
	lower = lowerNextGen;


	/*******************
	*  3. UPPER LAYER  *
	*******************/

	// Calculate upper layer
	for(var y = 0; y < rows*0.5; y++) {
		for(var x = 0; x < cols*0.5; x++) {
			var sum = 0;
			sum += lower[y*2][x*2];
			sum += lower[y*2][x*2+1];
			sum += lower[y*2+1][x*2];
			sum += lower[y*2+1][x*2+1];

			/***** RULE 01: Assuming lower layer cells as a value between -5 and 5, go one step toward good/evil when a sum of four bearing cells goes more/less than 10/-10 *****/
			/***** RULE 02: If the sum is between -5 and 5, stay the same *****/
			/***** RULE 03: If not, go one step toward neutral *****/
			if(sum > 10) upper[y][x]++;
			else if(sum < -10) upper[y][x]--;
			else if(abs(sum) > 5) upper[y][x] += 0;
			else if(upper[y][x] != 0) upper[y][x] -= upper[y][x]/Math.abs(upper[y][x]);

			if(upper[y][x] < -5) upper[y][x] = -5;
			else if(upper[y][x] > 5) upper[y][x] = 5;
		}
	}

	// Increment time each frame
	time++;
}

// Restart game with console settings
function startAnew(hitbutton) {
	// Set framerate
	background(255);
	frameRate(3);

	// Set global values
	rows = 5*8;
	cols = 8*8;
	cellW = width / cols;
	cellH = height / rows;
	gameover = false;
	tileimg = [];
	loadTileImages.apply(tileimg);
	ctx = document.getElementById('gameCanvas').getContext('2d');
	tileMode = 'rect';

	// Set console switches into defualt
	showWhich = 'upper';	// 'lower' and 'upper'
	mortalHero = true;
	cowardEvil = false;		// when turned on, hero do the job last so that evil lord can evade the hero
	heroicTrail = true;		// when turned on, leave monuments when heroes die

	// Initialize record data
	time = 0;
	startLife = floor(pow(pow(rows, 2) + pow(cols, 2), 0.5));
	life = startLife;
	numDead = 0;
	kamikaze = false;
	anewTriggered = false;
	newbornTriggered = false;

	// Set random seed
	var randomSeed = document.getElementById('seed').value;
	if(hitbutton && randomSeed && randomSeed != '-- random --') Math.seedrandom(randomSeed);
	else randomSeed = '-- random --', Math.seedrandom();
	document.getElementById('seed').value = randomSeed;

	// Initialize tiles
	initTiles();

	// Set initial location for NPCs
	hero = { "x": floor(Math.random()*cols*0.5), "y": floor(Math.random()*rows*0.5), "step": 0 };
	evilLord = { "x": floor(Math.random()*cols*0.5), "y": floor(Math.random()*rows*0.5), "step": 0 };
	monuments = [];
}

// Detect change of document width/height
function checkDocumentHeight(callback){
    var lastWidth = document.body.clientWidth, newWidth, timer;
    (function run() {
        newWidth = document.body.clientWidth;
        if(lastWidth != newWidth) callback();
        lastWidth = newWidth;
        timer = setTimeout(run, 200);
    })();
}

// Change canvas size with new screen width value
function resizeCanvas() {
	// Get container and its size to decide new canvas size
	var gc = document.getElementById('gameContainer');
	var gcW = gc.offsetWidth;
	var wOff = 0;
	if(gcW > referenceWidth) {
		wOff = (gcW - referenceWidth) * 0.5;
		gcW = referenceWidth;
	}
	var gcH = gcW * ratio;
	gc.setAttribute('style', 'height: ' + gcH + 'px');

	// Set new canvas size
	var c = document.getElementById('gameCanvas');
	c.setAttribute('width', gcW);
	c.setAttribute('height', gcH);
	c.setAttribute('style', 'position: absolute; left: ' + wOff + 'px');

	// Modify global settings according to the new size
	width = gcW;
	height = gcH;
	cellW = width / cols;
	cellH = height / rows;

	// Set new top value for console and footer <div>
	var mon = document.getElementById('monitor');
	var con = document.getElementById('console');
	var foo = document.getElementById('footer');
	mon.setAttribute('style', 'top: ' + (gc.offsetTop + gcH) + 'px;' + (wOff>0?('left: ' + (gc.offsetLeft + wOff) + 'px'):''));
	con.setAttribute('style', 'top: ' + (gc.offsetTop + gcH) + 'px;' + (wOff>0?('right: ' + (document.documentElement.clientWidth - gc.offsetLeft - gc.offsetWidth + wOff) + 'px'):''));
	foo.setAttribute('style', 'top: ' + (con.offsetTop + con.offsetHeight + 40) + 'px');
}