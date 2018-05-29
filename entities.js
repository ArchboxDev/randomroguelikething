const entities = [];


class ItemInfo {
	/**
	* Information about an Item, for the Item entity.
	* 
	* @class
	* @param {string} name The name of the item
	* @param {string} character The character repesenting the item
	* @param {string} color The color of the character representing the item
	* @see Item
	*/
	constructor (name, character, color) {
		this.name = name;
		this.character = character;
		this.color = color;
	}
	make (x, y) {
		return new Item(x, y, this);
	}
}

class DisplayTile {
	/**
	 * Utility class for the Display system. Contains information about the characteraand color of a item, and returns them in updateBuffer friendly format
	 * 
	 * @class
	 * @param {string} character Character of the tile
	 * @param {string} color Color of the character
	 * @param {string} bg Background color of the character
	 */
	constructor (character, color, bg) {
		this.character = character || '';
		this.color = color || '';
		this.bg = bg || '';
	}
	/**
	 * Return buffer-friendly tile
	 * @method
	 */
	query () {
		return [this.character, this.color, this.bg];
	}
	update (character, color, bg) {
		this.character = character || this.character;
		this.color = color || this.color;
		this.bg = bg || this.bg;
	}
}


class Entity {
	/**
	* Abstract class for all entities. Registers it in Entities array
	* 
	* @abstract
	* @class
	*/
	constructor () {
		this.id = entities.length + 1;
		this.components = new Map();

		entities.push(this);
	}
	/**
	 * Returns whether a entity has a component
	 * @param {String} component 
	 */
	hasComponent (component) {
		return this.components.has(component);
	}
	/**
	 * Returns the component specified
	 * @param {String} component
	 */
	getComponent (component) {
		return this.components.get(component);
	}
	addComponent (component) {
		const newComponent = components.get(component);
		this.components.set(newComponent.interpretedAs);
	}
}


class LivingEntity extends Entity {
	/**
	 * "Standard" entity, if you will. Includes position, moving, display, and player AI, if it is the player.
	 * 
	 * @implements Entity
	 * @class
	 * @param {string} name
	 * @param {number} x
	 * @param {number} y
	 * @param {string} character
	 * @param {string} color
	 * @param {boolean} canDie
	 * @param {number} hp
	 * @param {boolean} isPlayer
	 */ 
	constructor (name, x, y, character, color, canDie, hp, isPlayer) {
		super();
		this.name = name;
		this.position = new HasPosition(this, x, y);
		this.mover = new CanMove(this, this.position);
		this.display = new HasDisplay(this, this.position, character, color);
		this.inventory = new HasInventory(this);
		this.blocks = true;
		if (canDie) {	
			this.isDead = new CanDie(this, this.display);
			this.destructible = new IsDestructible(this, this.blocker, hp, 0, this.isDead);
			this.collide = this.destructible;
		}
		if (isPlayer) {
			this.Ai = new PlayerAi(this, this.position, this.mover)
		};
	}
	blocker () {
		return this.blocks;
	}
}

class EntityFactory {
	/**
	 * Makes the process of creating an entity less painful, and more initutive.
	 * 
	 * @class
	 */
	constructor () {
		this.name = "";
		this.x = 0;
		this.y = 0;
		this.character = '';
		this.color = "";
		this.canDie = false;
		this.hp = false;
		this.isPlayer = false;
	}
	/**
	 * Verifies the type of a object to be a type, otherwise throws an error
	 * @param {*} arg 
	 * @param {string} type
	 * @throws {TypeError} 
	 */
	verifyType (arg, type) {
		if (typeof arg !== type) {
			throw new TypeError(`EntityFactory: ${arg} is ${typeof arg} (expected ${type}!)`);
		}
		return;
	}
	setName (str) {
		this.verifyType(str, "string");
		this.name = str;
		return this; //chain
	}
	setX (x) {
		this.verifyType(x, "number");
		this.x = x;
		return this; //chain
	}
	setY (y) {
		this.verifyType(y, "number");
		this.y = y;
		return this; //chain
	}
	setCharacter (char) {
		this.verifyType(char, "string");
		this.character = char;
		return this;
	}
	setColor (color) {
		this.verifyType(color, "string");
		this.color = color;
		return this;
	}
	setMortal (bool) {
		this.verifyType(bool, "boolean");
		this.canDie = bool;
		return this;
	}
	setHp (hp) {
		this.verifyType(hp, "number");
		this.hp = hp;
		return this;
	}
	setIsPlayer (bool) {
		this.verifyType(bool, "boolean");
		this.isPlayer = bool;
		return this;
	}
	make () {
		return new LivingEntity(
			this.name,
			this.x,
			this.y,
			this.character,
			this.color,
			this.canDie,
			this.hp,
			this.isPlayer
		)
	}
}

class BufferEntity extends Entity {
	/**
	 * Entity for the buffer. Gives it position, and moves it relative to the player's position.
	 * 
	 * @implements Entity
	 * @see DisplaySystem.updateBuffer
	 * @class
	 */
	constructor () {
		super();
		this.position = new HasPosition(this, 0, 0);
		this.mover = new BufferCanMove(this, this.position);
		//this.display = new HasDisplay(this, this.position, "X", "#ff0000");

		this.Ai = new BufferAi(this, this.position, this.mover);
	}
}

class Item extends Entity {
	/**
	 * Item object entity.
	 * 
	 * @implements Entity
	 * @class
	 * @param {number} x x coordinate of item
	 * @param {number} y y coordinate of item
	 * @param {ItemInfo} itemInfo Information about the item
	 */
	constructor (x, y, itemInfo) {
		super();
		this.position = new HasPosition(this, x, y);
		this.itemInfo = itemInfo;

		this.display = new HasDisplay(this, this.position, itemInfo.character, itemInfo.color);
		this.pickup = new CanPickUp(this);
	}
}

class Decoration extends Entity {

	/**
	 * Decoration. No better than a tile, honestly. Used by bushes, etc
	 * 
	 * @implements Entity
	 * @param {number} x x coordinate of decoration
	 * @param {number} y y coordinate of decoration
	 * @param {string} character character representing decoration
	 * @param {string} color color of the character
	 */
	constructor (x, y, character, color) {
		super();
		this.position = new HasPosition(this, x, y);
		this.display = new HasDisplay(this, this.position, character, color);
	}

}


class Furniture extends Decoration {
	/**
	 * A decoration, but you can interact with it.
	 * 
	 * @implements Entity
	 * @extends Decoration
	 * @param {number} x x coordinate of furniture
	 * @param {number} y y coordinate of furniture
	 * @param {string} character character representing furniture
	 * @param {string} color color of the character
	 * @param {function} callback callback to call when player interacts with this item
	 */
	constructor (x, y, character, color, callback) {
		
	}
}



/*


*/


const playerFactory = new EntityFactory()
.setName("player")
.setCharacter('@')
.setColor("#ffffff")
.setMortal(true)
.setHp(10)
.setIsPlayer(true);

let player;

const npc = new EntityFactory()
.setName("npc")
.setCharacter('N')
.setColor("#ffffff")
.setMortal(true)
.setHp(2);

const lomb = new EntityFactory()
.setName("lomb")
.setCharacter('🐑')
.setColor("")
.setMortal(true)
.setHp(5);


const pie = new ItemInfo("pie", "⌷", "#daa520");
