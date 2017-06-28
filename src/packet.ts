import { BUFFER_TYPES, MAX_PAYLOAD_SIZE, Type } from './constants';
import { toHex } from './utils';

import * as _ from 'lodash';

/**
 * Represents a packet to send to the Crazyflie
 */

export class Packet {

	port = 0;
	channel = 0;

	pointer = 0;
	data: Buffer = Buffer.alloc(MAX_PAYLOAD_SIZE);

	/**
	 * Write a type onto the packet payload
	 */

	write(type: Type, value: number) {
		const typeData = BUFFER_TYPES(this.data)[type];

		if (typeof typeData === 'undefined') {
			throw new Error(`Invalid type "${type}"!`);
		}
		if (this.pointer + typeData.size > this.data.length) {
			throw new Error(`Writing type "${type}" exceeds payload length of ${this.data.length}!`);
		}

		typeData.write(value, this.pointer);
		this.pointer += typeData.size;
	}

	/**
	 * Export packet into a complete buffer to send to the Crazyflie
	 * Optionally specify serial port for alternate packet structure:
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#serial_port)
	 */

	export(serialPort = false) {
		// First 4 bits are port, next 2 bits are reserved for link layer, last 2 bits are for channel
		let header = (this.port & 0x0f) << 4 | (this.channel & 0x03);
		// Set link layer bits to 0 by applying this mask
		header &= ~(0x03 << 2);

		// Slice data buffer to the actual payload we used
		const payload = this.data.slice(0, this.pointer);

		if (!serialPort) {
			return Buffer.concat([
				Buffer.from(header.toString(16), 'hex'),
				payload
			]);
		}

		// Put stuff together that we want to include in checksum
		const packet = Buffer.concat([
			Buffer.from(header.toString(16), 'hex'),
			Buffer.from(toHex(payload.length, true), 'hex'),
			payload
		]);

		// Count up packet to get checksum
		let cksum = 0;
		for (const byte of packet) {
			cksum += byte;
		}
		cksum %= 256;

		// Include final things (start token and checksum)
		return Buffer.concat([
			Buffer.from('aaaa', 'hex'),
			packet,
			Buffer.from(cksum.toString(16), 'hex')
		]);
	}

	/**
	 * Return an array of hex codes for debugging
	 */

	exportHexCodes(serialPort?: boolean) {
		const buffer = this.export(serialPort);
		const hexes = [];
		for (const byte of buffer) {
			hexes.push(toHex(byte, true, true));
		}
		return hexes;
	}

}
