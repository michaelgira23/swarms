/**
 * @file Constants used throughout the library
 */

// import * as ieee754 from 'ieee754';
import { properEnumKeys } from './utils';

/**
 * Crazyradio constants
 * These values were taken from (https://wiki.bitcraze.io/doc:crazyradio:usb:index)
 */

export const CRAZYRADIO = {
	VID: 0x1915, // Vendor ID of dongle
	PID: 0x7777  // Product ID of dongle
};

export enum DATA_RATES {
	'250K',
	'1M',
	'2M'
}

export function GET_DATA_RATE(targetRate: number) {
	for (const rate of properEnumKeys(DATA_RATES)) {
		if (DATA_RATES[rate] === targetRate) {
			return rate;
		}
	}
	return null;
}

export enum RADIO_POWERS {
	'-18dBm',
	'-12dBm',
	'-6dBm',
	'0dBm'
}

export function GET_RADIO_POWER(targetPower: number) {
	for (const power of properEnumKeys(RADIO_POWERS)) {
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
	CONSOLE           : 0,
	PARAMETERS        : 2,
	COMMANDER         : 3,
	LOGGING           : 5,
	COMMANDER_GENERIC : 7,
	LINK_LAYER        : 15
};

export const MAX_PAYLOAD_SIZE = 31;

export const CHANNELS = {
	TOC: 0,
	// (https://wiki.bitcraze.io/doc:crazyflie:crtp:param#parameters)
	PARAM: {
		READ  : 1,
		WRITE : 2,
		MISC  : 3 // Miscellaneous commands
	},
	// (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#communication_protocol)
	LOG: {
		CTRL : 1, // Used for adding/removing/starting/pausing log blocks
		DATA : 2  // Used to send log data from the Crazyflie to the client
	}
};

export const COMMANDS = {
	// TOC commands for both logging and parameters (you just change the port)
	// (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#table_of_content_access)
	TOC: {
		GET_ITEM : 0, // Get an item from the TOC
		GET_INFO : 1  // Get information about the TOC including length and checksum for caching
	},
	// (https://wiki.bitcraze.io/doc:crazyflie:crtp:param#misc_commands)
	PARAM_MISC: {
		SET_BY_NAME : 0
	},
	// (https://wiki.bitcraze.io/doc:crazyflie:crtp:log#log_control)
	LOG_CTRL: {
		CREATE_BLOCK : 0,
		APPEND_BLOCK : 1,
		DELETE_BLOCK : 2,
		START_BLOCK  : 3,
		STOP_BLOCK   : 4,
		RESET_LOG    : 5
	},
	// (https://wiki.bitcraze.io/doc:crazyflie:crtp:generic_setpoint)
	// (https://github.com/bitcraze/crazyflie-lib-python/blob/master/cflib/crazyflie/commander.py)
	COMMANDER_GENERIC: {
		STOP           : 0,
		VELOCITY_WORLD : 1,
		Z_DISTANCE     : 2,
		HOVER          : 5
	}
};

/**
 * Parameter types
 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:param#toc_access)
 */

export enum PARAM_TYPES {
	int8,
	int16,
	int32,
	int64,
	fp16 = 5,
	float,
	double,
	uInt8,
	uInt16,
	uInt32,
	uInt64
}

export type Type = keyof typeof PARAM_TYPES;

export function GET_PARAM_TYPE(typeValue: number) {
	for (const type of properEnumKeys(PARAM_TYPES)) {
		if (PARAM_TYPES[type] === typeValue) {
			return type;
		}
	}
	return null;
}

/**
 * Logging types
 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:log#firmware_usage)
 */

export enum LOGGING_TYPES {
	uInt8 = 1,
	uInt16,
	uInt32,
	int8,
	int16,
	int32,
	float,
	fp16
}

export function GET_LOGGING_TYPE(typeValue: number) {
	for (const type of properEnumKeys(LOGGING_TYPES)) {
		if (LOGGING_TYPES[type] === typeValue) {
			return type;
		}
	}
	return null;
}

/**
 * Possible logging errors
 * (https://wiki.bitcraze.io/projects:crazyflie:firmware:comm_protocol#variable_format)
 */

export const BLOCK_ERRORS: { [status: number]: { name: string, message: string } } = {
	2: {
		name: 'ENOENT',
		message: 'Block or variable not found'
	},
	7: {
		name: 'E2BIG',
		message: 'Log block is too long'
	},
	8: {
		name: 'ENOEXEC',
		message: 'Unknown command received'
	},
	12: {
		name: 'ENOMEM',
		message: 'No memory to allocate Log Block or Log Item'
	}
};

/**
 * Buffers used for things
 */

export const BUFFERS = {
	NOTHING   : Buffer.alloc(0), // Empty buffer when sending information
	SOMETHING : Buffer.alloc(1)  // Single byte when scanning for Crazyflies
};

/**
 * Factory to return read and write functions for a buffer
 * We need to bind the `this` context to the functions otherwise it won't work
 * @TODO Implement i64/u64/fp16 functions and get rid of Partial<T>
 */

export function BUFFER_TYPES(buffer: Buffer): Partial<Record<Type, TypeData>> {
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
		// int64: {
		// 	/** @todo Implement 64-bit unsigned integer read and write functions */
		// },
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
		// uInt64: {
		// 	/** @todo Implement 64-bit unsigned integer read and write functions */
		// },
		// fp16: {
		// 	/** @todo Implement fp16 read and write functions */
		// }
	};
}

export interface TypeData {
	size: number; // Size in bytes
	read: (offset: number, noAssert?: boolean) => number;
	write: (value: number, offset: number, noAssert?: boolean) => number;
}
