import { Crazyflie } from '.';
import { BLOCK_ERRORS, BUFFER_TYPES, CHANNELS, COMMANDS, LOGGING_TYPES, PORTS } from '../constants';
import { Ack, Packet } from '../packet';
import { waitUntilEvent } from '../utils';
import { TOC, TOCItem } from './toc';
import { TOC_TYPES, TOCFetcher } from './toc-fetcher';

import { EventEmitter } from 'events';

export class Logging extends EventEmitter {

	// Table of Contents
	tocFetcher = new TOCFetcher(this.crazyflie, TOC_TYPES.LOG);

	// Keep track of blocks
	// (A block is a set of variables that the Crazyflie sends back at certain intervals)
	blocks: Block[] = [];
	// Counter for assigning block ids
	private nextBlockId = 0;

	// Emit all logging variables from the `data` property
	data = new EventEmitter();

	/**
	 * Class for dealing with the 'logging' port (telemetry)
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:log)
	 */

	constructor(private crazyflie: Crazyflie) {
		super();

		this.crazyflie.radio.on('logging', (ackPack: Ack) => {
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
					case CHANNELS.LOG.CTRL:
						this.handleBlock(ackPack.data);
						break;
					case CHANNELS.LOG.DATA:
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
	 * Retrieve logging TOC from the Crazyflie.
	 * Required before getting any logging data!
	 */

	getTOC() {
		return this.tocFetcher.start();
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
		packet.channel = CHANNELS.LOG.CTRL;

		packet
			.write('int8', COMMANDS.LOG_CTRL.CREATE_BLOCK)
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
		packet.channel = CHANNELS.LOG.CTRL;

		packet
			.write('int8', COMMANDS.LOG_CTRL.APPEND_BLOCK)
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
		packet.channel = CHANNELS.LOG.CTRL;

		packet
			.write('int8', COMMANDS.LOG_CTRL.DELETE_BLOCK)
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
		packet.channel = CHANNELS.LOG.CTRL;

		packet
			.write('int8', COMMANDS.LOG_CTRL.START_BLOCK)
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
		packet.channel = CHANNELS.LOG.CTRL;

		packet
			.write('int8', COMMANDS.LOG_CTRL.DELETE_BLOCK)
			.write('int8', blockId);

		return this.crazyflie.radio.sendPacket(packet)
			.then(waitUntilEvent<void>(this, 'delete block'));
	}

	/**
	 * Stop and delete all blocks
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#log_settings_access_port_5_channel_1)
	 */

	reset() {
		this.blocks = [];

		const packet = new Packet();
		packet.port = PORTS.LOGGING;
		packet.channel = CHANNELS.LOG.CTRL;

		packet.write('int8', COMMANDS.LOG_CTRL.RESET_LOG);

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
			case COMMANDS.LOG_CTRL.CREATE_BLOCK:
				this.emit('create block', { error, blockId });
				break;
			case COMMANDS.LOG_CTRL.APPEND_BLOCK:
				this.emit('append block', { error, blockId });
				break;
			case COMMANDS.LOG_CTRL.DELETE_BLOCK:
				this.emit('delete block', { error, blockId });
				break;
			case COMMANDS.LOG_CTRL.START_BLOCK:
				this.emit('start block', { error, blockId });
				break;
			case COMMANDS.LOG_CTRL.STOP_BLOCK:
				this.emit('stop block', { error, blockId });
				break;
			case COMMANDS.LOG_CTRL.RESET_LOG:
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
		// const timestamp = data.readIntLE(1, 3);
		// However, we have no use for this at the moment

		// Get block so we know what variables are and their data types
		const block = this.getBlock(blockId);

		if (!block) {
			// If drone hasn't initialized yet, we're about to reset the log so any previous blocks should be deleted
			if (this.crazyflie.initialized) {
				this.emit('error', `Received data for block id "${blockId}" but we don't have that block!`);
			}
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
