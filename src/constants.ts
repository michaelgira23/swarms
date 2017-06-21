/**
 * Constants used throughout the library
 */

export const BUFFERS = {
	// Empty buffer when sending information
	NOTHING: Buffer.alloc(0),
	// Single byte for sending a ping
	SOMETHING: Buffer.alloc(1),
	// Response from the Crazyflie that's simply a ping
	PING: Buffer.from([0xF0, 0x01, 0x01, 0xF2])
};

// For Crazyradio constants, refer to:
// https://wiki.bitcraze.io/doc:crazyradio:usb:index
export const CRAZYRADIO = {
	// Vendor ID
	VID: 0x1915,
	// Product ID
	PID: 0x7777
};

export const enum DATA_RATES {
	'250K',
	'1M',
	'2M'
}

// export function

export const enum RADIO_POWERS {
	'-18dBm',
	'-12dBm',
	'-6dBm',
	'0dBm'
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
