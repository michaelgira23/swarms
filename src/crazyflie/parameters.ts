import { Crazyflie } from '.';
import { CHANNELS, COMMANDS } from '../constants';
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
				// Route the packet to the correct handler function
				switch (ackPack.channel) {
					case CHANNELS.TOC:
						// Find out which command
						switch (ackPack.data[0]) {
							case COMMANDS.TOC.GET_ITEM:
								this.tocFetcher.handleTOCItem(ackPack.data.slice(1));
								break;
							case COMMANDS.TOC.GET_INFO:
								this.tocFetcher.handleTOCInfo(ackPack.data.slice(1));
								break;
						}
						break;
					case CHANNELS.PARAM.READ:
						break;
					case CHANNELS.PARAM.WRITE:
						break;
					case CHANNELS.PARAM.MISC:
						break;
				}
			} catch (err) {
				this.emit('error', err);
			}
		});
	}

}
