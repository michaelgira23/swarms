/**
 * Find all USB devices plugged into the Computer (for debugging)
 */

const { Crazyradio, utils } = require('../dist/index');

const devices = Crazyradio.findUSBDevices();

devices.forEach(device => {
	console.log('Device VID:', utils.toHex(device.deviceDescriptor.idVendor, false, true), 'PID:', utils.toHex(device.deviceDescriptor.idProduct, false, true));
});

console.log();
console.log(`There are ${devices.length} devices plugged in.`);
