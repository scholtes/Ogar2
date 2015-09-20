var Cell = require('./Cell');

function Virus() {
    Cell.apply(this, Array.prototype.slice.call(arguments));

    this.cellType = 2;
    this.spiked = 1;
    this.fed = 0;
    this.virusFeedAmount = null;
}

module.exports = Virus;
Virus.prototype = new Cell();

Virus.prototype.calcMove = null; // Only for player controlled movement

Virus.prototype.feed = function(feeder,gameServer) {
    this.mass += feeder.mass;
    this.fed++; // Increase feed count
    gameServer.removeNode(feeder);

    // Check if the virus is going to explode
    if (this.fed >= this.getVirusFeedAmount(gameServer)) {
        var baseAngle = feeder.getAngle();
        this.mass = gameServer.config.virusStartMass; // Reset mass
        this.virusFeedAmount = null; // Forces feed amount for THIS virus to change
        this.backfires = Math.random() < gameServer
                .config
                .virusBackfireProbability; // True if this shoot will backfire, false otherwise
        this.fed = 0;

        // Figure out how many new viruses to create
        var denominator = 1.0;
        var numNewVirus = 1;
        for (var i = 0; i < gameServer.config.virusSplitNoProb.length-1; i++)  {
            if (Math.random() < gameServer.config.virusSplitNoProb[i]/denominator) {
                break;
            }
            numNewVirus++;
            denominator -= gameServer.config.virusSplitNoProb[i];
        }

        // Now we can create the new viruses (with quantity numNewVirus)
        var angleOffset = -0.5*gameServer.config.virusSpreadAngle*(numNewVirus-1);
        for (i = 0; i < numNewVirus; i++) {
            this.setAngle(baseAngle + angleOffset);
            gameServer.shootVirus(this);
            angleOffset += gameServer.config.virusSpreadAngle;
        }
    }

};

// Main Functions

Virus.prototype.getEatingRange = function() {
    return this.getSize() * .4; // 0 for ejected cells
};

Virus.prototype.onConsume = function(consumer,gameServer) {
    var client = consumer.owner;

    if(client.juggernaut) {
        client.makeNotJuggernaut();
    }
    
    var maxSplits = Math.floor(consumer.mass/16) - 1; // Maximum amount of splits
    var numSplits = gameServer.config.playerMaxCells - client.cells.length; // Get number of splits
    numSplits = Math.min(numSplits,maxSplits);
    var splitMass = Math.min(consumer.mass/(numSplits + 1), 36); // Maximum size of new splits

    // Cell consumes mass before splitting
    consumer.addMass(this.mass);

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
};

Virus.prototype.onAdd = function(gameServer) {
    gameServer.nodesVirus.push(this);
};

Virus.prototype.onRemove = function(gameServer) {
    var index = gameServer.nodesVirus.indexOf(this);
    if (index != -1) {
        gameServer.nodesVirus.splice(index, 1);
    } else {
        console.log("[Warning] Tried to remove a non existing virus!");
    }
};

// Private

// Random integer between a and b inclusive
Virus.prototype.getVirusFeedAmount = function(gameServer) {
    if(this.virusFeedAmount === null) {
        this.virusFeedAmount = Math.floor(
                gameServer.config.virusMinFeedAmount
                + Math.random()*(
                gameServer.config.virusMaxFeedAmount
                - gameServer.config.virusMinFeedAmount
                + 1
                )
        );
    }
    return this.virusFeedAmount;
};
