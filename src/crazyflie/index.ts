import { Crazyradio } from '../drivers/crazyradio';

import { Commander } from './commander';

/**
 * Class for controlling a Crazyflie
 */

export class Crazyflie {

	commander: Commander;

	constructor(public radio: Crazyradio) {
		this.commander = new Commander(this);
	}

}
