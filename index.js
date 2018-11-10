const w = 24, h = 24;
const map = function () {
    const map = [];
    class Tile {
        constructor (tile, fg, bg) {
            this.tile = [tile, fg, bg];
            this.inSight = false;
            this.hasSeen = false;
        }
    }
    function generateMap () {
        function callback (x, y, value) {
            map[x + y * w] = value == 1 ? new Tile("#", "", "") : new Tile(
                ROT.RNG.getItem(["*", ",", ".", "'", ";", "^"]),
                ROT.Color.toHex(ROT.Color.randomize([00, 77, 22], [00, 11, 00])), 
                ROT.Color.toHex(ROT.Color.randomize([00, 00, 00], [01, 11, 01]))
            ); 
        }
        new ROT.Map.Arena(w, h).create(callback);
    }
    generateMap();
    function queryMap (x, y) {
        return map[x + y * w];
    }
    function queryBlockablity (x, y) {
        if (x < 0 || x >= w || y < 0 || y >= h) return true;
        return map[x + y * w].tile[0] === "#";
    }
    function queryLight (x, y) {
        if (x < 0 || x >= w || y < 0 || y >= h) return false;
        return map[x + y * w].tile[0] !== "#";
    }
    return {queryMap, queryBlockablity, queryLight}
}();
const display = function () {
    const display = new ROT.Display({height: h, width: w, fontSize: 30});
    const container = display.getContainer();
    container.tabIndex = 1;
    document.getElementById("game").appendChild(container);

    class Screen {
        constructor (hasCursor, allowsMovement) {
            this.hasCursor = hasCursor;
            this.allowsMovement = allowsMovement;
        }
        moveCursor() {

        }
        updateBuffer () {

        }
        draw () {

        }
        drawOnBuffer () {

        }
    }
    class GameScreen extends Screen {
        constructor () {
            super(false, true);
            this.buffer = [];
            this.fov = new ROT.FOV.RecursiveShadowcasting(map.queryLight);
        }
        updateBuffer () {
            this.fov.compute(ECS.getPlayerLocs().x, ECS.getPlayerLocs().y, 10, function (x, y, r, visibility) {
                const tileHere = map.queryMap(x, y);
                tileHere.hasSeen = true;
                tileHere.inSight = true;
            })
            this.buffer = [];
            for (let i = 0; i < h; i++) {
                for (let j = 0; j < w; j++) {
                    const tileHere = map.queryMap(i, j);
                    if (tileHere.inSight) {
                        tileHere.inSight = false;
                        this.buffer[i + j * w] = tileHere.tile;
                    }
                    else {
                        this.buffer[i + j * w] = ["", "", ""]
                    }
                }
            }
        }
        draw () {
            display.clear();
            for (let i = 0; i < h; i++) {
                for (let j = 0; j < w; j++) {
                    const tile = this.buffer[i + j * w];
                    display.draw(i, j, ...tile);
                }
            }
        }
        drawOnBuffer (x, y, tile) {
            this.buffer[x + y * w] = tile;
        }
    }
    class InventoryScreen extends Screen {
        constructor () {
            super(true, false);
        }
        draw () {
            display.clear();
            display.drawText(0, 0, "Inventory");
        }
    }

    const gameScreen = new GameScreen();
    const inventoryScreen = new InventoryScreen();
    let currentScreen = gameScreen;
    function toggleInventory () {
        currentScreen == inventoryScreen ? currentScreen = gameScreen : currentScreen = inventoryScreen;
        currentScreen.draw();
    }
    function getCurrentScreen () {
        return currentScreen;
    }

    function hookEvent (callback) {
        return container.addEventListener("keydown", callback);
    }
    return {hookEvent, screen: getCurrentScreen, toggleInventory};
}();
const ECS = function () {
    const entities = [];
    class Entity {
        constructor (components) {
            this.id = entities.length + 1;
            this.components = components || [];
            entities.push(this);
        }
        addComponent (component) {
            if (this.components.indexOf(component) !== -1) {return}
            this.components.push(component);
            return this;
        }
        hasComponent (component) {
            for (let i = 0; i < this.components.length; i++) {
                if (component === this.components[i].name) return true;
            }
            return false;
        }
        getComponent (component) {
            for (let i = 0; i < this.components.length; i++) {
                if (component === this.components[i].name) return this.components[i];
            }
        }
    }

    const components = {};
    class Component {
        constructor (name) {
            this.name = name;
            components[name] = this;
        }
    }
    class PositionComponent extends Component {
        constructor(x, y) {
            super("position");
            this.x = x;
            this.y = y;
        }
    }
    class ControllableComponent extends Component {
        constructor() {
            super("controllable");
            this.stagedMove = [0, 0];
        }
    }
    class DisplayComponent extends Component {
        constructor (tile, color) {
            super("display");
            this.tile = tile;
            this.color = color;
        }
    }
    class InventoryComponent extends Component {

    }

    const systems = {};
    class System {
        constructor (name) {
            this.init();
            systems[name] = this;            
        }
        init () {}
        update () {}
    }
    class EntityLocationsSystem extends System {
        constructor () {
            super("entityLocations");
            this.entityLocations = new Map();
        }
        update () {
            this.entityLocations.clear();
            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (entity.hasComponent("position") && entity.hasComponent("display")) {
                    const position = entity.getComponent("position");
                    this.entityLocations.set(position.x + position.y * w, entity);
                }
            }
        }
        queryLocation (index) {
            return this.entityLocations.get(index);
        }
    }

    class MovementSystem extends System {
        constructor () {
            super("movement");
        }
        update () {
            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (entity.hasComponent("controllable") && entity.hasComponent("position")) {
                    const controllable = entity.getComponent("controllable");
                    const position = entity.getComponent("position")
                    function move (where) {
                        const hasEntity = queryLocation((position.x + where[0]) + (position.y + where[1]) * w);

                        const blocks = hasEntity ||  map.queryBlockablity(position.x + where[0], position.y + where[1]);
                        if (!blocks) {
                            position.x += where[0];
                            position.y += where[1];
                        }
                    }
                    move(controllable.stagedMove);
                }
            }
        }
    }
    
    class ControlSystem extends System {
        constructor () {
            super("control");
        }
        move (entity, cursorAffected, cursorWhere, where) {
            if (cursorAffected && display.screen().hasCursor) {display.screen().moveCursor(cursorWhere)}
            else if (display.screen().allowsMovement && !display.screen().hasCursor) {entity.getComponent("controllable").stagedMove = where}
            else {return}
        }
        w (entity) {
            this.move(entity, true, -1, [0, -1]);
        }
        a (entity) {
            this.move(entity, false, 0, [-1, 0]);
        }
        s (entity) {
            this.move(entity, true, 1, [0, 1]);
        }
        d (entity) {
            this.move(entity, false, 0, [1, 0]);
        }
        e () {
            display.toggleInventory();
        }
        init () {
            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (entity.hasComponent("controllable") && entity.hasComponent("position")) {
                    display.hookEvent((event)=>{
                        switch (event.key) {
                            case "w": this.w(entity); break;
                            case "a": this.a(entity); break;
                            case "s": this.s(entity); break;
                            case "d": this.d(entity); break;
                            case "e": this.e(entity); break;
                        }
                        updateAll();
                    });
                }
            }
        }
    }

    function queryLocation (index) {
        return systems.entityLocations.queryLocation(index);
    }

    function drawEntitiesOnBuffer () {
        buffer = [];
        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                if (queryLocation(i + j * w)) {
                    const entity = queryLocation(i + j * w);
                    const positionComponent = entity.getComponent("position");
                    const displayComponent = entity.getComponent("display");
                    display.screen().drawOnBuffer(positionComponent.x, positionComponent.y, [displayComponent.tile, "", ""]);
                }
            }
        }
    }

    function update () {
        systems.movement.update();
        systems.entityLocations.update();
        drawEntitiesOnBuffer();
    }
    function getPlayerLocs () {
        return entities[0].getComponent("position");
    }

    new Entity([new DisplayComponent("@", "#ffffff", 10), new PositionComponent(2, 2), new ControllableComponent()]);
    new Entity([new DisplayComponent("L", "#cccccc"), new PositionComponent(3, 5)])

    new MovementSystem();
    new ControlSystem();
    new EntityLocationsSystem();
    return {entities, update, queryLocation, getPlayerLocs}
}();
function updateAll () {
    display.screen().updateBuffer();
    ECS.update();
    display.screen().draw();
}
updateAll();
