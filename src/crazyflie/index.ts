import { Crazyradio } from '../drivers/crazyradio';

import { Commander } from './commander';
import { Logging } from './logging';
import { Parameters } from './parameters';

import { EventEmitter } from 'events';
import * as path from 'path';

export const defaultCrazyflieOptions: CrazyflieOptions = {
	cacheDir: path.join(__dirname, '..', '..', 'cache')
};

export class Crazyflie extends EventEmitter {

	private initialized = false;
	options: CrazyflieOptions = defaultCrazyflieOptions;

	commander = new Commander(this);
	parameters = new Parameters(this);
	logging = new Logging(this);

	/**
	 * Class for controlling a Crazyflie
	 */

	constructor(public radio: Crazyradio) {
		super();

		// Forward all errors to the global Crazyflie 'error' event
		this.logging.on('error', (err: any) => {
			this.emit('error', err);
		});
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

export interface CrazyflieOptions {
	cacheDir: string;
}
