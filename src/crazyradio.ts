import { BUFFERS, CRAZYRADIO, DATA_RATES, RADIO_POWERS, VENDOR_REQUESTS } from './constants';

import * as _ from 'lodash';
import * as usb from 'usb';
import { promisify } from 'util';

export class Crazyradio {

	private initialized = false;
	// Crazyradio options
	options: CrazyradioOptions = defaultOptions;
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

	async init(options: CrazyradioOptions, device: usb.Device = Crazyradio.findRadios()[0]) {
		if (this.initialized) {
			return Promise.reject('Crazyradio already initialized!');
		}

		// Make sure there's device
		if (!device) {
			return Promise.reject('No Crazyradio dongle attached!');
		}
		this.device = device;

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

	/**
	 * Configure new options
	 */

	async configure(options: CrazyradioOptions) {
		// Default options
		options = Object.assign({}, defaultOptions, this.options, options);

		/** @TODO: Actually do something */
	}

	/**
	 * Close the dongle
	 */

	close() {
		return promisify(this.interface.release)()
			.then(() => {
				this.device.close();
				this.initialized = false;
			});
	}

	private sendVendorSetup(request: number, value: number, index: number = 0, data: Buffer | number = BUFFERS.NOTHING) {
		return promisify(this.device.controlTransfer)(
			VENDOR_REQUESTS.BM_REQUEST_TYPE,
			request,
			value,
			index,
			data
		);
	}

	private getVendorSetup(request: number, value: number, index: number, length: number) {
		return promisify(this.device.controlTransfer)(
			VENDOR_REQUESTS.BM_REQUEST_TYPE | usb.LIBUSB_ENDPOINT_IN,
			request,
			value,
			index,
			length
		);
	}

	setRadioChannel(channel: number) {
		if (0 > channel || channel > 125) {
			return Promise.reject('Channel out of range!');
		}
		this.options.channel = channel;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_RADIO_CHANNEL, channel);
	}

	setRadioAddress(address: number) {
		this.options.address = address;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_RADIO_ADDRESS, 0, 0, address);
	}

	setDataRate(rate: DATA_RATES) {
		if (!(rate in DATA_RATES)) {
			return Promise.reject('Data rate out of range!');
		}
		this.options.dataRate = rate;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_DATA_RATE, rate);
	}

	setRadioPower(power: RADIO_POWERS) {
		if (!(power in RADIO_POWERS)) {
			return Promise.reject('Radio power out of range!');
		}
		this.options.radioPower = power;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_RADIO_POWER, power);
	}

	setAutoRetryDelay(delay: number) {
		this.options.ard = delay;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_RADIO_ARD, delay);
	}

	setAutoRetryDelayMicroseconds(microseconds: number) {
		/*
		 * Auto Retransmit Delay in microseconds
		 * 0000 - Wait 250uS
		 * 0001 - Wait 500uS
		 * 0010 - Wait 750uS
		 * ........
		 * 1111 - Wait 4000uS
		 */

		let time = Math.floor(microseconds / 250);

		// Time limits
		if (time < 0) {
			time = 0;
		}
		if (time > 0xF) {
			time = 0xF;
		}

		return this.setAutoRetryDelay(time);
	}

	setAutoRetryDelayBytes(bytes: number) {
		return this.setAutoRetryDelay(0x80 | bytes);
	}

	setAutoRetryCount(count: number) {
		if (0 >= count || count <= 15) {
			return Promise.reject('Retry count out of range!');
		}
		this.options.arc = count;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_RADIO_ARC, count);
	}

	setAckEnable(active: boolean) {
		this.options.ackEnable = active;
		return this.sendVendorSetup(VENDOR_REQUESTS.ACK_ENABLE, (active ? 1 : 0));
	}

	setContCarrier(active: boolean) {
		this.options.contCarrier = active;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_CONT_CARRIER, (active ? 1 : 0));
	}

	scanChannels(start = 0, stop = 125, packet = BUFFERS.SOMETHING) {
		return this.sendVendorSetup(VENDOR_REQUESTS.SCAN_CHANNELS, start, stop, packet)
			.then(() => this.getVendorSetup(VENDOR_REQUESTS.SCAN_CHANNELS, 0, 0, 64));
	}

	/**
	 * Finds available Crazyradios plugged in via USB
	 */

	static findRadios(
		vid: number = CRAZYRADIO.VID,
		pid: number = CRAZYRADIO.PID
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
	channel: 2,
	address: 0xE7E7E7E7E7,
	dataRate: DATA_RATES['2M'],
	radioPower: RADIO_POWERS['0dBm'],
	ard: 0xA0,
	arc: 3,
	ackEnable: true,
	contCarrier: false
};

export interface CrazyradioOptions {
	channel?: number;
	address?: number;
	dataRate?: number;
	radioPower?: number;
	ard?: number;
	arc?: number;
	ackEnable?: boolean;
	contCarrier?: boolean;
}
