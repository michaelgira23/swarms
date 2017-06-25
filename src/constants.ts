/**
 * @file Constants used throughout the library
 */

/**
 * Crazyradio constants
 * These values were taken from (https://wiki.bitcraze.io/doc:crazyradio:usb:index)
 */

export const CRAZYRADIO = {
	// Vendor ID
	VID: 0x1915,
	// Product ID
	PID: 0x7777
};

export const DATA_RATES: SortaEnum = {
	'250K' : 0,
	'1M'   : 1,
	'2M'   : 2
};

export function GET_DATA_RATE(targetRate: number) {
	for (const rate of Object.keys(DATA_RATES)) {
		if (DATA_RATES[rate] === targetRate) {
			return rate;
		}
	}
	return null;
}

export const RADIO_POWERS: SortaEnum = {
	'-18dBm' : 0,
	'-12dBm' : 1,
	'-6dBm'  : 2,
	'0dBm'   : 3
};

export function GET_RADIO_POWER(targetPower: number) {
	for (const power of Object.keys(RADIO_POWERS)) {
		if (RADIO_POWERS[power] === targetPower) {
			return power;
		}
	}
	return null;
}

export const VENDOR_REQUESTS = {
	BM_REQUEST_TYPE   : 0x40,

	SET_RADIO_CHANNEL : 0x01,
	SET_RADIO_ADDRESS : 0x02,
	SET_DATA_RATE     : 0x03,
	SET_RADIO_POWER   : 0x04,
	SET_RADIO_ARD     : 0x05,
	SET_RADIO_ARC     : 0x06,
	ACK_ENABLE        : 0x10,
	SET_CONT_CARRIER  : 0x20,
	SCAN_CHANNELS     : 0x21,
	LAUNCH_BOOTLOADER : 0xFF
};

/**
 * Crazyflie Real-Time Protocol (CRTP)
 */

export const PORTS = {
	CONSOLE    : 0,
	PARAMETERS : 2,
	COMMANDER  : 3,
	LOG        : 5,
	LINK_LAYER : 15
};

/**
 * Misc Constants
 */

export const BUFFERS = {
	// Empty buffer when sending information
	NOTHING: Buffer.alloc(0),
	// Single byte for sending a ping
	SOMETHING: Buffer.alloc(1),
	// Response from the Crazyflie that's simply a ping
	PING: Buffer.from([0xF0, 0x01, 0x01, 0xF2])
};

/**
 * Because we need a table of fixed values that we can also look up the index
 */

export interface SortaEnum {
	[rate: string]: number;
}
