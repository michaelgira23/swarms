import CONSTANTS from './constants';

import * as _ from 'lodash';
import * as usb from 'usb';

export class Crazyradio {

	private initialized = false;
	// Crazyradio options
	options: CrazyradioOptions;
	// Firmware version of Crazyradio
	version: number;

	// USB stuff
	private device: usb.Device = null;
	private interface: usb.Interface;
	private inEndpoint: usb.InEndpoint;
	private outEndpoint: usb.OutEndpoint;

	/**
	 * For doing all the asynchronous setup of the Crazyradio
	 */

	async init(options: CrazyradioOptions) {
		if (this.initialized) {
			return Promise.reject('Crazyradio already initialized!');
		}

		// Make sure there's device
		this.device = options.device || Crazyradio.findRadios()[0];
		if (!this.device) {
			return Promise.reject('No Crazyradio dongle attached!');
		}

		// Get firmware version of Crazyradio
		this.version = parseFloat(
			(this.device.deviceDescriptor.bcdDevice >> 8)
			+ '.' +
			(this.device.deviceDescriptor.bcdDevice & 0x0ff)
		);

		// Connect to dongle
		this.device.open();
		this.interface = this.device.interfaces[0];
		this.interface.claim();

		this.inEndpoint = this.interface.endpoints[0] as usb.InEndpoint;
		this.outEndpoint = this.interface.endpoints[1] as usb.OutEndpoint;

		// Configure Crazyradio
		try {
			await this.configure(options);
		} catch (err) {
			Promise.reject(`Problem configuring Crazyradio: ${err}`);
		}

		this.initialized = true;
	}

	async configure(options: CrazyradioOptions) {
		// Default options
		options = Object.assign({}, defaultOptions, this.options, options);

		/** @TODO: Actually do something */
	}

	/**
	 * Finds available Crazyradios plugged in via USB
	 */

	static findRadios(
		vid: number = CONSTANTS.CRAZYRADIO.DEVICE.VID,
		pid: number = CONSTANTS.CRAZYRADIO.DEVICE.PID
	) {
		const devices = usb.getDeviceList();
		// Only return devices that match the specified product id and vendor id
		return _.filter(devices, device =>
			(device.deviceDescriptor.idVendor === vid)
			&& (device.deviceDescriptor.idProduct === pid)
		);
	}
}

export const defaultOptions: CrazyradioOptions = {
	device: null,
	channel: 2,
	address: 0xE7E7E7E7E7,
	dataRate: CONSTANTS.CRAZYRADIO.DATA_RATES['2M'],
	radioPower: CONSTANTS.CRAZYRADIO.RADIO_POWERS['0dBm'],
	ard: 0xA0,
	arc: 3,
	ackEnable: true,
	contCarrier: false
};

export interface CrazyradioOptions {
	device?: usb.Device;
	channel?: number;
	address?: number;
	dataRate?: number;
	radioPower?: number;
	ard?: number;
	arc?: number;
	ackEnable?: boolean;
	contCarrier?: boolean;
}
