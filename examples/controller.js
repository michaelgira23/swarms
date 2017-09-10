/**
 * Control the Crazyflie with game controller and Flow sensor
 */

const { Crazyradio, utils } = require('../dist/index');
const gamepad = require('gamepad');
gamepad.init();

// Create a game loop and poll for events
setInterval(gamepad.processEvents, 16);
// Scan for new gamepads as a slower rate
setInterval(gamepad.detectDevices, 500);

/**
 * Map gamepad values to drone controls
 * These are the values for an Xbox controller:
 *
 *     1             3
 *     |             |
 * 0 - L + 0     2 - R + 2
 *     +             +
 *     1             3
 */

const gamepadMap = {
	0: 'yawRate',
	1: 'velocityZ',
	2: 'velocityY',
	3: 'velocityX'
};

const inverseValues = {
	velocityX : false,
	velocityY : false,
	velocityZ : false,
	yawRate   : true
};

const maxValues = {
	velocityX : 1,
	velocityY : 1,
	velocityZ : 1,
	yawRate   : 180
};

let currentSetpoint = {
	velocityX : 0,
	velocityY : 0,
	velocityZ : 0,
	yawRate   : 0
};

const errorThreshold = 0.05;

// Because you can only use `await` within an async function...
main();
async function main() {

	const radio = new Crazyradio();

	try {

		await radio.init();

		radio.on('console line', console.log);
		radio.on('error', err => {
			console.log('Radio error!', err);
		});

		const drones = await radio.findDrones();
		console.log(`Nearby drones: ${drones}`);

		if (drones.length < 1) {
			throw 'Could not find any drones!';
		}

		const drone = await radio.connect(drones[0]);

		// What to do if we exit the program via Ctrl + c
		process.on('SIGINT', async () => {
			await drone.commander.stopSetpoint();
			process.exit();
		});

		let trimValues = {
			velocityX : 0,
			velocityY : 0,
			velocityZ : 0,
			yawRate   : 0
		};

		gamepad.on('move', function(id, axis, value, beforeValue, timestamp) {
			const param = gamepadMap[axis];
			let set = (maxValues[param] * -value) - trimValues[param];
			if (inverseValues[param]) {
				set *= -1;
			}
			if (Math.abs(set) < errorThreshold) {
				set = 0;
			}
			currentSetpoint[param] = set;
		});

		const toc = await drone.parameters.getTOC();
		const resetKalman = toc.getItem('kalman', 'resetEstimation');

		console.log('******************************');
		console.log('Resetting Position Estimation and Calibrating Controller...');
		console.log('******************************');

		drone.parameters.set(resetKalman, '1');
		await utils.wait(100);
		drone.parameters.set(resetKalman, '0');
		await utils.wait(2000);

		trimValues = JSON.parse(JSON.stringify(currentSetpoint));

		currentSetpoint = new Proxy(currentSetpoint, {
			set: async (obj, prop, value) => {
				obj[prop] = value;
				try {
					console.log('current sepoint', currentSetpoint);
					await drone.commander.velocityWorldSetpoint(currentSetpoint);
				} catch (err) {
					console.log('Error sending setpoint!', err);
				}
			}
		});

		console.log('******************************');
		console.log('Done! All clear for takeoff.');
		console.log('******************************');

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
