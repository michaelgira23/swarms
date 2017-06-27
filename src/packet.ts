import * as _ from 'lodash';

/**
 * Represents a packet to send to the Crazyflie
 */

export class Packet {

	port = 0;
	channel = 0;

	data: Buffer = Buffer.alloc(31, null);

	constructor() {
		//
	}

	writeDouble(value: number) {
		//
	}

	export() {
		console.log('port', this.port);
		// Header (3rd byte)
		const header = Buffer.concat([
			// The destination port
			Buffer.from(this.port.toString(16), 'hex'),
			// Reserved for the link layer
			Buffer.from([0, 0]),
			// The destination channel
			Buffer.from(this.channel.toString(16), 'hex')
		]);

		const buffer = Buffer.concat([
			Buffer.from('AAAA', 'hex'),
			header
		]);

		// console.log('port', this.port.toString(16), Buffer.from([this.port]));
		// console.log('header', header);
		// console.log('data', this.data);
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
