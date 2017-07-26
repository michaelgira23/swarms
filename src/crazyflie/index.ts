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

	initialized = false;
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
		this.parameters.on('error', (err: any) => {
			this.emit('error', err);
		});
		this.logging.on('error', (err: any) => {
			this.emit('error', err);
		});
	}

	async init() {
		if (this.initialized) {
			return Promise.reject('Crazyflie already initialized!');
		}

		// Start interval to make sure Crazyflie maintains it's targetted roll, yaw, pitch, and thrust.
		// It dies out after a few seconds otherwise.
		this.commander.startSetpointInterval();
		// Make absolutely sure that all values are initially set at 0 or else propellers won't move!
		await this.commander.setpoint({
			roll: 0,
			yaw: 0,
			pitch: 0,
			thrust: 0
		});

		// Reset any previous logging
		await this.logging.reset();

		this.initialized = true;
	}

}

export interface CrazyflieOptions {
	cacheDir: string;
}
