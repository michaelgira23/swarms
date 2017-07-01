/**
 * @file Constants used throughout the library
 */

// import * as ieee754 from 'ieee754';

/**
 * Crazyradio constants
 * These values were taken from (https://wiki.bitcraze.io/doc:crazyradio:usb:index)
 */

export const CRAZYRADIO = {
	VID: 0x1915, // Vendor ID of dongle
	PID: 0x7777  // Product ID of dongle
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
	LOGGING    : 5,
	LINK_LAYER : 15
};

export const MAX_PAYLOAD_SIZE = 31;

// Constants for the 'logging' port (telemetry)

export const LOGGING_CHANNELS = {
	TOC      : 0, // Table of content access: Used for reading out the TOC
	LOG_CTRL : 1, // Log control: Used for adding/removing/starting/pausing log blocks
	LOG_DATA : 2  // Log data: Used to send log data from the Crazyflie to the client
};

export const LOGGING_COMMANDS = {
	TOC: {
		GET_ITEM : 0, // Get an item from the TOC
		GET_INFO : 1  // Get information about the TOC and the LOG subsystem implementation
	}
};

// Logging types
// (https://wiki.bitcraze.io/projects:crazyflie:firmware:log#firmware_usage)
export const LOGGING_TYPES: { [id: number]: Type } = {
	1 : 'uInt8',
	2 : 'uInt16',
	3 : 'uInt32',
	4 : 'int8',
	5 : 'int16',
	6 : 'int32',
	7 : 'float',
	8 : 'fp16'
};

/**
 * Buffer Constants
 */

export const BUFFERS = {
	NOTHING   : Buffer.alloc(0), // Empty buffer when sending information
	SOMETHING : Buffer.alloc(1)  // Single byte when scanning for Crazyflies
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
		// Also used for writing just a plain 'ol byte
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
		// fp16: {
		// 	/** @todo Implement fp16 read and write functions */
		// }
	};
}

export type Type = 'double' | 'float' | 'int8' | 'int16' | 'int32' | 'uInt8' | 'uInt16' | 'uInt32' | 'fp16';

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
