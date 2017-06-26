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
		const buffer = Buffer.concat([
			// Start token for synchronization
			Buffer.from('AAAA', 'hex'),
			// The destination channel
			Buffer.from(this.channel.toString(16), 'hex')
		]);

		console.log('Buffer', buffer);
		return buffer;
	}

}
