const maxTemperature = 100;
const zeroTemperature = 50;

class RequiredTemperature {
	/**
	 * The required temperature for this tile.
	 * 
	 * @class
	 * @param {number} min The minimum temperature
	 * @param {number} max The maximum temperature
	 */
    constructor (min, max) {
        this.min = zeroTemperature + min;
		this.max = zeroTemperature + max;
	}
}

const tileTypes = [];
class TileType {
	/**
	 * A tile's display in easily-accessible (ha, no) data format
	 * 
	 * @class
	 * @param {string} name Name of the tile
	 * @param {string} character Character representing the tile
	 * @param {string} color Color of the character representing the tile
	 * @param {string} varietyColor This varies the color of the tile, between this argument and the default color
	 */
	constructor (name, character, color, varietyColor, blocks) {
		this.name = name;
        this.tile = new DisplayTile(character, color);
		this.blocks = blocks;

		if (varietyColor) {this.varietyColor = varietyColor;}
		this.id = tileTypes.length + 1;
		tileTypes.push(this);
	}
	clone (x, y) {
		if (this.varietyColor) {/* 

		console.log(this.tile.color);
		console.log(this.varietyColor);
		console.log(ROT.Color.randomize(ROT.Color.fromString(this.tile.color), ROT.Color.fromString(this.varietyColor))); */
			return new Tile(x, y, this, ROT.Color.toHex(ROT.Color.randomize(
				ROT.Color.fromString(this.tile.color), 
				ROT.Color.fromString(this.varietyColor)
				)
			));
		}
		else {return new Tile(x, y, this);}
	}
}

class Tile {
	/**
	 * A tile "instance" in the world, including it's TileType, (which doesn't change, to save memory.)
	 * 
	 * @class
	 * @param {number} x X coordinate of the tile
	 * @param {number} y Y coordinate of the tile
	 * @param {TileType} tileType The tiletype, carrying information that is shared across all similar tiles
	 * @param {string} varietyColor The varied color of this tile, otherwise it will just use the default color of the Tiletype
	 */
	constructor (x, y, tileType, varietyColor) {
		this.x = x;
        this.y = y;
		this.tileType = tileType;
		this.varietyColor = varietyColor;
		this.entityHere = undefined;
	}
}

class TileFactory {
	constructor () {
		this.name = "";
		this.character = "";
		this.color = "";
		this.varietyColor = "";
	}
	
}

//degrees c
//#00ff00
const grass = new TileType("grass", "#", "#119933", "");
const sand = new TileType("sand", ".", "#d1d080", '' );
const ice = new TileType("ice", "*", "#0022ff", '');
const snow = new TileType("snow", "*", "#ffffff", '');
const wall = new TileType("wall", "#", "#9898a2", '', true);
