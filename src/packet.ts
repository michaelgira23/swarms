/**
 * Represents a packet to send to the Crazyflie
 */

export class Packet {

	private _port: number;
	private _channel: number;
	private _header: number;

	get port() {
		return this._port;
	}
	set port(value: number) {
		this._port = value;
		this.updateHeader();
	}

	get channel() {
		return this._channel;
	}
	set channel(value: number) {
		this._channel = value;
		this.updateHeader();
	}

	get header() {
		this.updateHeader();
		return this._header;
	}

	constructor(header: number = 0, public data: Buffer = null) {
		this._header = header | (0x3 << 2);
		this.port = (header & 0xF0) >> 4;
		this.channel = header & 0x03;
	}

	private updateHeader() {
		this._header = ((this.port & 0x0f) << 4) | (3 << 2) | (this.channel & 0x03);
		console.log('Update header', this._header.toString(2));
		console.log('Port', this._port);
		console.log('Channel', this._channel);
	}

}
