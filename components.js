"use strict";
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
	list () {
		
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
		player.inventory.add(this.parent);
		mapSystem.clearEntity(this.parent.position.x, this.parent.position.y);
		delete this.parent.position;
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
		logger.logShow(`${this.parent.name} has died!`);
	}
	respawn () {
		this.dead = false;
		this.display.tile.bg = "";
		this.parent.blocks = true;
		logger.logShow(`${this.parent.name} has risen from the dead!`);
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
		logger.logShow(`${this.parent.name} breaks.`);
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
			logger.logShow(`${this.parent.name} is already dead!`);
			return;
		}
		const actualDamage = damage - this.defence;
		this.hp = this.hp - actualDamage;

		logger.logShow(`${this.parent.name} was hit for ${actualDamage}!`);

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
// "ai" hahaha you can call anything an AI in this day and age
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

class PlayerAi extends Ai {
	constructor (parent, positionComponent, mover) {
		super(parent, positionComponent, mover);
		this.pickingUp = false;
	}
	playerMoveFunction (direction, plusX, plusY) {
		if (this.doNotOutOfBoundsCheck(this.positionComponent.x, this.positionComponent.y, direction)) return;
		this.mover.move(plusX, plusY);
	}
	w () {
		if (this.pickingUp) {
			this.pickUp(0, -1);
		}
		else {this.playerMoveFunction("up", 0, -1)}
	}
	a () {
		if (this.pickingUp) {
			this.pickUp(-1, 0);
		}
		else {this.playerMoveFunction("left", -1, 0)}
	}
	s () {
		if (this.pickingUp) {
			this.pickUp(0, 1);
		}
		else {this.playerMoveFunction("down", 0, 1)}
	}
	d () {
		if (this.pickingUp) {
			this.pickUp(1, 0);
		}
		else {this.playerMoveFunction("right", 1, 0)}
	}
	pickUp (plusX, plusY) {
		const here = mapSystem.getTile(this.positionComponent.x + plusX, this.positionComponent.y + plusY);
		if (!here.entityHere || !here.entityHere instanceof Item) {logger.logShow("There's nothing to pick up there!")}
		else {
			logger.logShow(`You pick up a ${here.entityHere.itemInfo.name}.`);
			here.entityHere.pickup.pickup(); 
			updateAll();
		}
		this.pickingUp = false;
	}
	handleInput (input) {
		switch (input) { 
			case 'w': this.w(); break;
			case 's': this.s(); break;
			case 'a': this.a(); break;
			case 'd': this.d(); break;
			case 'e': this.showInventory(); break;
			case 'p': this.pickingUp = true; logger.logShow("Choose what to pick up..."); break;
			default: break;
		}
	}
	showInventory () {
		displaySystem.toggleShowInventory();
		displaySystem.update();
	}
}
class BufferAi extends Ai {
	constructor (parent, positionComponent, mover) {
		super(parent, positionComponent, mover);
	}
	handleInput (input) {
		//console.log(this.positionComponent.x + "," + this.positionComponent.y);
		switch (input) { 
			case 'w': this.up(); break;
			case 'a': this.left(); break;
			case 's': this.down(); break;
			case 'd': this.right(); break;

			default: break;
		}
	}
	up () {
		if (!mapSystem.checkMove(player, [0, -1]) || player.Ai.pickingUp) {return;}
		//Not sure if right/best solution. Keeps camera from "running away" at the edge
		if (this.doNotOutOfBoundsCheck(player.position.x, player.position.y, 'up')) return;
		updateAll();
		this.mover.move(0, -1);
	}
	down () {
		if (!mapSystem.checkMove(player, [0, 1])|| player.Ai.pickingUp) { return;}
		if (this.doNotOutOfBoundsCheck(player.position.x, player.position.y, 'down')) return;
		updateAll();
		this.mover.move(0, 1);
		
	}
	left () {
		if (!mapSystem.checkMove(player, [-1, 0])|| player.Ai.pickingUp) {return;}
		if (this.doNotOutOfBoundsCheck(player.position.x, player.position.y, 'left')) return;
		updateAll();
		this.mover.move(-1, 0);
	
	}
	right () {
		if (!mapSystem.checkMove(player, [1, 0])|| player.Ai.pickingUp) {return;}
		if (this.doNotOutOfBoundsCheck(player.position.x, player.position.y, 'right')) return;
		updateAll();
		this.mover.move(1, 0);
		
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