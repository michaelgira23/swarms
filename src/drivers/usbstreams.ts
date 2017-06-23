/**
 * @file Wrappers around the node-usb stuff to be a node.js stream
 */

import { Readable, Writable } from 'stream';

// import * as usb from 'usb';

/**
 * Stream from dongle --> PC
 */

export class InStream extends Readable {

	/*
	constructor(private endpoint: usb.InEndpoint) {
		super();
	}

	private onData(chunk: Buffer) {
		//
	}

	private onError(err: Error) {
		//
	}

	private onEnd() {
		//
	}
	*/

}

/**
 * Stream from PC --> dongle
 */

export class OutStream extends Writable {

	/*
	constructor(private endpoint: usb.OutEndpoint) {
		super();
	}

	private onError() {
		//
	}

	private onEnd() {
		//
	}
	*/

}
