import { Crazyflie } from '.';
import { BUFFER_TYPES, CHANNELS, COMMANDS, PORTS } from '../constants';
import { Ack, Packet } from '../packet';
import { waitUntilEvent } from '../utils';
import { TOC, TOCItem } from './toc';
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
						this.handleParam(ackPack.data, 'get');
						break;
					case CHANNELS.PARAM.WRITE:
						this.handleParam(ackPack.data, 'set');
						break;
					case CHANNELS.PARAM.MISC:
						break;
				}
			} catch (err) {
				this.emit('error', err);
			}
		});
	}

	/**
	 * Retrieve logging TOC from the Crazyflie.
	 * Required before getting any logging data!
	 */

	getTOC(): Promise<TOC> {
		return this.tocFetcher.start();
	}

	/**
	 * Fetch the value of a parameter from the Crazyflie
	 */

	get(item: TOCItem) {

		const packet = new Packet();
		packet.port = PORTS.PARAMETERS;
		packet.channel = CHANNELS.PARAM.READ;

		packet.write('int8', item.id);

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<{ item: TOCItem, value: number }>(this, 'get'))
			.then(data => data.value);
	}

	/**
	 * Set the value of a parameter on the Crazyflie
	 */

	set(item: TOCItem, value: number) {

		if (item.readOnly) {
			return Promise.reject(`Cannot set property "${item.group}.${item.name}" because it is read-only!`);
		}

		const packet = new Packet();
		packet.port = PORTS.PARAMETERS;
		packet.channel = CHANNELS.PARAM.WRITE;

		packet
			.write('int8', item.id)
			.write(item.type, value);

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<{ item: TOCItem, value: number }>(this, 'set'))
			.then(data => data.value);
	}

	/**
	 * Handle parameter response. Identical for both getting and setting a parameter.
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:param#parameter_read)
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:param#parameter_write)
	 */

	private handleParam(data: Buffer, mode: string) {
		const types = BUFFER_TYPES(data);

		const id = types.int8.read(0);
		// Find out type of param so we can read appropriately
		const tocItem = this.tocFetcher.toc.getItemById(id);
		const paramValue = types[tocItem.type].read(1);

		this.emit(mode, {
			item: tocItem,
			value: paramValue
		});
	}

}
