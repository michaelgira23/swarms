/**
 * @file Wrappers around the node-usb stuff to be a node.js stream
 */

import { Readable, Writable } from 'stream';
import * as usb from 'usb';
import { InEndpointWithOn, OutEndpointWithOn } from '../usb-types-fix';

/**
 * Stream from dongle --> PC
 */

export class InStream extends Readable {

	polling = false;

	constructor(private endpoint: usb.InEndpoint) {
		super();
		(this.endpoint as InEndpointWithOn).on('data', this.onData.bind(this));
		(this.endpoint as InEndpointWithOn).on('error', this.onError.bind(this));
		(this.endpoint as InEndpointWithOn).on('end', this.onEnd.bind(this));
	}

	_read(size: number) {
		if (!this.polling) {
			this.polling = true;
			this.endpoint.startPoll(3, 64);
		}
	}

	private onData(chunk: Buffer) {
		if (!this.push(chunk)) {
			this.polling = false;
			// Disable line because callback is required, but we don't need anything in it (?)
			// tslint:disable-next-line:no-empty
			this.endpoint.stopPoll(() => {});
		}
	}

	private onError(err: Error) {
		this.emit('error', err);
	}

	private onEnd() {
		this.push(null);
	}

}

/**
 * Stream from PC --> dongle
 */

export class OutStream extends Writable {

	constructor(private endpoint: usb.OutEndpoint) {
		super({
			decodeStrings: false
		});
		(this.endpoint as OutEndpointWithOn).on('error', this.onError.bind(this));
	}

	_write(chunk: Buffer, encoding: string, callback: (err?: string) => void) {
		this.endpoint.transfer(chunk, callback);
	}

	private onError(err: Error) {
		this.emit('error', err);
	}

}
