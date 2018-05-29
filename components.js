
class Component {
	constructor (parent, interpretedAs) {
		this.parent = parent;
		this.interpretedAs = interpretedAs;
	}
}
class HasName extends Component {

}
//implict exists on map
class HasPosition extends Component {
	constructor (parent, x, y) {
		super(parent, "position");			
		this.x = x;
		this.y = y;
	}
}
class BufferCanMove extends Component {
	constructor (parent, positionComponent) {
		super(parent, "mover");
		this.positionComponent = positionComponent;
	}
	move (plusX, plusY) {
		this.positionComponent.x += plusX;
		this.positionComponent.y += plusY;
	}
	moveTo (x, y) {
		this.positionComponent.x = x;
		this.positionComponent.y = y;
	}
}

class CanMove extends Component {
	constructor (parent, positionComponent) {
		super(parent, "mover");
		this.positionComponent = positionComponent;
		this.hasLastMoved = false;
	}
	move (plusX, plusY) {
		if (!mapSystem.checkMove(this.parent, [plusX, plusY])) {
			this.hasLastMoved = false;
			return false;
		}
		this.positionComponent.x += plusX || 0;
		this.positionComponent.y += plusY || 0;
		updateAll();
		this.hasLastMoved = true;
		return true;
	}
	moveTo (x, y) {
		this.positionComponent.x = x;
		this.positionComponent.y = y;
	}
}
class HasDisplay extends Component {
	constructor (parent, positionComponent, character, color, bg) {
		super(parent, "display");
		this.tile = new DisplayTile(character, color, bg);
		this.positionComponent = positionComponent;
	}
	getColor () {
		return this.tile.color;
	}
	getCharacter () {
		return this.tile.character;
	}
	setTile (character, color, bg) {
		this.tile.update(character, color, bg);
	}
}
class HasInventory extends Component {
	constructor (parent) {
		super(parent, "inventory");
		this.inventory = []; 
		this.items = 0;
	}
	add (item) {
		this.inventory.push(item);
		this.items++;
	}
	remove (item) {
		let pos = this.inventory.indexOf(item);
		this.inventory.splice(pos);
		this.items--;
	}
}
class WalkIntoAction extends Component {
	constructor (parent, callback) {
		super(parent, "collide");
		this.callback = callback;
	}
	call () {
		return this.callback.call(this.parent);
	}
}
class CanPickUp extends WalkIntoAction {
	constructor (parent) {
		super(parent);
	}
	pickup () {
		
	}
}
class CanDie extends Component {
	constructor (parent, display, isDead) {
		//Useless without IsDestructible, but we won't care, since this just stores a dead property
		super(parent, "mortal");
		this.display = display;
		this.dead = isDead || false;
	}
	die () {
		this.dead = true;
		this.display.tile.bg = "#ff0000";
		if (this.parent.blocks) this.parent.blocks = false;
		logger.log(`${this.parent.name} has died!`);
	}
	respawn () {
		this.dead = false;
		this.display.tile.bg = "";
		this.parent.blocks = true;
		logger.log(`${this.parent.name} has risen from the dead!`);
	}
}
class CanBreak extends CanDie {
	constructor (parent, display, isDead) {
		//Useless without IsDestructible, but we won't care, since this just stores a dead property
		super(parent, display, isDead);
		this.broken = this.dead;
	}
	die () {
		this.broken = true;
		if (this.parent.blocks) this.parent.blocks = false;
		logger.log(`${this.parent.name} breaks.`);
	}
}
class IsDestructible extends WalkIntoAction {
	constructor (parent, callback, hp, defence, canDie) {
		super(parent, callback);
		this.maxHP = hp;
		this.hp = hp;
		this.defence = defence;
		this.canDie = canDie;
	}
	attack (damage) {
		if (this.canDie.dead) {
			logger.log(`${this.parent.name} is already dead!`);
			return;
		}
		const actualDamage = damage - this.defence;
		this.hp = this.hp - actualDamage;

		logger.log(`${this.parent.name} was hit for ${actualDamage}!`);

		if (this.hp <= 0) {
			this.canDie.die();
		}
	}
	heal () {
		this.hp = this.maxHP;
	}
	respawn () {
		this.heal(); 
		this.canDie.respawn();
	}

}
class IsSign extends WalkIntoAction {
	cosntructor () {}
}
class Ai extends Component {
	constructor (parent, positionComponent, mover) {
		super(parent, "ai");
		this.positionComponent = positionComponent;
		this.mover = mover;
	}
	doNotOutOfBoundsCheck (x, y, dir) {
		switch (dir) {
			case 'up'   : if (y - 1 < 0)                  {return true} break;
			// >= because of 0 index (0 - 49 is 50 tiles)
			case 'down' : if (y + 1 >= mapOptions.height) {return true} break;
			case 'left' : if (x - 1 < 0)                  {return true} break;
			case 'right': if (x + 1 >= mapOptions.width)  {return true} break;
		}
		return false;
	}
}
//because dont repeat yourself
function playerMoveFunction (direction, plusX, plusY) {
	if (this.doNotOutOfBoundsCheck(this.positionComponent.x, this.positionComponent.y, direction)) return;
	this.mover.move(plusX, plusY);
}

class PlayerAi extends Ai {
	constructor (parent, positionComponent, mover) {
		super(parent, positionComponent, mover);
	}
	handleInput (input) {
		switch (input) { 
			case 87: playerMoveFunction.call(this, "up"   , 0,  -1); break;
			case 83: playerMoveFunction.call(this, "down" , 0,  +1); break;
			case 65: playerMoveFunction.call(this, "left" , -1,  0); break;
			case 68: playerMoveFunction.call(this, "right", +1,  0); break;
			case 76: this.look(); break;
			default: break;
		}
	}
	look () {

	}
}
class BufferAi extends Ai {
	constructor (parent, positionComponent, mover) {
		super(parent, positionComponent, mover);
	}
	handleInput (input) {
	//	console.log(this.positionComponent.x + "," + this.positionComponent.y);
		switch (input) { 
			case 87: this.up(); break;
			case 65: this.left(); break;
			case 83: this.down(); break;
			case 68: this.right(); break;

			default: break;
		}
	}
	up () {
		if (!player.mover.hasLastMoved) {updateAll(); return;}
		//Not sure if right/best solution. Keeps camera from "running away" at the edge
		if (this.doNotOutOfBoundsCheck(player.position.x, player.position.y, 'up')) return;
		updateAll();
		this.mover.move(0, -1);
		
	}
	down () {
		if (!player.mover.hasLastMoved) {updateAll(); return;}
		if (this.doNotOutOfBoundsCheck(player.position.x, player.position.y, 'down')) return;
		updateAll();
		this.mover.move(0, 1);
		
	}
	left () {
		if (!player.mover.hasLastMoved) {updateAll(); return;}
		if (this.doNotOutOfBoundsCheck(player.position.x, player.position.y, 'left')) return;
		updateAll();
		this.mover.move(-1, 0)
	
	}
	right () {
		if (!player.mover.hasLastMoved) {updateAll(); return;}
		if (this.doNotOutOfBoundsCheck(player.position.x, player.position.y, 'right')) return;
		updateAll();
		this.mover.move(1, 0)
		
	}
}
/* class NpcAi extends Ai {
	constructor (parent, positionComponent) {
		super(parent, positionComponent);
		this.wantsToGoTo = undefined;
		this.pathFinder = undefined;
		this.wantsToFollowPlayer = true;
	}	
	tick () {
		
	}
}
 */