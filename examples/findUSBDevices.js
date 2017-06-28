/**
 * Find all USB devices plugged into the Computer (for debugging)
 */

const swarms = require('../dist/index');

const devices = swarms.Crazyradio.findUSBDevices();

devices.forEach(device => {
	console.log('Device', swarms.utils.toHex(device.deviceDescriptor.idVendor, false, true), swarms.utils.toHex(device.deviceDescriptor.idProduct, false, true));
});

console.log();
console.log(`There are ${devices.length} devices plugged in.`);
