import { BUFFER_TYPES, MAX_PAYLOAD_SIZE, Type } from './constants';

import * as _ from 'lodash';

/**
 * Represents a packet to send to the Crazyflie
 */

export class Packet {

	port = 0;
	channel = 0;

	pointer = 0;
	data: Buffer = Buffer.alloc(MAX_PAYLOAD_SIZE, null);

	write(value: number) {
		const stringValue = value.toString(16);

		if (this.pointer + stringValue.length > this.data.length) {
			throw new Error(`Writing "0x${stringValue}" exceeds payload length of ${this.data.length}!`);
		}

		this.data.write(stringValue, this.pointer, stringValue.length, 'hex');
		this.pointer += stringValue.length;
	}

	/**
	 * Write a type onto the packet payload
	 */

	writeType(type: Type, value: number) {
		const typeData = BUFFER_TYPES(this.data)[type];

		if (typeof typeData === 'undefined') {
			throw new Error(`Invalid type "${type}"!`);
		}
		if (this.pointer + typeData.size > this.data.length) {
			throw new Error(`Writing type "${type}" exceeds payload length of ${this.data.length}!`);
		}

		typeData.write(value, this.pointer);
		this.pointer += typeData.size;

		console.log('Write', this.pointer, this.data);
	}

	export() {
		const header = Buffer.from(((this.port & 0x0f) << 4 | 0x03 << 2 | (this.channel & 0x03)).toString(16), 'hex');
		const payload = this.data.slice(0, this.pointer);

		const packet = Buffer.concat([
			header,
			Buffer.from(payload.length.toString(16), 'hex'),
			payload
		]);

		let ckSum = 0;
		for (const byte of packet) {
			ckSum += byte;
		}
		ckSum %= 256;

		const buffer = Buffer.concat([
			Buffer.from('aaaa', 'hex'),
			packet,
			Buffer.from(ckSum.toString(16), 'hex')
		]);

		return buffer;
	}

	exportHexCodes() {
		const buffer = this.export();
		const hexes = [];
		for (const byte of buffer) {
			hexes.push(`0x${_.padStart(byte.toString(16), 2, '0')}`);
		}
		return hexes;
	}

}
