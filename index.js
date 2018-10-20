/**
 * Extensive documentation never hurts, I guess? 
 * 
 * @author Edwin Goh (Mount2010)
 */
const display = new ROT.Display();
/**
 * Managed by DisplaySystem. Left side of screen.
 * @see DisplaySystem.updateBuffer
 * @constant
 */
const bufferOptions = {
	height: 25, width: 25
};
/**
 * Managed by Logger. Right side of screen
 * @see Logger
 * @constant
 */
const logOptions = {
	maxMessages: 20,
	width: 25
};
/**
 * Managed by DisplaySystem. Whole screen's options.
 * @see DisplaySystem.update
 * @constant
 */
const displayOptions = {
	// 2 is the seperator
	height: 25, width: bufferOptions.width + logOptions.width + 2 ,
	bg: '#000000', 
	fontSize: 25
};
/**
 * Managed by DamageSystem. Bottom right of screen
 * @see DamageSystem
 * @constant
 */
const healthOptions = {

};
display.setOptions(displayOptions);
//const logDisplayOptions = {height: 25, width: 25, fontSize: 25, bg: "#000000"/* spacing: 0.75 */};
const mapOptions = {
	height: 75, width: 75
};
const diggerOptions = {
	roomWidth: [5, 10],
	roomHeight: [5, 20],
	dugPercentage: 0.2
}
//how far the player can see starting from the player
const playerLightRadius = 5;


const displayContainer = display.getContainer();
// displayContainer.className = "container";
document.getElementById("game").appendChild(displayContainer);
//const log = new ROT.Display(logDisplayOptions);
//const logContainer = log.getContainer();
//logContainer.className = "container";
//document.getElementById("log").appendChild(logContainer);

/**
 * Run when game starts and all code has been processed (things that would break otherwise)
 * 
 * @function
 */
function init () {
	//Done after all the code is processed

	mapSystem.populateMap();
	updateAll();
	
}

/**
 * Run every turn to update the locations of entities and the screen
 * 
 * @function
 */
function updateAll () {
	mapSystem.updateEntitiesPosition();
	displaySystem.update();
}

class MapPopulator {
	constructor () {
		this.map;
		this.rooms;
	}
	populateMap () {
		const map = new Array(mapOptions.height * mapOptions.width);

		//-2 because of top bottom left right walls
		const generator = new ROT.Map.Digger(mapOptions.height-2, mapOptions.width-2, diggerOptions);
		function generatorCallback (x, y, value) {
			map[x + y * mapOptions.width] = value == 1 ? wall.clone(x, y): grass.clone(x, y);
		}
		//const randomCenter = this.rooms.random().getCenter();
		generator.create(generatorCallback);
		this.map = map;
		this.rooms = generator.getRooms();
		
		for (let i = 0; i < this.rooms.length; i++) {
			const center = this.rooms[i].getCenter();
			pie.make(center[0], center[1]);
			lomb.setX(center[0]+1).setY(center[1]).make();
		}

		const randomCenter = this.rooms.random().getCenter();
		player = playerFactory.setX(randomCenter[0]).setY(randomCenter[1]).make();
		displaySystem.bufferEntity.mover.moveTo(randomCenter[0]-12, randomCenter[1]-12);

		return [this.map, this.rooms];
	}
}

class MapSystem {
	constructor () {
		this.map = [];
		this.rooms = [];

		//this has to look up the entities' current position on the map which is annoying. so i save it here
		this.entitiesOnMap = {};
		this.queryLightPassablity = this.queryLightPassablity.bind(this);
	}
	populateMap () {
		[this.map, this.rooms] = new MapPopulator().populateMap();
	}
	putOnMap (x, y, entity) {
		this.map[x + y * mapOptions.width].entityHere = entity;
		this.entitiesOnMap[entity.id] = {x: entity.position.x, y: entity.position.y};
	}
	getTile (x, y) {
		return this.map[x + y * mapOptions.width];
	}
	queryLightPassablity (x, y) {
		if (this.map[x + y * mapOptions.width] && this.map[x + y * mapOptions.width].tileType) {return !this.map[x + y * mapOptions.width].tileType.blocks;}
		else {return false;}
	}
	queryTileName (x, y) {
		if (this.map[x + y * mapOptions.width].entityHere && this.map[x + y * mapOptions.width].entityHere.display) {
			return this.map[x + y * mapOptions.width].entityHere.name;
		} 
		else {
			return this.map[x + y * mapOptions.width].tileType.name;
		}
	}
	/**
	 * Call before something moves
	 * 
	 * @param {Entity} something 
	 * @param {Array[Number]} differenceFromPosition
	 * @returns {Boolean} should something continue moving
	 */
	checkMove (something, differenceFromPosition) {
		const newPlace = this.map[(something.position.x + differenceFromPosition[0]) + ((something.position.y + differenceFromPosition[1]) * mapOptions.width)];
		if (newPlace.entityHere && newPlace.entityHere.collide) {
			if (newPlace.entityHere.collide.call()) {
				//logger.log(`The ${newPlace.entityHere.name} refuses to budge.`);
				if (newPlace.entityHere.destructible) {
					newPlace.entityHere.destructible.attack(1);
				}
				else {
					logger.log(`${newPlace.entityHere.name} refuses to budge!`);
				}
				return false;
			}
		}
		else if (newPlace.tileType.blocks) {
			return false;
		}
		else return true;
	}
	clearEntity (x, y) {
		this.map[x + y * mapOptions.width].entityHere = undefined;
	}
	updateEntitiesPosition () {
		for (let i = 0; i < entities.length; i++) {

			//this is only needed for those with a display (those without wouldn't need to be called by the display system)
			if (entities[i].position && entities[i].display) {
				//check out the previous position of entity
				let entity = entities[i];
				let id = entity.id;
				
				if (!this.entitiesOnMap[id]) {mapSystem.putOnMap(entity.position.x, entity.position.y, entity);}
				else {
					let previousPosition= {x: this.entitiesOnMap[id].x, y: this.entitiesOnMap[id].y}; 
					let previousSlotEntity = this.getTile(previousPosition.x, previousPosition.y).entityHere;
					//clear previous position on map
					if (previousSlotEntity == entity) this.clearEntity(previousPosition.x, previousPosition.y);
					
					//logger.log(this.map[previousPosition.x+mapOptions.width*previousPosition.y].entityHere)
				//	if (entity == player) logger.log(this.getTile(player.position.x, player.position.y).tileType.name);

					
					if (!this.getTile(entity.position.x, entity.position.y).entityHere) {this.putOnMap(entity.position.x, entity.position.y, entity);}
				}
			}
		}
	}
}

class FOV { 
	constructor () {
		this.fov = new ROT.FOV.PreciseShadowcasting(mapSystem.queryLightPassablity);
	}
	calculateFOV (x, y, callback) {
		this.fov.compute(x, y, playerLightRadius, callback);
	}
}

class ConnectedTileSystem {
	constructor () {

	}
}

class DisplaySystem {
	constructor () {
		this.buffer = new Array(displayOptions.width * displayOptions.height);
		this.bufferEntity = new BufferEntity("buffer", 12, 12, "X", "#FF0000", true);
		this.drawer; // Function that shows the screen.
		this.showInventory = false; 
		this.bx = 0; //buffer position x
		this.by = 0; // buffer position y
		this.fov = new FOV();
	}
	update () {
		if (this.showInventory) {
			this.drawer = this.drawTheInventory;
		}
		else {
			this.drawer = this.drawFromBuffer;
		}
		this.drawer();
	}
	/**
	 * Draws from buffer to the canvas.
	 * 
	 * @see DisplaySystem.updateBuffer
	 * @method
	 */
	drawFromBuffer () {
		displaySystem.updateBufferFOV();
		displaySystem.updateBuffer();

		display.clear();
		logger.showMessages();
		for (let i = 0; i < bufferOptions.width; i++) {
			for (let j = 0; j < bufferOptions.height; j++) {
				let pos = i + (j * bufferOptions.width);

				//draw separating line between game and log/information
				for (let k = 0; k < bufferOptions.height; k++) {
					display.draw(bufferOptions.width, k, "|", "#ffffff")
				}
  				
				//idea: "flipped mode" where i and j are flipped as a status effect
				if (this.buffer[pos]) { display.draw(i, j, this.buffer[pos][0], this.buffer[pos][1], this.buffer[pos][2]);}
				else {display.draw(i,j,'','','#000000')}

			}
		}
	}
	drawTheInventory () {
		display.clear();
		display.drawText(1, 1, "Inventory");
		for (let i = 0; i < player.inventory.inventory.length; i++) {
			display.drawText(1, 2+i, `* A ${player.inventory.inventory[i].name}`);
		}
	}
	/**
	 * Updates the buffer. Update() should be called afterwards
	 * 
	 * @see DisplaySystem.update
	 * @method
	 */
	updateBuffer () {
		this.buffer = new Array(displayOptions.width * displayOptions.height);

		//console.log(this.bx + ","+ this.by);
		this.bx = this.bufferEntity.position.x;
		this.by = this.bufferEntity.position.y;

		for (let i = 0; i < bufferOptions.width; i++) {
			for (let j = 0; j < bufferOptions.height; j++) {
				//Tiles are the default thing in the buffer
				//position of the screen ON THE MAP.
				//BX is NOT on the BUFFER; it is on the MAP.
				const bufferx = this.bx + i;
				const buffery = this.by + j;
				const tile = mapSystem.getTile(bufferx, buffery);
				const isOutsideMap = bufferx < 0 || bufferx >= mapOptions.width || buffery < 0 || buffery >= mapOptions.height;
				const pos = i + j * bufferOptions.width;

				//Bloody hack: If it's outside the map, then dont draw it
				if (!tile || isOutsideMap) {this.buffer[pos] = new DisplayTile('', '', '#000000').query(); continue;}
				else if (tile.entityHere && tile.entityHere.display && (tile.hasSeen || tile.inSight)) {
					const entity = tile.entityHere;

					this.buffer[pos] = entity.display.tile.query();
				}
				else if (tile.hasSeen || tile.inSight) {
					if (tile.varietyColor) {this.buffer[i+j*bufferOptions.width]=[tile.tileType.tile.character, tile.varietyColor];}
					else {
						this.buffer[pos] = tile.tileType.tile.query();
						if (tile.hasSeen && !tile.inSight) {
							this.buffer[pos][1] = ROT.Color.toHex(ROT.Color.interpolate(ROT.Color.fromString(this.buffer[pos][1]), ROT.Color.fromString("#000000")), 0.3);
						}
					}
				}
				tile.inSight = false;
			}
		}
	}
	updateBufferFOV () {
		this.fov.calculateFOV(player.position.x, player.position.y, (x, y, r, visibility)=>{
			// maybe put the put into buffer code here
			// maybe mark a "has seen" and "in sight" on the tile?
			mapSystem.getTile(x, y).inSight = true;
			mapSystem.getTile(x, y).hasSeen = true;
		});
	}
	/**
	 * Draws on the buffer. Should be used in between updateBuffer() and update(); Not used by entities anymore.
	 * 
	 * @see DisplaySystem.updateBuffer
	 * @see MapSystem.updateEntities
	 * @param {number} x
	 * @param {number} y
	 * @param {string} character
	 * @param {string} color
	 * @method
	*/
	drawOnBuffer (x, y, character, color) {
		let pos = x + displayOptions.width * y;
		this.buffer[pos] = [character, color];
	}
	/*_makeBox (text) {
		for (let i = 0; i > text.length; i++) {
			drawBuffer(bufferOptions.width/2-text.length+i, bufferOptions.height/2, '_', "#ffffff");
		}
		for (let i = 0; i > text.length; i++) {
			if (i == 1) {drawBuffer((bufferOptions.width/2)-text.length+i, (bufferOptions.height/2)+1, '|', "#ffffff")}
			else if (i == text.length - 1) {}
			drawBuffer(bufferOptions.width/2-text.length,(bufferOptions.height/2)+1);
		}
	}*/
	toggleShowInventory () {
		this.showInventory = !this.showInventory;
	}
}	

class InputSystem {
	constructor () {
		const parthis = this; //lazy solution since addeventlistener kills this
		window.addEventListener("keydown", function (e) {
			let key = e.key;
			parthis.iterate(key);
		});
		window.addEventListener("mousedown", function (e) {
			const pos = display.eventToPosition(e);
			const name = mapSystem.queryTileName(pos[0] + displaySystem.bx , pos[1] + displaySystem.by);
			const tile = mapSystem.getTile(pos[0]+displaySystem.bx, pos[1]+ displaySystem.by);

			if (!tile.hasSeen) {logger.logShow("You haven't seen that!")}
			else {logger.logShow("That is a " +name+".");}
		})

	}
	/**
	 * Sends keycode to every entity that cares ("has an AI")
	 * @param {number} key
	 */
	iterate (key) {
		for (let i = 0; i < entities.length; i++) {
			if (entities[i].Ai) {
				//Hi, Ai, call this
				entities[i].Ai.handleInput(key);
			}
		}
	}
}

//oh yea do this sometime
class DamageSystem {
	constructor () {
		
	}

	updatePlayersHealth () {

	}
}

class Logger {
	constructor () {
		this.logs = [];
		this.numLogs = 0;
	}
	/**
	 * Draws messages to the screen (this can't be done in log() because of the screen update)
	 * 
	 * @method
	 */
	showMessages () {
		while (this.numLogs > logOptions.maxMessages) {
			this.logs.shift(); this.numLogs--; //pop them out boys
		}
		for (let i = 0; i < this.numLogs; i++) {
			let message = this.logs[i];
			
			let color;
			if (i == this.numLogs-1) {color = "#fff"}
			else if (i == this.numLogs-2) {color = "#ccc"}
			else if (i == this.numLogs-3) {color = "#999"}
			else {color = "#666"}
			message = `%c{${color}}${message}`;
		//	console.log(message);
		//	message = chunkString(message,logOptions.width);
			//if (chunkString.length >= 2) {this.logs.push()}

			display.drawText(2+bufferOptions.width, i, message, 2+bufferOptions.width);
		}
	}
	/**
	 * Logs a message (NOT drawn. Call Logger.showmessages() to draw them to the screen)
	 * 
	 * @see Logger.showmessages
	 * @param {string} message 
	 */
	log (message) {
		let originalMessage = message;
		let messagePieces = chunkString(originalMessage,logOptions.width);

		this.logs.push(...messagePieces);
		this.numLogs+=messagePieces.length;
	}
	logShow (message) {
		this.log(message);
		this.showMessages();
	}
}


const mapSystem = new MapSystem();
const displaySystem = new DisplaySystem();
const inputSystem = new InputSystem();
const logger = new Logger();
logger.log("Hello world!");


init();