import { Model, Neuron, tanh } from './main.js';

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const baseCreatureDiameter = 20;
const maxNameLen = 6;

const startingEnergy = 180;
const minEnergy = 30;
const reproductionThreshold = startingEnergy+minEnergy+40;
const sizeScaling = 0.05;
const baseFoodEnergyGain = 80;
const diminishingReturnsFactor = 2.3;
const swimmingCost = 0.15;
const tileBaseFoodContent = 50;
const movingCost = 0.02;
const foodAbundance = 0.5;
const agePenalty = 0.002;
const reproductionBenefit = 0.018;

const tileSize = 20;
const startingCreatures = 50;
const energyLoss = 0.02;
const dayLen = 24;
const networkStructure = [5, 6, 4];

//================= NETWORK STRUCTURE CONSTANTS ==================
const numInputs = 8;
const numOutputs = 4;
const maxLayers = 4;
const maxWidth = 8;
const BIAS = 52.8;
const repetitionCost = 0.01;
const activities = ["Moving", "Moving", 
	"Eating", "Attempting Reproduction"];
const tiles = ["Land", "Water", "Food"];


var selected;
var creatures = [];
var map = [];
var time = 0;
var days = 0;
var population = 0;
// Define creature class
class Creature {
	constructor(id, brainLayers, parentCreature) {
		population++;
		let layerStructure = [];
		if(parentCreature == null) {
			// Generate brain structure 
			const numLayers = Math.floor(Math.random()*maxLayers)-1;

			// Add constant input layer
			layerStructure.push(numInputs);

			for(let i=0; i<numLayers; i++) {
				layerStructure.push(Math.ceil(Math.random()*maxWidth));
			}
			// Add constant output layer 
			layerStructure.push(numOutputs);
		} else {
			layerStructure = brainLayers;
		}
		this.brain = new Model(...layerStructure);
		this.id = id;
		this.currentlyDoing = null;
		this.repetition = 0;
		this.dayBorn = days;

		// Get current tile being stood on
		const currTile = Math.round((this.x/tileSize)*(this.y/tileSize));
		this.tile = map[currTile];

		// Inherit family from parent if possible
		if(parentCreature == null) {
			this.family = [Math.random()*255, Math.random()*255,
				Math.random()*255];
			this.familyName = generateName();
			// Initalise position
			this.x = Math.random()*(canvas.width - 
				2 * baseCreatureDiameter) + baseCreatureDiameter;
			this.y = Math.random()*(canvas.height - 
				2 * baseCreatureDiameter) + baseCreatureDiameter;

		} else {
			this.family = parentCreature.family;
			this.familyName = parentCreature.familyName;
			this.x = parentCreature.x;
			this.y = parentCreature.y;
		}

		
		this.velocity = 0;
		
		this.energy = startingEnergy;
		this.diameter = baseCreatureDiameter;

		this.random = 0;
	}

	updateEnergy() {
		// Creatures always lose a small amount of energy
		let reBenefit = 0;
		if(this.currentlyDoing == 3) {reBenefit = reproductionBenefit;}
		this.energy -= (energyLoss + 
			(days-this.dayBorn) * agePenalty -
			reBenefit);

		this.diameter = baseCreatureDiameter + sizeScaling*this.energy;
	}

	getInfo() {
		// Returns the creature's information
		let info = [];
		//info.push(this.x/tileSize);
		//info.push(this.y/tileSize);
		info.push(this.energy-startingEnergy);
		info.push(this.velocity);
		
		// Get current tile being stood on
		this.tile = map[Math.round(this.x/tileSize)][Math.round(this.y/tileSize)];
		info.push(this.tile.type);
		info.push(this.tile.food);
		
		// Remind them of their current activity
		info.push(this.currentlyDoing);
		info.push(time);
		// Push age (proximity to death)
		info.push(days - this.dayBorn);

		this.random = (Math.random()-0.5)*BIAS;
		info.push(this.random);
		return info;
	}
}

var exitSim = false;

function runSim() {
	// Initialise creatures
	for(let i=0; i<startingCreatures; i++) {
		creatures.push(new Creature(i, networkStructure, null));
	}
	selected = startingCreatures[0];
	generateMap();
	window.requestAnimationFrame(drawFrame);
}

function generateMap() {
	const tileWidth = Math.round(canvas.width/tileSize);
	const tileHeight = Math.round(canvas.height/tileSize);

	// Iterate through all `tiles` of the map
	for(let x=0; x<tileWidth; x++) {
		map.push([]);
		for(let y=0; y<tileHeight; y++) {
			let currTile = {};
			// Pick land or water
			const tileType = Math.sin(0.15*x)-Math.cos(0.2*y)+
				(Math.random()-1)>0.65 ? 1:0;
			currTile.type = tileType;
			// land = 0   water = 1
			if(tileType===0) {
				if(Math.random()>1-foodAbundance) {
					currTile.food = tileBaseFoodContent;
				} else {
					currTile.food = 0;
				}
			} else {
				currTile.food = 0;
			}

			map[x].push(currTile);
		}
	}
	console.log(map);
}

function drawMap() {
	const tileWidth = map.length;
	const tileHeight = map[0].length;

	let tileNum = 0;
	for(let x=0; x<tileWidth; x++) {
		for(let y=0; y<tileHeight; y++) {
			if(map[x][y].type == 0) {
				// Draw land
				let red = 100 + map[x][y].food;
				let blue = 200 - red;
				ctx.fillStyle = `rgb(${red},200,100)`;
				ctx.fillRect(x*tileSize, y*tileSize, 
					tileSize, tileSize);
			} else {
				// Draw water
				ctx.fillStyle = "blue";
				ctx.fillRect(x*tileSize, y*tileSize, 
					tileSize, tileSize);
			}
			tileNum++;
		}
	}
}

function drawFrame() {
	/*================= Clear canvas ===========================*/
	ctx.fillStyle = "#ccc";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	/*==========================================================*/
	showCreatureInfo(selected);
	// Draw map
	drawMap();
	const popLabel = document.getElementById("count");
	const birthLabel = document.getElementById("births");
	popLabel.innerText = population;
	birthLabel.innerText = creatures.length - startingCreatures;
	// Draw all creatures
	for(let i=0; i<creatures.length; i++) {
		// Ignore dead creatures
		if(typeof(creatures[i]) != "object") {
			continue;
		}
		
		/* The creature's current sensory info 
		   [x, y, energy, currentTileType, ]     */
		const creatureInfo = creatures[i].getInfo();
		// Get creature's decision
		// [moveX, moveY, eat, reproduce]
		const results = creatures[i].brain.predict(...creatureInfo);
		// Get greatest decision
		let currGreatest = 0;
		for(let j=0; j<results.length; j++) {
			if(Math.abs(results[j]) > Math.abs(results[currGreatest])) {
				currGreatest = j;
			}
		}

		// If an acitvity has been repeated
		if(currGreatest == creatures[i].currentlyDoing) {
			creatures[i].repetition += repetitionCost;
		} else {
			creatures[i].repetition = 0;
		}

		creatures[i].currentlyDoing = currGreatest;
		//console.log(results);
		applyDecision(creatures[i], results, currGreatest);

		// Update creature's energy
		creatures[i].updateEnergy();
		// Drastically reduce energy in water
		if(creatures[i].tile.type === 1) {
			creatures[i].energy -= swimmingCost;
		}
		const currCreature = creatures[i];
		const diam = currCreature.diameter;

		// Blend between green and red for energy display
		ctx.fillStyle = `rgb(${255-currCreature.energy}, ${currCreature.energy}, 0)`;
		const color = currCreature.family;
		ctx.lineWidth = 10;
		ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
		ctx.beginPath();
		ctx.arc(currCreature.x, currCreature.y, diam/2, 0, 2*Math.PI);
		ctx.stroke();
		ctx.fill();
		ctx.closePath();
		// Draw black outline
		ctx.beginPath();
		ctx.lineWidth = 2;
		ctx.strokeStyle = "black";
		ctx.arc(currCreature.x, currCreature.y, (diam/2) + 5, 0, 2*Math.PI);
		ctx.stroke();
		// Check if creature has died
		if(creatures[i].energy < minEnergy) {
			population--;
			delete creatures[i];
		}
	}
	if(!exitSim) {
		time += 0.02;
		// Next day started
		if(time >= dayLen) {
			time = 0;
			days++;
			// Regrow a bunch of the food
			for(let i=0; i<map.length; i++) {
				for(let j=0; j<map[i].length; j++) {

					if(map[i][j].type == 0 && 
						Math.random() > 1 - foodAbundance) {
						// Replenish food
						map[i][j].food += tileBaseFoodContent/6;
					}
				}
			}
		}
		window.requestAnimationFrame(drawFrame);
	}
}

function applyDecision(creature, decisions, chosen) {
	

	switch (chosen) {
		case 0:
			// moveX
			if(creature.x + decisions[chosen] >= creature.diameter/2+5 && 
				creature.x + decisions[chosen] <= canvas.width - creature.diameter/2 - 5)
			{
				// Not against wall
				creature.x += decisions[chosen];
			} else {
				if(creature.x > canvas.width / 2) {
					// On the right side
					creature.x = creature.diameter/2 + 5;
				} else {
					// On the left
					creature.x = canvas.width - creature.diameter/2 - 5;
				}
			}
			creature.velocity += 1;
			creature.energy -= movingCost;
			break;
		case 1:
			// moveY
			if(creature.y + decisions[chosen] >= creature.diameter/2+5 && 
				creature.y + decisions[chosen] <= canvas.height - creature.diameter/2 - 5)
			{
				creature.y += decisions[chosen];
			} else {
				if(creature.y > canvas.height / 2) {
					// On the bottom
					creature.y = creature.diameter/2 + 5;
				} else {
					// On the top
					creature.y = canvas.height- creature.diameter/2 - 5;
				}
			}
			creature.velocity += 1;
			creature.energy -= movingCost;
			break;
		case 2:
			// Eat if possible
			const tileX = Math.round(creature.x/tileSize);
			const tileY = Math.round(creature.y/tileSize);
			const mapTile = map[tileX][tileY];
			if(mapTile.food <= 0) {
				break;
			}
			creature.velocity = 0;
			let energyGain = baseFoodEnergyGain/(diminishingReturnsFactor
				*creature.energy);
			creature.energy += energyGain;
			map[tileX][tileY].food -= energyGain;

			break;

		case 3:
			creature.velocity = 0;
			// Attempt to reproduce
			if(creature.energy >= reproductionThreshold) {
				// Condition satisfied
				
				// Add child to creature list
				const newCreature = new Creature(creatures.length,
					creature.brain.shape, creature);
				// Reproduce genes
				newCreature.brain = creature.brain.reproduce(newCreature.brain);
				console.log("Parent:");
				console.log(creature);
				console.log("Child:");
				console.log(newCreature);
				creatures.push(newCreature);
				creature.energy -= startingEnergy;
			}
			break;
		default:
			break;
	}
}

function generateName() {
	const vowels = "aeiou";
	const consonants = "bcdfghjklmnpqrstvwxyz";
	let name = "";
	for(let i=0; i<maxNameLen; i++) {
		const chosenCharType = Math.round(Math.random());
		if(chosenCharType == 0) {
			name += consonants[Math.round(
				Math.random()*(consonants.length - 1))]
		}else {
			name += vowels[Math.round(
				Math.random()*(vowels.length - 1))]

		}
	}
	return name;
}


function showCreatureInfo(c) {
	if(!c) {return;}
	// Write creature information
	const idLabel = document.getElementById("id");
	const famName = document.getElementById("name");
	const ageLabel = document.getElementById("age");
	const energyLabel = document.getElementById("energy");
	const activity = document.getElementById("activity");
	const ground = document.getElementById("tile");
	age.innerText = (days - c.dayBorn);
	idLabel.innerText = c.id;
	famName.innerText = c.familyName;
	energyLabel.innerText = Math.round(c.energy);
	activity.innerText = activities[c.currentlyDoing];
	//ground.innerText = `${Math.round(c.x/tileSize)}, ${Math.round(c.y/tileSize)}`;
	ground.innerText = tiles[c.tile.type];
	// Draw neural network 
	c.brain.drawModel("networkCanvas");
}

document.addEventListener("keydown", event => {
	if(event.keyCode == 81) {
		exitSim = true;
	}
});


canvas.addEventListener("click", event => {
	const rect = canvas.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const y = event.clientY - rect.top;
	ctx.beginPath();
	ctx.fillStyle = "white";
	ctx.arc(x, y, 20, 0, 2*Math.PI);
	ctx.fill();
	ctx.closePath();
	// Check if any creatures were clicked on
	for(let i=0; i<creatures.length; i++) {
		if(typeof(creatures[i]) != "object") {continue;}
		if(Math.abs(x - creatures[i].x) < creatures[i].diameter/2 &&
			Math.abs(y - creatures[i].y) < creatures[i].diameter/2)
		{
			
			selected = creatures[i];
			console.log(selected);
			break;
		}
	}
});


runSim();


