export const mutationRate = 0.15;

export class Neuron {
	constructor(activationFn, nextWidth) {
		this.activationFn = activationFn;

		this.value = 0;

		this.outputs = new Array(nextWidth);
		// Randomly initialise all outputs
		for(let i=0; i<this.outputs.length; i++) {
			// Clamp random number between -1 and 1
			this.outputs[i] = (Math.random()*2) - 1;
		}
	}

	activate() {
		// Call activation function on self
		this.value = this.activationFn(this.value);
	}
}

export class Model {
	constructor(...layers) {
		this.layers = [];
		this.shape = [];
		// Create neuron layers
		for(let i=0; i<layers.length; i++) {
			this.layers.push([]);
			this.shape.push(layers[i]);

			for(let curr_neuron=0; curr_neuron<layers[i]; curr_neuron++) {
				let nextWidth = i+1<layers.length ? layers[i+1] : 0;
				let neuron = new Neuron(tanh, nextWidth);
				this.layers[i].push(neuron);
			}
		}
	}

	predict(...inputs) {
		// Verify input params
		if(inputs.length != this.layers[0].length) {
			console.error(`Invalid input parameters`);
		}
		// Set input layer values
		for(let i=0; i<this.layers[0].length; i++) {
			this.layers[0][i].value = inputs[i];
		}

		// Iterate through all layers (except for input)
		for(let i=1; i<this.layers.length; i++) {
			// Iterate through all neurons of the layer
			for(let j=0; j<this.layers[i].length; j++) {
				let weightedSum = 0;

				// Get weighted sum of previous outputs
				for(let k=0; k<this.layers[i-1].length; k++) {
					weightedSum += (this.layers[i-1][k].value * 
						this.layers[i-1][k].outputs[j]);
				}
				this.layers[i][j].value = weightedSum;
				this.layers[i][j].activate();
			}
		}
		let predictions = [];
		for(let i=0; i<this.layers[this.layers.length-1].length; i++) {
			predictions.push(this.layers[this.layers.length-1][i].value);
		}
		return predictions;
	}
	
	reproduce(child) {
		// Reproduction with slight mutation for evolution-based models
		
		// Iterate through all layers to apply small mutations
		for(let i=0; i<child.layers.length; i++) {
			// Iterate through all neurons in the layer
			for(let j=0; j<child.layers[i].length; j++) {
				// Go through all output weights
				for(let k=0; k<child.layers[i][j].outputs.length; k++) {
					child.layers[i][j].outputs[k] = (this.layers[i][j].outputs[k]
						+ (Math.random()-0.5) * mutationRate);
				}
			}
		}
		return child;
	}

	drawModel(canvasId) {
		const canvas = document.getElementById(canvasId);
		const ctx = canvas.getContext("2d");
		// Get max layer width
		let longest = 0;
		for(let i=0; i<this.layers.length; i++) {
			if(this.layers[i].length > longest) {
				longest = this.layers[i].length;
			}
		}

		const neuronDiam = 30;
		const xGap = 40;
		const yGap = 10;

		ctx.strokeStyle = "white";
		ctx.clearRect(0,0,canvas.width,canvas.height);
		for(let i=0; i<this.layers.length; i++) {
			for(let j=0; j<this.layers[i].length; j++) {
				ctx.lineWidth = 2;
				ctx.beginPath();
				// Draw current neuron
				ctx.arc(i*(neuronDiam+xGap)+neuronDiam/2+xGap,
					j*(neuronDiam+yGap)+neuronDiam/2+yGap,
					neuronDiam/2, 0, 2*Math.PI);
				// Draw all outputs from the current neuron
				ctx.lineWidth = 1;
				for(let k=0; k<this.layers[i][j].outputs.length; k++) {
					ctx.moveTo(i*(neuronDiam+xGap)+neuronDiam+xGap,
						j*(neuronDiam+yGap)+neuronDiam/2+yGap);

					ctx.lineTo(i*(neuronDiam+xGap)+neuronDiam+2*xGap,
						k*(neuronDiam+yGap)+neuronDiam/2+yGap);
				}

				ctx.stroke();
				ctx.closePath();
			}
		}
	}
}

export function tanh(x) {
	return Math.tanh(x);
}
