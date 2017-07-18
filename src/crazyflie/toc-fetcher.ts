import { Crazyflie } from '.';
import {
	BUFFER_TYPES,
	GET_LOGGING_TYPE,
	LOGGING_CHANNELS,
	LOGGING_COMMANDS,
	PARAM_CHANNELS,
	PARAM_COMMANDS,
	PORTS
} from '../constants';
import { Packet } from '../packet';
import { wait, waitUntilEvent } from '../utils';
import { TOC, TOCItem } from './toc';

import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';

export class TOCFetcher extends EventEmitter {

	fetched = false;
	toc = new TOC();

	get cachePath() {
		let cacheFile;
		switch (this.type) {
			case TOC_TYPES.PARAM:
				cacheFile = 'param-toc.json';
				break;
			case TOC_TYPES.LOG:
				cacheFile = 'log-toc.json';
				break;
			default:
				return null;
		}
		return path.join(this.crazyflie.options.cacheDir, cacheFile);
	}

	// How many items in the table of contents according to the Crazyflie
	length: number;
	// Cyclic redundancy check - checksum for TOC caching
	crc: number;

	// Max amount of packets that can be programmed into the copter. Only available for logging TOC!
	maxPackets: number;
	// Max amount of operations that can be programmed into the copter. Only available for logging TOC!
	// (1 operation = 1 log variable retrieval programming)
	maxOperations: number;

	/**
	 * Fetches TOC from the Crazyflie. Specify port because both parameters and logging use the same system
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:param#toc_access)
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#table_of_content_access)
	 */

	constructor(private crazyflie: Crazyflie, public type: TOC_TYPES) {
		super();

		if (!(type in TOC_TYPES)) {
			throw new Error(`Invalid TOC type "${type}"!`);
		}
	}

	start() {
		const packet = new Packet();

		switch (this.type) {
			case TOC_TYPES.PARAM:
				packet.port = PORTS.PARAMETERS;
				packet.channel = PARAM_CHANNELS.TOC;
				packet.write('int8', PARAM_COMMANDS.TOC.GET_INFO);
				break;

			case TOC_TYPES.LOG:
				packet.port = PORTS.LOGGING;
				packet.channel = LOGGING_CHANNELS.TOC;
				packet.write('int8', LOGGING_COMMANDS.TOC.GET_INFO);
				break;
		}

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<TOC>(this, 'toc ready'));
	}

	async handleTOCInfo(data: Buffer) {
		const types = BUFFER_TYPES(data);
		this.length = types.int8.read(0);
		this.crc = types.int32.read(1);

		if (this.type === TOC_TYPES.LOG) {
			this.maxPackets = types.int8.read(5);
			this.maxOperations = types.int8.read(6);
		}

		// See if TOC is cached first
		const cache = await this.getTOCFromCache(this.crc);

		if (cache) {
			this.toc = cache;
			this.fetched = true;
			this.emit('toc ready', this.toc);
		} else {

			switch (this.type) {
				case TOC_TYPES.PARAM:
					// Reset param TOC pointer
					await this.resetTOCPointer();
					break;

				case TOC_TYPES.LOG:
					// Bombard the Crazyflie with TOC item requests until it fully complies
					while (this.toc.items.length < this.length) {
						this.fetchRemainingTOCItems();
						await wait(3000);
					}
					break;
			}
		}
	}

	/**
	 * Reset TOC pointer. For parameter TOC only!
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:param#toc_access)
	 */

	private resetTOCPointer() {
		if (this.type !== TOC_TYPES.PARAM) {
			throw new Error(`Resetting TOC pointer is only for parameter TOC's! Not for type "${this.type}"!`);
		}

		const packet = new Packet();
		packet.port = PORTS.PARAMETERS;
		packet.channel = PARAM_CHANNELS.TOC;

		packet.write('int8', PARAM_COMMANDS.TOC.RESET_POINTER);

		return this.crazyflie.radio.sendPacket(packet);
	}

	/**
	 * Loop through all TOC ids and see if we already have it. If not, retrieve it.
	 */

	private async fetchRemainingTOCItems() {
		for (let i = 0; i < this.length; i++) {
			if (!this.toc.getItemById(i)) {
				try {
					await this.fetchTOCItem(i);
				} catch (err) {
					this.emit('error', err);
				}
			}
		}
	}

	/**
	 * Fetch TOC item from the Crazyflie
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#get_toc_item)
	 */

	private fetchTOCItem(id: number) {
		if (0 > id || id >= this.length) {
			return Promise.reject(`Id "${id}" is out of range! (0-${this.length - 1} inclusive)`);
		}

		const packet = new Packet();

		switch (this.type) {
			case TOC_TYPES.PARAM:
				packet.port = PORTS.PARAMETERS;
				packet.channel = PARAM_CHANNELS.TOC;
				packet.write('int8', PARAM_COMMANDS.TOC.NEXT_ELEMENT);
				break;

			case TOC_TYPES.LOG:
				packet.port = PORTS.LOGGING;
				packet.channel = LOGGING_CHANNELS.TOC;
				packet.write('int8', LOGGING_COMMANDS.TOC.GET_ITEM);
				break;
		}

		packet.write('int8', id);

		return this.crazyflie.radio.sendPacket(packet);
	}

	/**
	 * Handle TOC item response
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#get_toc_item)
	 */

	async handleTOCItem(data: Buffer) {
		const types = BUFFER_TYPES(data);

		const id = types.int8.read(0);
		const type = GET_LOGGING_TYPE(types.int8.read(1));
		const [ group, name ] = data.slice(2).toString().split('\u0000');

		const item: TOCItem = {
			id,
			type,
			group,
			name
		};

		// Add TOC item if it isn't a duplicate
		if (this.toc.addItem(item)) {
			// We should tell somebody
			this.emit('toc item', item);

			// If that was the last item, cache TOC and alert the others!
			if (this.length === this.toc.items.length) {
				this.fetched = true;
				await this.cacheTOC(this.crc, this.toc.items);
				this.emit('toc ready', this.toc);
			}
		}
	}

	/**
	 * Save a TOC to cache
	 */

	cacheTOC(crc: number, items: TOCItem[]): Promise<void> {
		return this.getTOCCache()
			.then(existingCache => {
				if (!existingCache) {
					existingCache = {};
				}
				existingCache[crc] = items;
				// `fs as any` because Typescript picks the wrong type definition in the overloaded method
				return (fs as any).outputJson(this.cachePath, existingCache, { spaces: '\t' });
			});
	}

	/**
	 * Get TOC from cache according to cyclic redundancy check (checksum) value
	 * Will return null if no crc in cache
	 */

	getTOCFromCache(crc: number) {
		return this.getTOCCache()
			.then(cache => {
				if (cache && typeof cache[crc] !== 'undefined') {
					return new TOC(cache[crc]);
				}
				return null;
			});
	}

	/**
	 * Gets the complete TOC cache
	 * Will return null if file doesn't exist or invalid JSON
	 */

	getTOCCache(): Promise<TOCCache> {
		return fs.pathExists(this.cachePath)
			.then(exists => {
				if (!exists) {
					return null;
				}
				return fs.readJson(this.cachePath, { throws: false });
			});
	}

	/**
	 * Deletes cache
	 */

	clearCache() {
		return fs.remove(this.cachePath);
	}

}

export enum TOC_TYPES {
	PARAM = 2,
	LOG = 5
}

export interface TOCCache {
	[crc: number]: TOCItem[];
}
