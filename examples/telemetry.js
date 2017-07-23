/**
 * Getting telemetry data of the Crazyflie
 */

const { Crazyradio } = require('../dist/index');

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

		drone.on('error', err => {
			console.log('Drone error!', err);
		});

		console.log('******************************');
		console.log('Retrieving Crazyflie Table of Contents');
		console.log('******************************');

		const telemetryStart = new Date();
		const toc = await drone.logging.tocFetcher.start();

		console.log('******************************');
		console.log(`Telemetry ready! After ${(Date.now() - telemetryStart) / 1000}s`);
		console.log(`TOC is of length ${drone.logging.tocFetcher.length} and has a checksum of ${drone.logging.tocFetcher.crc}`);
		console.log('Initializing gyroscope data now.');
		console.log('******************************');

		// Invoke getting of gyroscope data
		await drone.logging.start([
			toc.getItem('gyro', 'x'),
			toc.getItem('gyro', 'y'),
			toc.getItem('gyro', 'z')
		]);

		console.log('******************************');
		console.log('Telemetry initialization finished!');
		console.log('******************************');

		/**
		 * You can use any of the 3 types of events to get the logging data.
		 * You can use:
		 *
		 * 1) Global `*` event - This will emit all data received in the format `{ group: { name: value } }`
		 * 2) Group event - This will emit data received for the group in the format `{ name: value }`
		 * 3) Full name event (`group.name`) - This will emit the value received.
		 */

		drone.logging.data.on('*', data => {
			console.log('Logging data:', data);
		});

		drone.logging.data.on('gyro', data => {
			console.log('Gyro data:', data);
		});

		drone.logging.data.on('gyro.x', data => {
			console.log('Gyro X data:', data);
		});

		drone.logging.data.on('gyro.y', data => {
			console.log('Gyro Y data:', data);
		});

		drone.logging.data.on('gyro.z', data => {
			console.log('Gyro Z data:', data);
		});

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
