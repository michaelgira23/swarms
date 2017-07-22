import {
	BM_REQUEST_TYPE,
	BUFFERS,
	CRAZYRADIO,
	DATA_RATES,
	GET_DATA_RATE,
	GET_RADIO_POWER,
	PORTS,
	RADIO_POWERS,
	VENDOR_REQUESTS
} from '../constants';
import { Crazyflie } from '../crazyflie';
import { Ack, Packet } from '../packet';
import { Uri } from '../uri';
import { InterfaceFixed } from '../usb-types-fix';
import { toHex } from '../utils';
import { InStream, OutStream } from './usbstreams';

import { EventEmitter } from 'events';
import * as _ from 'lodash';
import * as usb from 'usb';

export class Crazyradio extends EventEmitter {

	// Crazyradio options
	options: CrazyradioOptions = defaultOptions;
	// Firmware version of Crazyradio
	version: number;

	private initialized = false;

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

	// Used in `onInStreamData()` for keeping track of current console buffer
	// so we can emit a 'console line' event which automagically emits between newline characters
	private consoleLine = '';

	// Ping the drone at least every X milliseconds
	private fallbackPingInterval: NodeJS.Timer;
	// If there's incoming data, have a faster ping timeout
	private fallbackPingTimeout: NodeJS.Timer;
	// How many milliseconds the interval should be. A ping will be sent no matter what on this interval.
	// (for fallbackPingInterval)
	private pingInterval = 5;
	// How many milliseconds after receiving a non-empty packet should we wait until sending another ping
	// (for fallbackPingTimeout)
	private packetResponseTimeout = -1;

	/**
	 * Class for controlling the Crazyradio
	 */

	constructor() {
		super();
	}

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
			if (!this.interface) {
				resolve();
				this.initialized = false;
			}

			(this.interface as InterfaceFixed).release(true, err => {
				if (err) {
					reject(err);
					return;
				}
				this.initialized = false;
				resolve();
			});
		});
	}

	/**
	 * Tune into the correct parameters to connect to a Crazyflie uri and return a Crazyflie instance
	 */

	connect(uri: Uri) {
		// Make sure intervals and timeouts are cleared first
		this.disconnect();

		return this.configure({
			dataRate: uri.dataRate,
			channel: uri.channel
		})
			.then(async () => {
				// Set ping interval
				clearInterval(this.fallbackPingInterval);
				if (this.pingInterval >= 0) {
					this.fallbackPingInterval = setInterval(() => {
						this.ping();
					}, this.pingInterval);
				}

				const drone = new Crazyflie(this);
				await drone.init();
				return drone;
			});
	}

	/**
	 * Stop connecting to the drone
	 */

	disconnect() {
		// Stop pinging the drone
		clearInterval(this.fallbackPingInterval);
		clearTimeout(this.fallbackPingTimeout);
	}

	/**
	 * Scan for any nearby Crazyflies
	 */

	async findDrones() {
		try {
			const prevARC = this.options.arc;
			await this.setAckRetryCount(1);
			let drones: Uri[] = [];
			for (const rate of Object.keys(DATA_RATES)) {
				drones = drones.concat(await this.scanRange(DATA_RATES[rate]));
			}
			await this.setAckRetryCount(prevARC);
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

	private onInStreamData(data: Buffer) {
		const ackPack = new Ack(data);

		// console.log('Received data', ackPack);

		this.emit('all', ackPack);

		// If ack pack lacks the feedback, it's a slack
		if (!ackPack.ackReceived) {
			this.emit('no ack', ackPack);
			return;
		}

		switch (ackPack.port) {
			case PORTS.CONSOLE:
				this.emit('console', ackPack);

				// Below logic is for emitting the 'console line' event.
				// This will emit output just like the 'console' event, but only between newline characters,
				// so every emit is a new line

				// Add new console data to the current line string
				this.consoleLine += ackPack.data.toString();
				// Divide up console line by newline characters
				const lines = this.consoleLine.split(/\r?\n/);

				// Loop through broken up parts either emitting them as a 'console line' event
				// or saving it in the consoleLine for when there is a newline character in the future
				for (let i = 0; i < lines.length; i++) {
					if (i === lines.length - 1) {
						this.consoleLine = lines[i];
						break;
					}
					this.emit('console line', lines[i]);
				}
				break;
			case PORTS.PARAMETERS:
				this.emit('parameters', ackPack);
				break;
			case PORTS.COMMANDER:
				this.emit('commander', ackPack);
				break;
			case PORTS.LOGGING:
				this.emit('logging', ackPack);
				break;
			case PORTS.LINK_LAYER:
				this.emit('link layer', ackPack);
				break;
			default:
				this.emit('other', ackPack);
				break;
		}

		// If the response packet wasn't empty, add a timeout to get another ping sooner
		if (!ackPack.equals(Ack.emptyPing)) {
			clearTimeout(this.fallbackPingTimeout);
			if (this.packetResponseTimeout >= 0) {
				this.fallbackPingTimeout = setTimeout(() => {
					this.ping();
				}, this.packetResponseTimeout);
			}
		}
	}

	private onInStreamError(err: string) {
		console.log('InStream Crazyradio Error:', err);
		this.emit('error', err);
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
		const buf = Buffer.from(toHex(address), 'hex');
		if (buf.length !== 5) {
			return Promise.reject(`Address should be 5 bytes long! Not ${buf.length}!`);
		}
		this.options.address = address;
		return this.sendVendorSetup(VENDOR_REQUESTS.SET_RADIO_ADDRESS, 0, 0, buf);
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

	private sendVendorSetup(request: number, value: number, index = 0, data = BUFFERS.NOTHING) {
		return new Promise<void>((resolve, reject) => {
			this.device.controlTransfer(
				BM_REQUEST_TYPE,
				request,
				value,
				index,
				data,
				err => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				}
			);
		});
	}

	private getVendorSetup(request: number, value: number, index: number, length: number) {
		return new Promise<Buffer>((resolve, reject) => {
			this.device.controlTransfer(
				BM_REQUEST_TYPE | usb.LIBUSB_ENDPOINT_IN,
				request,
				value,
				index,
				length,
				(err, buf) => {
					if (err) {
						reject(err);
					} else {
						resolve(buf);
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
