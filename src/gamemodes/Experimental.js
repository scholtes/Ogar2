var FFA = require('./FFA'); // Base gamemode
var Cell = require('../entity/Cell');
var Food = require('../entity/Food');
var Virus = require('../entity/Virus');
var VirusFeed = require('../entity/Virus').prototype.feed;
var MotherCell = require('../entity/MotherCell');
var MovingVirus = require('../entity/MovingVirus');
var StickyCell = require('../entity/StickyCell');

function Experimental() {
    FFA.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 2;
    this.name = "Experimental";
    this.specByLeaderboard = true;
    
    // Gamemode Specific Variables
    this.nodesMother = [];
    this.nodesSticky = [];
    this.movingVirusCount = 0;
    this.tickMother = 0; 
    this.tickMotherS = 0;
    
    // Config
    this.motherCellMass = 200;
    this.motherCellMaxMass = 400;
    this.motherUpdateInterval = 5; // How many ticks it takes to update the mother cell (1 tick = 50 ms)
    this.motherSpawnInterval = 100; // How many ticks it takes to spawn another mother cell - Currently 5 seconds
    this.motherMinAmount = 5;

    this.movingVirusMass = 100;
    this.movingVirusMinAmount = 10;

    this.stickyMass = 75;
    this.stickyMinAmount = 2;
    this.stickyUpdateInterval = 1;
    this.tickSticky = 0;
}

module.exports = Experimental;
Experimental.prototype = new FFA();

// Gamemode Specific Functions

Experimental.prototype.updateMotherCells = function(gameServer) {
    for (var i in this.nodesMother) {
        var mother = this.nodesMother[i];
        
        // Checks
        mother.update(gameServer);
        mother.checkEat(gameServer);
    }
};

Experimental.prototype.updateStickyCells = function(gameServer) {
    for (var i in this.nodesSticky) {
        var sticky = this.nodesSticky[i];

        sticky.update(gameServer);
    }
};

Experimental.prototype.spawnMotherCell = function(gameServer) {
	// Checks if there are enough mother cells on the map
    if (this.nodesMother.length < this.motherMinAmount) {
        // Spawns a mother cell
        var pos =  gameServer.getRandomPosition();

        // Check for players
        for (var i = 0; i < gameServer.nodesPlayer.length; i++) {
            var check = gameServer.nodesPlayer[i];

            var r = check.getSize(); // Radius of checking player cell

            // Collision box
            var topY = check.position.y - r;
            var bottomY = check.position.y + r;
            var leftX = check.position.x - r;
            var rightX = check.position.x + r;

            // Check for collisions
            if (pos.y > bottomY) {
                continue;
            }

            if (pos.y < topY) {
                continue;
            }

            if (pos.x > rightX) {
                continue;
            }

            if (pos.x < leftX) {
                continue;
            }

            // Collided
            return;
        }

        // Spawn if no cells are colliding
        var m = new MotherCell(gameServer.getNextNodeId(), null, pos, this.motherCellMass);
        gameServer.addNode(m); 
    }
};

Experimental.prototype.spawnMovingVirus = function(gameServer) {
    // Checks if there are enough moving viruses on the map
    if (this.movingVirusCount < this.movingVirusMinAmount) {
        // Spawns a mother cell
        var pos =  gameServer.getRandomPosition();

        // Check for players
        for (var i = 0; i < gameServer.nodesPlayer.length; i++) {
            var check = gameServer.nodesPlayer[i];

            var r = check.getSize(); // Radius of checking player cell

            // Collision box
            var topY = check.position.y - r;
            var bottomY = check.position.y + r;
            var leftX = check.position.x - r;
            var rightX = check.position.x + r;

            // Check for collisions
            if (pos.y > bottomY) {
                continue;
            }

            if (pos.y < topY) {
                continue;
            }

            if (pos.x > rightX) {
                continue;
            }

            if (pos.x < leftX) {
                continue;
            }

            // Collided
            return;
        }

        // Spawn if no cells are colliding
        var m = new MovingVirus(gameServer.getNextNodeId(),
                                null,
                                pos,
                                this.movingVirusMass + Math.floor(50*Math.random())
        );
        gameServer.movingNodes.push(m);
        gameServer.addNode(m); 
    }
};

Experimental.prototype.spawnStickyCell = function(gameServer) {
    // Checks if there are enough mother cells on the map
    if (this.nodesSticky.length < this.stickyMinAmount) {
        // Spawns a mother cell
        var pos =  gameServer.getRandomPosition();

        // Check for players
        for (var i = 0; i < gameServer.nodesPlayer.length; i++) {
            var check = gameServer.nodesPlayer[i];

            var r = check.getSize(); // Radius of checking player cell

            // Collision box
            var topY = check.position.y - r;
            var bottomY = check.position.y + r;
            var leftX = check.position.x - r;
            var rightX = check.position.x + r;

            // Check for collisions
            if (pos.y > bottomY) {
                continue;
            }

            if (pos.y < topY) {
                continue;
            }

            if (pos.x > rightX) {
                continue;
            }

            if (pos.x < leftX) {
                continue;
            }

            // Collided
            return;
        }

        // Spawn if no cells are colliding
        var m = new StickyCell(gameServer.getNextNodeId(), null, pos, this.stickyMass);
        //gameServer.movingNodes.push(m);
        gameServer.addNode(m); 
    }
};

// Override

Experimental.prototype.onServerInit = function(gameServer) {
    // Called when the server starts
    gameServer.run = true;

    // Override this
    gameServer.getRandomSpawn = gameServer.getRandomPosition;
};

Experimental.prototype.onTick = function(gameServer) {
    // Mother Cell updates and MovingVirus updates
    if (this.tickMother >= this.motherUpdateInterval) {
    	this.updateMotherCells(gameServer);
    	this.tickMother = 0;
    } else {
    	this.tickMother++;
    }

    if (this.tickSticky >= this.stickyUpdateInterval) {
        this.updateStickyCells(gameServer);
        this.tickSticky = 0;
    } else {
        this.tickSticky++;
    }
    
    // Mother Cell Spawning
    if (this.tickMotherS >= this.motherSpawnInterval) {
    	this.spawnMotherCell(gameServer);
        this.spawnMovingVirus(gameServer);
        this.spawnStickyCell(gameServer);
    	this.tickMotherS = 0;
    } else {
    	this.tickMotherS++;
    }
};

Experimental.prototype.onChange = function(gameServer) {
    // Remove all mother cells
    for (var i in this.nodesMother) {
        gameServer.removeNode(this.nodesMother[i]);
    }
    // Add back default functions
    gameServer.getRandomSpawn = require('../GameServer').prototype.getRandomSpawn;
};