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

export const BM_REQUEST_TYPE = 0x40;

export const VENDOR_REQUESTS = {
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
 * These values were taken from (https://wiki.bitcraze.io/projects:crazyflie:crtp)
 */

export const PORTS = {
	CONSOLE    : 0,
	PARAMETERS : 2,
	COMMANDER  : 3,
	LOG        : 5,
	LINK_LAYER : 15
};

export const MAX_PAYLOAD_SIZE = 31;

/**
 * Buffer Constants
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
 * Factory to return read and write functions for a buffer
 * We need to bind the `this` context to the functions otherwise it won't work
 */

export function BUFFER_TYPES(buffer: Buffer): { [type: string]: TypeData } {
	return {
		double: {
			size: 8,
			read: buffer.readDoubleLE.bind(buffer),
			write: buffer.writeDoubleLE.bind(buffer)
		},
		float: {
			size: 4,
			read: buffer.readFloatLE.bind(buffer),
			write: buffer.writeFloatLE.bind(buffer)
		},
		int8: {
			size: 1,
			read: buffer.readInt8.bind(buffer),
			write: buffer.writeInt8.bind(buffer)
		},
		int16: {
			size: 2,
			read: buffer.readInt16LE.bind(buffer),
			write: buffer.writeInt16LE.bind(buffer)
		},
		int32: {
			size: 4,
			read: buffer.readInt32LE.bind(buffer),
			write: buffer.writeInt32LE.bind(buffer)
		},
		uInt8: {
			size: 1,
			read: buffer.readUInt8.bind(buffer),
			write: buffer.writeUInt8.bind(buffer)
		},
		uInt16: {
			size: 2,
			read: buffer.readUInt16LE.bind(buffer),
			write: buffer.writeUInt16LE.bind(buffer)
		},
		uInt32: {
			size: 4,
			read: buffer.readUInt32LE.bind(buffer),
			write: buffer.writeUInt32LE.bind(buffer)
		}
	};
}

export type Type = 'double' | 'float' | 'int8' | 'int16' | 'int32' | 'uInt8' | 'uInt16' | 'uInt32';

export interface TypeData {
	size: number; // Size in bytes
	read: (offset: number, noAssert?: boolean) => number;
	write: (value: number, offset: number, noAssert?: boolean) => number;
}

/**
 * Because we need a table of fixed values that we can also look up the index, unlike the actual TypeScript enum
 */

export interface SortaEnum {
	[key: string]: number;
}
