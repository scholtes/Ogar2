var Cell = require('./Cell');
var EjectedMass = require('./EjectedMass');
var MotherCell = require('./MotherCell');

function Beacon() {
    Cell.apply(this, Array.prototype.slice.call(arguments));

    this.cellType = 5; // Another new cell type
    this.agitated = 1; // Drawing purposes
    this.spiked = 1;

    this.stage = 0; // When it reaches 1000, kill largest player
    this.maxStage = 500;

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

    if(this.stage >= this.maxStage) {
        // Kill largest player and reset stage
        this.stage = 0;
        var largest = gameServer.leaderboard[0];
        if(largest) {
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