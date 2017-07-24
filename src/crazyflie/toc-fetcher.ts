import { Crazyflie } from '.';
import { BUFFER_TYPES, CHANNELS, COMMANDS, GET_LOGGING_TYPE, GET_PARAM_TYPE, PORTS, Type } from '../constants';
import { Packet } from '../packet';
import { wait, waitUntilEvent } from '../utils';
import { TOC, TOCItem } from './toc';

import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';

export class TOCFetcher extends EventEmitter {

	fetched = false;
	port: number;
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
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#table_of_content_access)
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:param#toc_access)
	 */

	constructor(private crazyflie: Crazyflie, public type: TOC_TYPES) {
		super();

		switch (this.type) {
			case TOC_TYPES.PARAM:
				this.port = PORTS.PARAMETERS;
				break;
			case TOC_TYPES.LOG:
				this.port = PORTS.LOGGING;
				break;
			default:
				throw new Error(`Invalid TOC type "${type}"!`);
		}
	}

	async start() {
		const packet = new Packet();
		packet.port = this.port;
		packet.channel = CHANNELS.TOC;

		packet.write('int8', COMMANDS.TOC.GET_INFO);

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
			// Bombard the Crazyflie with TOC item requests until all TOC items are received.
			// While this is contrary to what most other libraries do, it saves a bit of time instead of
			// sending a request for TOC item, waiting for response, then send request for next TOC item.
			while (this.toc.items.length < this.length) {
				this.fetchRemainingTOCItems();
				await wait(100);
			}
		}
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
		packet.port = this.port;
		packet.channel = CHANNELS.TOC;

		packet
			.write('int8', COMMANDS.TOC.GET_ITEM)
			.write('int8', id);

		return this.crazyflie.radio.sendPacket(packet);
	}

	/**
	 * Handle TOC item response
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#get_toc_item)
	 */

	async handleTOCItem(data: Buffer) {
		const types = BUFFER_TYPES(data);

		const id = types.int8.read(0);
		const metadata = types.int8.read(1);

		let type: Type;
		let readOnly = false;
		switch (this.type) {
			case TOC_TYPES.PARAM:
				type = GET_PARAM_TYPE(metadata & 0x0F);
				// If param type begins with 0x4_, then it's read only.
				readOnly = ((metadata & 0xF0) === 0x40);
				break;
			case TOC_TYPES.LOG:
				type = GET_LOGGING_TYPE(metadata);
				break;
		}

		const [ group, name ] = data.slice(2).toString().split('\u0000');

		const item: TOCItem = {
			id,
			type,
			group,
			name
		};

		if (readOnly) {
			item.readOnly = true;
		}

		// Add TOC item if it isn't a duplicate
		if (this.toc.addItem(item)) {
			// We should tell somebody
			this.emit('toc item', item);

			// If that was the last item, cache TOC and alert the others!
			if (this.toc.items.length === this.length) {
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

export const enum TOC_TYPES {
	PARAM,
	LOG
}

export interface TOCCache {
	[crc: number]: TOCItem[];
}
