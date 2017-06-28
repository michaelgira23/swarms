import {
	BM_REQUEST_TYPE,
	BUFFERS,
	CRAZYRADIO,
	DATA_RATES,
	GET_DATA_RATE,
	GET_RADIO_POWER,
	RADIO_POWERS,
	VENDOR_REQUESTS
} from '../constants';
import { Packet } from '../packet';
import { Uri } from '../uri';
import { toHex } from '../utils';
import { InStream, OutStream } from './usbstreams';

import * as _ from 'lodash';
import * as usb from 'usb';

/**
 * Class for controlling the Crazyradio
 */

export class Crazyradio {

	private initialized = false;
	// Crazyradio options
	options: CrazyradioOptions = defaultOptions;
	// Firmware version of Crazyradio
	version: number;

	// USB stuff
	private device: usb.Device;
	private interface: usb.Interface;
	// Endpoint in the IN direction (dongle --> PC)
	private inEndpoint: usb.InEndpoint;
	// Endpoint in the OUT direction (PC --> dongle)
	private outEndpoint: usb.OutEndpoint;

	// USB streams
	private inStream: InStream;
	private outStream: OutStream;

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

		// Initialize USB streams
		this.inStream = new InStream(this.inEndpoint);
		this.outStream = new OutStream(this.outEndpoint);

		this.inStream.on('data', this.onInStreamData.bind(this));
		this.inStream.on('readable', this.onInStreamReadable.bind(this));
		this.inStream.on('error', this.onInStreamError.bind(this));

		this.initialized = true;
	}

	/**
	 * Configure new options
	 */

	configure(options: CrazyradioOptions) {
		// Default options
		options = Object.assign({}, defaultOptions, this.options, options);

		return this.setRadioChannel(options.channel)
			.then(() => this.setRadioAddress(options.address))
			.then(() => this.setDataRate(options.dataRate))
			.then(() => this.setRadioPower(options.radioPower))
			.then(() => this.setAckRetryDelay(options.ard))
			.then(() => this.setAckRetryCount(options.arc))
			.then(() => this.setAckEnable(options.ackEnable))
			.then(() => this.setContCarrier(options.contCarrier));
	}

	/**
	 * Close the dongle
	 */

	close() {
		return new Promise((resolve, reject) => {
			this.interface.release(err => {
				if (err) {
					reject(err);
					return;
				}
				this.device.close();
				this.initialized = false;
				resolve();
			});
		});
	}

	/**
	 * Tune into the correct parameters to connect to a Crazyflie uri
	 */

	connect(uri: Uri) {
		return this.configure({
			dataRate: uri.dataRate,
			channel: uri.channel
		});
	}

	/**
	 * Scan for any nearby Crazyflies
	 */

	async findDrones() {
		try {
			await this.setAckRetryCount(1);
			let drones: Uri[] = [];
			for (const rate of Object.keys(DATA_RATES)) {
				drones = drones.concat(await this.scanRange(DATA_RATES[rate]));
			}
			return Promise.resolve(drones);
		} catch (err) {
			return Promise.reject(err);
		}
	}

	/**
	 * Scan for any drones on a specific data rate
	 */

	scanRange(dataRate: number): Promise<Uri[]> {
		return this.setDataRate(dataRate)
			.then(() => this.scanChannels())
			.then((drones: Buffer) => {
				const uris = [];
				for (const drone of drones) {
					uris.push(new Uri(dataRate, drone));
				}
				return uris;
			});
	}

	/**
	 * Ping the Crazyflie
	 */

	ping() {
		const packet = new Packet();
		packet.port = 15;
		packet.write('int8', 0x01);
		return this.sendPacket(packet);
	}

	/**
	 * Communicating with the Crazyflies
	 */

	sendPacket(packet: Packet) {
		return new Promise((resolve, reject) => {
			this.outStream.write(packet.export(), (err: string) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	private onInStreamReadable(data: any) {
		console.log('InStream Crazyradio Readable:', data);
	}

	private onInStreamData(data: any) {
		console.log('InStream Crazyradio Data:', data);
	}

	private onInStreamError(err: string) {
		console.log('InStream Crazyradio Error:', err);
	}

	/**
	 * Configuration functions
	 */

	setRadioChannel(channel: number) {
		if (0 > channel || channel > 125) {
			return Promise.reject(`Channel out of range! (${channel})`);
		}
		this.options.channel = channel;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_RADIO_CHANNEL, channel);
	}

	setRadioAddress(address: number) {
		this.options.address = address;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_RADIO_ADDRESS, 0, 0, Buffer.from(toHex(address), 'hex'));
	}

	setDataRate(rate: number) {
		if (GET_DATA_RATE(rate) === null) {
			return Promise.reject(`Data rate out of range! (${rate})`);
		}
		this.options.dataRate = rate;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_DATA_RATE, rate);
	}

	setRadioPower(power: number) {
		if (GET_RADIO_POWER(power) === null) {
			return Promise.reject(`Radio power out of range! (${power})`);
		}
		this.options.radioPower = power;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_RADIO_POWER, power);
	}

	setAckRetryDelay(delay: number) {
		this.options.ard = delay;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_RADIO_ARD, delay);
	}

	setAckRetryDelayMicroseconds(microseconds: number) {

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

		return this.setAckRetryDelay(time);
	}

	setAckRetryDelayBytes(bytes: number) {
		return this.setAckRetryDelay(0x80 | bytes);
	}

	setAckRetryCount(count: number) {
		if (0 > count || count > 15) {
			return Promise.reject(`Retry count out of range! (${count})`);
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

	scanChannels(start = 0, stop = 125, packet = BUFFERS.SOMETHING): Promise<Buffer> {
		return this.sendVendorSetup(VENDOR_REQUESTS.SCAN_CHANNELS, start, stop, packet)
			.then(() => this.getVendorSetup(VENDOR_REQUESTS.SCAN_CHANNELS, 0, 0, 64));
	}

	private sendVendorSetup(request: number, value: number, index = 0, data: Buffer | number = BUFFERS.NOTHING) {
		return new Promise((resolve, reject) => {
			this.device.controlTransfer(
				BM_REQUEST_TYPE,
				request,
				value,
				index,
				data,
				(err, res) => {
					if (err) {
						reject(err);
					} else {
						resolve(res);
					}
				}
			);
		});
	}

	private getVendorSetup(request: number, value: number, index: number, length: number) {
		return new Promise((resolve, reject) => {
			this.device.controlTransfer(
				BM_REQUEST_TYPE | usb.LIBUSB_ENDPOINT_IN,
				request,
				value,
				index,
				length,
				(err, res) => {
					if (err) {
						reject(err);
					} else {
						resolve(res);
					}
				}
			);
		});
	}

	/**
	 * Find available Crazyradios plugged in via USB
	 */

	static findRadios(
		vid: number = CRAZYRADIO.VID,
		pid: number = CRAZYRADIO.PID
	) {
		// Only return devices that match the specified product id and vendor id
		return this.findUSBDevices()
			.filter(device =>
				(device.deviceDescriptor.idVendor === vid)
				&& (device.deviceDescriptor.idProduct === pid)
			);
	}

	/**
	 * Find ALL USB devices plugged into the Computer
	 */

	static findUSBDevices() {
		return usb.getDeviceList();
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
