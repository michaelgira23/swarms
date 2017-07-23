import { BUFFER_TYPES, MAX_PAYLOAD_SIZE, Type } from './constants';
import { toHex } from './utils';

export class Packet {

	port = 0;
	channel = 0;

	length = 0;
	data: Buffer = Buffer.alloc(MAX_PAYLOAD_SIZE);

	/**
	 * Generate header with current port and channel
	 * Header format located here:
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#packet_structure)
	 */

	get header() {
		// First 4 bits are port, next 2 bits are reserved for link layer, last 2 bits are for channel
		let header = (this.port & 0x0f) << 4 | (this.channel & 0x03);
		// Set link layer bits to 0 by applying this mask
		header &= ~(0x03 << 2);
		return header;
	}

	/**
	 * Represents a packet to send to the Crazyflie
	 */

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
		if (this.length + typeData.size > this.data.length) {
			throw new Error(`Writing type "${type}" exceeds payload length of ${this.data.length}!`);
		}

		typeData.write(value, this.length);
		this.length += typeData.size;

		// For chainability
		return this;
	}

	/**
	 * Export packet into a complete buffer to send to the Crazyflie
	 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#packet_structure)
	 */

	export() {
		return Buffer.concat([
			Buffer.from(this.header.toString(16), 'hex'),
			this.data.slice(0, this.length)
		]);
	}

	/**
	 * Return an array of hex codes for debugging
	 */

	exportHexCodes() {
		const buffer = this.export();
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
