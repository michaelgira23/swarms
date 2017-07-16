import { Crazyflie } from '..';
import {
	BLOCK_ERRORS,
	BUFFER_TYPES,
	GET_LOGGING_TYPE,
	LOGGING_CHANNELS,
	LOGGING_COMMANDS,
	LOGGING_TYPES,
	PORTS,
	Type
} from '../../constants';
import { Ack, Packet } from '../../packet';
import { wait, waitUntilEvent } from '../../utils';
import { TOC } from './toc';

import { EventEmitter } from 'events';
import * as fs from 'fs-extra';

export class Logging extends EventEmitter {

	// Table of Contents
	toc: TOC = new TOC();
	// How many items in the table of contents according to the Crazyflie
	tocLength: number;
	// Cyclic redundancy check - checksum for TOC caching
	tocCrc: number;
	// Max amount of packets that can be programmed into the copter
	tocMaxPackets: number;
	// Max amount of operations that can be programmed into the copter
	// (1 operation = 1 log variable retrieval programming)
	tocMaxOperations: number;

	// Keep track of blocks
	// (A block is a set of variables that the Crazyflie sends back at certain intervals)
	blocks: Block[] = [];
	// Counter for assigning block ids
	nextBlockId = 0;

	// Emit all logging variables from the `data` property
	data = new EventEmitter();

	/**
	 * Telemetry for the Crazyflie
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log)
	 */

	constructor(private crazyflie: Crazyflie) {
		super();

		this.crazyflie.radio.on('logging', (ackPack: Ack) => {
			try {
				// Route the packet to the correct handler function
				switch (ackPack.channel) {
					case LOGGING_CHANNELS.TOC:
						// Find out which command
						switch (ackPack.data[0]) {
							case LOGGING_COMMANDS.TOC.GET_ITEM:
								this.handleTOCItem(ackPack.data.slice(1));
								break;
							case LOGGING_COMMANDS.TOC.GET_INFO:
								this.handleTOC(ackPack.data.slice(1));
								break;
						}
						break;
					case LOGGING_CHANNELS.LOG_CTRL:
						this.handleBlock(ackPack.data);
						break;
					case LOGGING_CHANNELS.LOG_DATA:
						this.handleLogData(ackPack.data);
						break;
					default:
						this.emit('error', `Unrecognized logging channel "${ackPack.data[0]}"!`);
						break;
				}
			} catch (err) {
				this.emit('error', err);
			}
		});
	}

	/**
	 * Gets the table of contents from the Crazyflie.
	 * Crazyflie will also emit a 'toc ready' event once TOC and items are retrieved.
	 * TOC is required to retrieve logging values. Fetching can take up to ~30 seconds.
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#table_of_content_access)
	 */

	getTOC() {
		const packet = new Packet();
		packet.port = PORTS.LOGGING;
		packet.channel = LOGGING_CHANNELS.TOC;

		packet.write('int8', LOGGING_COMMANDS.TOC.GET_INFO);

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<TOC>(this, 'toc ready'));
	}

	/**
	 * Handle TOC response
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#get_info)
	 */

	private async handleTOC(data: Buffer) {
		const types = BUFFER_TYPES(data);
		this.tocLength = types.int8.read(0);
		this.tocCrc = types.int32.read(1);
		this.tocMaxPackets = types.int8.read(5);
		this.tocMaxOperations = types.int8.read(6);

		// See if TOC is cached first
		const cache = await this.getTOCFromCache(this.tocCrc);

		if (cache) {
			this.toc = cache;
			this.emit('toc ready', this.toc);
		} else {
			// Fall back to bombarding the Crazyflie with TOC item requests until it fully complies
			while (this.toc.items.length < this.tocLength) {
				this.fetchRemainingTOCItems();
				await wait(3000);
			}
		}
	}

	/**
	 * Loop through all TOC ids and see if we already have it. If not, retrieve it.
	 */

	private async fetchRemainingTOCItems() {
		for (let i = 0; i < this.tocLength; i++) {
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
	 * Gets the complete TOC cache
	 * Will return null if file doesn't exist or invalid JSON
	 */

	getTOCCache(): Promise<TOCCache> {
		const path = this.crazyflie.options.cachePath;
		return fs.pathExists(path)
			.then(exists => {
				if (!exists) {
					return null;
				}
				return fs.readJson(path, { throws: false });
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
	 * Save a TOC to cache
	 */

	cacheTOC(crc: number, items: TOCItem[]): Promise<void> {
		const path = this.crazyflie.options.cachePath;
		return this.getTOCCache()
			.then(existingCache => {
				if (!existingCache) {
					existingCache = {};
				}
				existingCache[crc] = items;
				// `fs as any` because Typescript picks the worng type definition in the overloaded method
				return (fs as any).outputJson(path, existingCache, { spaces: '\t' });
			});
	}

	/**
	 * Deletes cache
	 */

	clearCache() {
		const path = this.crazyflie.options.cachePath;
		return fs.remove(path);
	}

	/**
	 * Fetch TOC item from the Crazyflie
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#get_toc_item)
	 */

	private fetchTOCItem(id: number) {
		if (0 > id || id >= this.tocLength) {
			return Promise.reject(`Id "${id}" is out of range! (0-${this.tocLength - 1} inclusive)`);
		}

		const packet = new Packet();
		packet.port = PORTS.LOGGING;
		packet.channel = LOGGING_CHANNELS.TOC;

		packet
			.write('int8', LOGGING_COMMANDS.TOC.GET_ITEM)
			.write('int8', id);

		return this.crazyflie.radio.sendPacket(packet);
	}

	/**
	 * Handle TOC item response
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#get_toc_item)
	 */

	private async handleTOCItem(data: Buffer) {
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
			if (this.tocLength === this.toc.items.length) {
				await this.cacheTOC(this.tocCrc, this.toc.items);
				this.emit('toc ready', this.toc);
			}
		}
	}

	/**
	 * Start receiving data of TOC items. Creates a block of variables and activates it.
	 * You can access these variables using various events; check the documentation.
	 * You can optionally specify the interval in milliseconds for the Crazyflie to ping data back to the computer.
	 * (Floors to the nearest 10ms interval)
	 */

	async start(variables: TOCItem[], millisecondInterval = 100) {
		const period = Math.floor(millisecondInterval / 10);
		if (0 >= period || period > 0xFF) {
			return Promise.reject(`Interval "${millisecondInterval}ms" is out of range 10ms and 255000ms!`);
		}

		const block: Block = {
			id: this.nextBlockId++,
			variables
		};
		this.blocks.push(block);

		return this.createBlock(block)
			.then(() => this.startBlock(block.id, period));
	}

	/**
	 * Gets a block with a specified id from the `block` array. Not Crazyflie.
	 */

	getBlock(id: number) {
		let targetBlock = null;
		for (const block of this.blocks) {
			if (block.id === id) {
				targetBlock = block;
				break;
			}
		}
		return targetBlock;
	}

	/**
	 * Create a log block
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#log_settings_access_port_5_channel_1)
	 */

	createBlock(block: Block) {

		const packet = new Packet();
		packet.port = PORTS.LOGGING;
		packet.channel = LOGGING_CHANNELS.LOG_CTRL;

		packet
			.write('int8', LOGGING_COMMANDS.LOG_CTRL.CREATE_BLOCK)
			.write('int8', block.id);

		for (const variable of block.variables) {
			const type = LOGGING_TYPES[variable.type];
			packet
				.write('int8', type << 4 | type)
				.write('int8', variable.id);
		}

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<void>(this, 'create block'));
	}

	/**
	 * Appends variables to a block
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#log_settings_access_port_5_channel_1)
	 */

	appendToBlock(blockId: number, variables: TOCItem[]) {
		const block = this.getBlock(blockId);
		if (!block) {
			return Promise.reject(`Invalid block id "${blockId}"!`);
		}

		const packet = new Packet();
		packet.port = PORTS.LOGGING;
		packet.channel = LOGGING_CHANNELS.LOG_CTRL;

		packet
			.write('int8', LOGGING_COMMANDS.LOG_CTRL.APPEND_BLOCK)
			.write('int8', block.id);

		for (const variable of variables) {
			// @TODO test if this works...
			block.variables.push(variable);
			const type = LOGGING_TYPES[variable.type];
			packet
				.write('int8', type << 4 | type)
				.write('int8', variable.id);
		}

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<void>(this, 'append block'));
	}

	/**
	 * Deletes a block
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#log_settings_access_port_5_channel_1)
	 */

	deleteBlock(blockId: number) {
		let deleted = false;
		for (let i = 0; i < this.blocks.length; i++) {
			if (this.blocks[i].id === blockId) {
				this.blocks.splice(i--, 1);
				deleted = true;
			}
		}
		if (!deleted) {
			return Promise.resolve();
		}

		// If we deleted something, delete on Crazyflie too
		const packet = new Packet();
		packet.port = PORTS.LOGGING;
		packet.channel = LOGGING_CHANNELS.LOG_CTRL;

		packet
			.write('int8', LOGGING_COMMANDS.LOG_CTRL.DELETE_BLOCK)
			.write('int8', blockId);

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<void>(this, 'delete block'));
	}

	/**
	 * Activate a block so logging data is sent back to computer at a certain interval.
	 * Interval is specified in increments of 10ms (1 = 10ms, 2 = 20ms, etc...)
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#log_settings_access_port_5_channel_1)
	 */

	startBlock(blockId: number, interval: number) {
		if (0 >= interval || interval > 0xFF) {
			return Promise.reject(`Interval "${interval}" is out of range 1 to 255!`);
		}
		if (!this.getBlock(blockId)) {
			return Promise.reject(`Invalid block id "${blockId}"!`);
		}

		const packet = new Packet();
		packet.port = PORTS.LOGGING;
		packet.channel = LOGGING_CHANNELS.LOG_CTRL;

		packet
			.write('int8', LOGGING_COMMANDS.LOG_CTRL.START_BLOCK)
			.write('int8', blockId)
			.write('int8', interval);

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<void>(this, 'start block'));
	}

	/**
	 * Deactivates a block so no more logging data is sent from that block
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#log_settings_access_port_5_channel_1)
	 */

	stopBlock(blockId: number) {
		if (!this.getBlock(blockId)) {
			return Promise.reject(`Invalid block id "${blockId}"!`);
		}

		const packet = new Packet();
		packet.port = PORTS.LOGGING;
		packet.channel = LOGGING_CHANNELS.LOG_CTRL;

		packet
			.write('int8', LOGGING_COMMANDS.LOG_CTRL.DELETE_BLOCK)
			.write('int8', blockId);

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<void>(this, 'delete block'));
	}

	/**
	 * Stop and delete all blocks
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#log_settings_access_port_5_channel_1)
	 */

	resetLog() {
		this.blocks = [];

		const packet = new Packet();
		packet.port = PORTS.LOGGING;
		packet.channel = LOGGING_CHANNELS.LOG_CTRL;

		packet.write('int8', LOGGING_COMMANDS.LOG_CTRL.RESET_LOG);

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<void>(this, 'reset log'));
	}

	/**
	 * Handle block response
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#log_settings_access_port_5_channel_1)
	 */

	private handleBlock(data: Buffer) {
		const types = BUFFER_TYPES(data);

		const command = types.int8.read(0);
		const blockId = types.int8.read(1);
		const status = types.int8.read(2);

		let error = null;
		if (status !== 0) {
			error = new Error(BLOCK_ERRORS[status].message);
			error.name = BLOCK_ERRORS[status].name;
			this.emit('error', error);
		}

		switch (command) {
			case LOGGING_COMMANDS.LOG_CTRL.CREATE_BLOCK:
				this.emit('create block', { error, blockId });
				break;
			case LOGGING_COMMANDS.LOG_CTRL.APPEND_BLOCK:
				this.emit('append block', { error, blockId });
				break;
			case LOGGING_COMMANDS.LOG_CTRL.DELETE_BLOCK:
				this.emit('delete block', { error, blockId });
				break;
			case LOGGING_COMMANDS.LOG_CTRL.START_BLOCK:
				this.emit('start block', { error, blockId });
				break;
			case LOGGING_COMMANDS.LOG_CTRL.STOP_BLOCK:
				this.emit('stop block', { error, blockId });
				break;
			case LOGGING_COMMANDS.LOG_CTRL.RESET_LOG:
				this.emit('reset log', { error });
				break;
			default:
				this.emit('error', `Unrecognized block command "${command}"!`);
				break;
		}
	}

	/**
	 * Handle incoming log data
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#log_data_access_port_5_channel_2)
	 */

	private handleLogData(data: Buffer) {
		const types = BUFFER_TYPES(data);

		const blockId = types.int8.read(0);
		// Timestamp is different because it's a 3-byte integer
		const timestamp = data.readIntLE(1, 3);

		// Get block so we know what variables are and their data types
		const block = this.getBlock(blockId);

		if (!block) {
			this.emit('error', `Received data for block id "${blockId}" but we don't have that block!`);
			return;
		}

		const logData: { [group: string]: { [name: string]: number } } = {};

		let pointer = 4;
		for (const variable of block.variables) {
			const type = types[variable.type];
			const logDatum = type.read(pointer);

			if (typeof logData[variable.group] === 'undefined') {
				logData[variable.group] = {};
			}
			logData[variable.group][variable.name] = logDatum;

			pointer += type.size;
		}

		// Global `*` event
		this.data.emit('*', logData);

		// Group-wide event
		for (const group of Object.keys(logData)) {
			this.data.emit(group, logData[group]);

			// Specific `group.name` event
			for (const name of Object.keys(logData[group])) {
				this.data.emit(`${group}.${name}`, logData[group][name]);
			}
		}
	}

}

export interface Block {
	id: number;
	variables: TOCItem[];
}

export interface TOCCache {
	[crc: number]: TOCItem[];
}

export interface TOCItem {
	id: number;
	type: string;
	group: string;
	name: string;
}
