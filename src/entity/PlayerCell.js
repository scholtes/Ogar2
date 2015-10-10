var Cell = require('./Cell');

function PlayerCell() {
    Cell.apply(this, Array.prototype.slice.call(arguments));

    this.cellType = 0;
    this.juggernautable = true; // Can be popped by a juggernaught
    this.recombineTicks = 0; // Ticks until the cell can recombine with other cells 
    this.ignoreCollision = false; // This is used by player cells so that they dont cause any problems when splitting
}

module.exports = PlayerCell;
PlayerCell.prototype = new Cell();

// Main Functions

PlayerCell.prototype.visibleCheck = function(box,centerPos) {
    // Use old fashioned checking method if cell is small
    if (this.mass < 100) {
        return this.collisionCheck(box.bottomY,box.topY,box.rightX,box.leftX);
    }

    // Checks if this cell is visible to the player
    var cellSize = this.getSize();
    var lenX = cellSize + box.width >> 0; // Width of cell + width of the box (Int)
    var lenY = cellSize + box.height >> 0; // Height of cell + height of the box (Int)

    return (this.abs(this.position.x - centerPos.x) < lenX) && (this.abs(this.position.y - centerPos.y) < lenY);
};

PlayerCell.prototype.simpleCollide = function(x1,y1,check,d) {
    // Simple collision check
    var len = d >> 0; // Width of cell + width of the box (Int)

    return (this.abs(x1 - check.position.x) < len) &&
           (this.abs(y1 - check.position.y) < len);
};

PlayerCell.prototype.calcMergeTime = function(base) {
    this.recombineTicks = base + ((0.02 * this.mass) >> 0); // Int (30 sec + (.02 * mass))
};

// Movement

PlayerCell.prototype.calcMove = function(x2, y2, gameServer) {
    var config = gameServer.config;
    var r = this.getSize(); // Cell radius
    
    // Get angle
    var deltaY = y2 - this.position.y;
    var deltaX = x2 - this.position.x;
    var angle = Math.atan2(deltaX,deltaY);
    
    if(isNaN(angle)) {
        return;
    }

    // Distance between mouse pointer and cell
    var dist = this.getDist(this.position.x,this.position.y,x2,y2);
    var speed = Math.min(this.getSpeed(),dist);

    var x1 = this.position.x + ( speed * Math.sin(angle) );
    var y1 = this.position.y + ( speed * Math.cos(angle) );

    // Collision check for other cells
    for (var i = 0; i < this.owner.cells.length;i++) {
        var cell = this.owner.cells[i];

        if ((this.nodeId == cell.nodeId) || (this.ignoreCollision)) {
            continue;
        }

        if ((cell.recombineTicks > 0) || (this.recombineTicks > 0)) {
            // Cannot recombine - Collision with your own cells
            var collisionDist = cell.getSize() + r; // Minimum distance between the 2 cells
            if (!this.simpleCollide(x1,y1,cell,collisionDist)) {
                // Skip
                continue;
            }

            // First collision check passed... now more precise checking
            dist = this.getDist(this.position.x,this.position.y,cell.position.x,cell.position.y);
            
            // Calculations
            if (dist < collisionDist) { // Collided
                // The moving cell pushes the colliding cell
                var newDeltaY = cell.position.y - y1;
                var newDeltaX = cell.position.x - x1;
                var newAngle = Math.atan2(newDeltaX,newDeltaY);

                var move = collisionDist - dist + 5;

                cell.position.x = cell.position.x + ( move * Math.sin(newAngle) ) >> 0;
                cell.position.y = cell.position.y + ( move * Math.cos(newAngle) ) >> 0;
            }
        }
    }
    
    gameServer.gameMode.onCellMove(x1,y1,this);

    // Handle wall wrapping
    var borderWidth = gameServer.config.borderRight - gameServer.config.borderLeft;
    var borderHeight = gameServer.config.borderBottom - gameServer.config.borderTop;

    x1 = (x1 + borderWidth) % borderWidth + gameServer.config.borderLeft;
    y1 = (y1 + borderHeight) % borderHeight + gameServer.config.borderTop;

    this.position.x = x1 >> 0;
    this.position.y = y1 >> 0;
};

// Override

PlayerCell.prototype.getEatingRange = function() {
    return this.getSize() * .4;
};

PlayerCell.prototype.onConsume = function(consumer,gameServer) {
    var thisOwnerWasJuggernaut = this.owner.juggernaut;
    // Make this player no longer a juggernaut, or they will
    // have to reload the page to play as a normal cell
    this.owner.makeNotJuggernaut();
    if(thisOwnerWasJuggernaut && consumer.juggernautable) {

        consumer.addMass(-this.mass);

        // This is code adapted from virus.onConsume
        var client = consumer.owner;
        
        var maxSplits = Math.floor(consumer.mass/16) - 1; // Maximum amount of splits
        var numSplits = gameServer.config.playerMaxCells - client.cells.length; // Get number of splits
        numSplits = Math.min(numSplits,maxSplits);
        var splitMass = Math.min(consumer.mass/(numSplits + 1), 36); // Maximum size of new splits

        // Cell cannot split any further
        if (numSplits <= 0) {
            return;
        }

        // Big cells will split into cells larger than 36 mass (1/4 of their mass)
        var bigSplits = 0;
        var endMass = consumer.mass - (numSplits * splitMass);
        if ((endMass > 300) && (numSplits > 0)) {
            bigSplits++;
            numSplits--;
        }
        if ((endMass > 1200) && (numSplits > 0)) {
            bigSplits++;
            numSplits--;
        }
        if ((endMass > 3000) && (numSplits > 0)) {
            bigSplits++;
            numSplits--;
        }

        // Splitting
        var angle = 0; // Starting angle
        for (var k = 0; k < numSplits; k++) {
            angle += 6/numSplits; // Get directions of splitting cells
            gameServer.newCellVirused(client, consumer, angle, splitMass,150);
            consumer.mass -= splitMass;
        }

        for (var k = 0; k < bigSplits; k++) {
            angle = Math.random() * 6.28; // Random directions
            splitMass = consumer.mass / 4;
            gameServer.newCellVirused(client, consumer, angle, splitMass,20);
            consumer.mass -= splitMass;
        }
        
        // Prevent consumer cell from merging with other cells
        consumer.calcMergeTime(gameServer.config.playerRecombineTime);

    } else {
        consumer.addMass(this.mass);
    }
};

PlayerCell.prototype.onAdd = function(gameServer) {
    // Add to special player node list
    gameServer.nodesPlayer.push(this);
    // Gamemode actions
    gameServer.gameMode.onCellAdd(this);
};

PlayerCell.prototype.onAutoMove = function(gameServer) {
    this.juggernautable = false;
    if (this.owner.cells.length == 2) {
        // Check for viruses
        var v = gameServer.getNearestVirus(this);
        // Swap with virus if it exists
        // +1 to avoid swapping when the cell is just
        // barely larger than the virus (looks unnatural)
        // This is not necessary, but looks nicer on the client
        if (v && v.mass > this.mass+1) {
            var thisAngle = this.getAngle();
            v.setAngle(thisAngle+3.14);
            v.setMoveEngineData(100,20);

            // Move the player's other cell
            // For loop just to avoid conditions
            // where the other cell might be inaccessable
            for(var i = 0; i < this.owner.cells.length; i++) {
                this.owner.cells[i].setAngle(thisAngle);
                this.owner.cells[i].setMoveEngineData(100,20);
                gameServer.setAsMovingNode(this.owner.cells[i]);
            }

            gameServer.setAsMovingNode(v);
            gameServer.removeNode(this);
            return true;
        }
    }
};

PlayerCell.prototype.onRemove = function(gameServer) {
    var index;
    // Remove from player cell list
    index = this.owner.cells.indexOf(this);
    if (index != -1) {
        this.owner.cells.splice(index, 1);
    }
    // Remove from special player controlled node list
    index = gameServer.nodesPlayer.indexOf(this);
    if (index != -1) {
        gameServer.nodesPlayer.splice(index, 1);
    }
    // Gamemode actions
    gameServer.gameMode.onCellRemove(this);
};

PlayerCell.prototype.moveDone = function(gameServer) {
    this.ignoreCollision = false;
    this.juggernautable = true;
};

// Lib

PlayerCell.prototype.abs = function(x) {
    return x < 0 ? -x : x;
}

PlayerCell.prototype.getDist = function(x1, y1, x2, y2) {
    var xs = x2 - x1;
    xs = xs * xs;

    var ys = y2 - y1;
    ys = ys * ys;

    return Math.sqrt(xs + ys);
}

