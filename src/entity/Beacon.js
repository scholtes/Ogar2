var Cell = require('./Cell');
var EjectedMass = require('./EjectedMass');
var MotherCell = require('./MotherCell');
var MovingVirus = require('./MovingVirus');

function Beacon() {
    Cell.apply(this, Array.prototype.slice.call(arguments));

    this.cellType = 5; // Another new cell type
    this.agitated = 1; // Drawing purposes
    this.spiked = 1;

    this.stage = 0; // When it reaches 1000, kill largest player
    this.maxStage = 200;
    this.minMass = this.mass;

    this.color = {
        r: 255,
        g: 255,
        b: 255
    };
}

module.exports = Beacon;
Beacon.prototype = new Cell();

Beacon.prototype.feed = function(feeder, gameServer) {
    // Increase the stage ('voltage' if you will)
    this.stage++;
    this.mass = this.minMass + this.stage;

    // Spit out a nutrient
    this.spawnFood(gameServer);

    // Sometimes spit out a ejected mass
    if(Math.random() < 0.25) {
        this.spawnEjected(gameServer, gameServer.getRandomColor());
    }

    // Even more rarely spit out a moving virus
    if(Math.random() < 0.05) {
        var moving = new MovingVirus(
            gameServer.getNextNodeId(),
            null,
            {x: this.position.x, y: this.position.y},
            125 // mass
        );
        moving.angle = 6.28*Math.random();
        moving.setMoveEngineData(10+10*Math.random(), Infinity, 1);
        gameServer.movingNodes.push(moving);
        gameServer.addNode(moving);
    }

    if(this.stage >= this.maxStage) {
        // Kill largest player and reset stage
        this.stage = 0;

        var largest = gameServer.leaderboard[0];
        var color = gameServer.getRandomColor();
        if(largest) {
            color = largest.color;
            // Do something to each of their cells:
            for(var i = 0; i < largest.cells.length; i++) {
                var cell = largest.cells[i];
                while(cell.mass > 10) {
                    cell.mass -= gameServer.config.ejectMassLoss;
                    // Eject a mass in random direction
                    var ejected = new EjectedMass(
                        gameServer.getNextNodeId(),
                        null,
                        {x: cell.position.x, y: cell.position.y},
                        gameServer.config.ejectMass
                    );
                    ejected.setAngle(6.28*Math.random()) // Random angle [0, 2*pi)
                    ejected.setMoveEngineData(
                        Math.random()*gameServer.config.ejectSpeed,
                        35,
                        0.5 + 0.4*Math.random()
                    );
                    ejected.setColor(cell.getColor());
                    gameServer.addNode(ejected);
                    gameServer.setAsMovingNode(ejected);
                }
                cell.mass = 10;
            }
        }

        // Give back mass
        for(var i = 0; i < this.maxStage/4; i++) {
            this.spawnEjected(gameServer, color);
        }

        this.mass = this.minMass;
    }

    // Indicate stage via color
    this.color = {
        r: 255*(1 - this.stage/this.maxStage),
        g: 255*(1 - this.stage/this.maxStage),
        b: 255*(1 - this.stage/(2*this.maxStage))
    }

    gameServer.removeNode(feeder);
}

Beacon.prototype.onAdd = function(gameServer) {
    gameServer.gameMode.beacon = this;
}

Beacon.prototype.abs = MotherCell.prototype.abs;
Beacon.prototype.visibleCheck = MotherCell.prototype.visibleCheck;
Beacon.prototype.spawnFood = MotherCell.prototype.spawnFood;
Beacon.prototype.spawnEjected = function(gameServer, parentColor) {
    // Get starting position
    var angle = Math.random() * 6.28; // (Math.PI * 2) ??? Precision is not our greatest concern here
    var r = this.getSize();
    var pos = {
        x: this.position.x + ( r * Math.sin(angle) ),
        y: this.position.y + ( r * Math.cos(angle) )
    };

    // Spawn food
    var f = new EjectedMass(gameServer.getNextNodeId(), null, pos, gameServer.config.ejectMass);
    f.setColor(parentColor);

    gameServer.addNode(f);
    gameServer.currentFood++;
    
    // Move engine
    f.angle = angle;
    var dist = (Math.random() * 25) + 5; // Random distance
    f.setMoveEngineData(dist,15);
    
    gameServer.setAsMovingNode(f);
};