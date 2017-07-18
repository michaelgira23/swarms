import { Crazyflie } from '.';
import { PARAM_CHANNELS } from '../constants';
import { Ack } from '../packet';
import { TOC_TYPES, TOCFetcher } from './toc-fetcher';

import { EventEmitter } from 'events';

export class Parameters extends EventEmitter {

	tocFetcher = new TOCFetcher(this.crazyflie, TOC_TYPES.PARAM);

	/**
	 * Class for dealing with the 'parameters' port
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:commander)
	 */

	constructor(private crazyflie: Crazyflie) {
		super();

		this.crazyflie.radio.on('parameters', (ackPack: Ack) => {
			try {
				console.log('Param ack', ackPack);
				// Route the packet to the correct handler function
				switch (ackPack.channel) {
					case PARAM_CHANNELS.TOC:
						break;
					case PARAM_CHANNELS.READ:
						break;
					case PARAM_CHANNELS.WRITE:
						break;
					case PARAM_CHANNELS.MISC:
						break;
				}
			} catch (err) {
				this.emit('error', err);
			}
		});
	}

}
