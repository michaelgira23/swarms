import { Crazyradio } from '../drivers/crazyradio';

import { Commander } from './commander';
import { Logging } from './logging';

import { EventEmitter } from 'events';

/**
 * Class for controlling a Crazyflie
 */

export class Crazyflie extends EventEmitter {

	private initialized = false;

	commander: Commander;
	logging: Logging;

	constructor(public radio: Crazyradio) {
		super();

		this.commander = new Commander(this);
		this.logging = new Logging(this);
	}

	async init() {
		if (this.initialized) {
			return Promise.reject('Crazyflie already initialized!');
		}

		// Set values initially at 0 or else it won't work
		await this.commander.setpoint({
			roll: 0,
			pitch: 0,
			yaw: 0,
			thrust: 0
		});

		this.initialized = true;
	}

}
