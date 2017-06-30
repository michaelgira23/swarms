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

	constructor(data?: Buffer) {
		if (data) {
			const headerInfo = Packet.parseHeader(data[0]);
			this.port = headerInfo.port;
			this.channel = headerInfo.channel;

			this.data = data.slice(1);
		}
	}

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

		// For chainability
		return this;
	}

	/**
	 * Generate header with current port and channel
	 * Header format located here:
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#packet_structure)
	 */

	getHeader() {
		// First 4 bits are port, next 2 bits are reserved for link layer, last 2 bits are for channel
		let header = (this.port & 0x0f) << 4 | (this.channel & 0x03);
		// Set link layer bits to 0 by applying this mask
		header &= ~(0x03 << 2);
		return header;
	}

	/**
	 * Export packet into a complete buffer to send to the Crazyflie
	 * Optionally specify serial port for alternate packet structure:
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#serial_port)
	 */

	export(serialPort = false) {
		const header = this.getHeader();

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

	/**
	 * Determine of two packets are equal to each other
	 */

	equals(other: Packet) {
		return (this.port === other.port)
			&& (this.channel === other.channel)
			&& this.data.equals(other.data);
	}

	/**
	 * You take the header... then you parse it
	 */

	static parseHeader(header: number) {
		return {
			port: (header & 0xf0) >> 4,
			channel: header & 0x03
		};
	}

}

/**
 * Acknowledge packet response from the Crazyflie
 * Header byte format is documented here:
 * (https://wiki.bitcraze.io/doc:crazyradio:usb:index#data_transfer)
 */

export class Ack extends Packet {

	ackHeader: number;
	retry: number;
	powerDetector: boolean;
	ackReceived: boolean;

	constructor(packet: Buffer) {
		super(packet.slice(1));

		this.ackHeader = packet[0];
		this.retry = this.ackHeader >> 4;
		this.powerDetector = !!(this.ackHeader & 0x02);
		this.ackReceived = !!(this.ackHeader & 0x01);

		// Don't allow any more changes to this class
		Object.freeze(this);
	}

	/**
	 * Determine if two ack packets are equal to each other
	 */

	equals(other: Ack): boolean {
		return (this.ackHeader === other.ackHeader)
			&& super.equals(other);
	}

	static emptyPing = new Ack(Buffer.from([0x01, 0xf0, 0x01]));

}
