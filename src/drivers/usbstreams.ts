/**
 * @file Wrappers around the node-usb stuff to be a node.js stream
 */

import { Readable, Writable } from 'stream';
import * as usb from 'usb';
import { InEndpointWithOn, OutEndpointWithOn } from '../endpoints';

/**
 * Stream from dongle --> PC
 */

export class InStream extends Readable {

	constructor(private endpoint: usb.InEndpoint) {
		super();
		(this.endpoint as InEndpointWithOn).on('data', this.onData.bind(this));
		(this.endpoint as InEndpointWithOn).on('error', this.onError.bind(this));
		(this.endpoint as InEndpointWithOn).on('end', this.onEnd.bind(this));
	}

	_read(size: number) {
		console.log('InStream - Read:', size);
	}

	private onData(chunk: Buffer) {
		console.log('InStream - OnData:', chunk);
		if (!this.push(chunk)) {
			// Disable line because callback is required, but we don't need anything in it (?)
			// tslint:disable-next-line:no-empty
			this.endpoint.stopPoll(() => {});
		}
	}

	private onError(err: Error) {
		console.log('InStream - OnError:', err);
		this.emit('error', err);
	}

	private onEnd() {
		console.log('InStream - OnEnd');
	}

}

/**
 * Stream from PC --> dongle
 */

export class OutStream extends Writable {

	constructor(private endpoint: usb.OutEndpoint) {
		super();
		(this.endpoint as OutEndpointWithOn).on('error', this.onError.bind(this));
		(this.endpoint as OutEndpointWithOn).on('end', this.onEnd.bind(this));
	}

	_write(chunk: Buffer, encoding: string, callback: (err?: string) => void) {
		this.endpoint.transfer(chunk, callback);
	}

	private onError(err: Error) {
		console.log('OutStream - OnError:', err);
		this.emit('error', err);
	}

	private onEnd() {
		console.log('OutStream - OnEnd');
	}

}
