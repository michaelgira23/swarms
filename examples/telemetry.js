/**
 * Getting telemetry data of the Crazyflie
 */

const swarms = require('../dist/index');

// Because you can only use `await` within an async function...
main();
async function main() {
	const radio = new swarms.Crazyradio();
	try {
		await radio.init();

		radio.on('console line', console.log);

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
		console.log('This could take up to ~30 seconds...');
		console.log('******************************');

		drone.logging.tocFetcher.on('toc item', item => {
			const time = (Date.now() - telemetryStart) / 1000;
			const nthItem = drone.logging.tocFetcher.toc.items.length;
			const percentage = swarms.utils.round((nthItem / drone.logging.tocFetcher.length) * 100, 2);
			console.log('******************************');
			console.log(`Got TOC Item ID ${item.id}! After ${time}s`);
			console.log(`TOC item ${nthItem} / ${drone.logging.tocFetcher.length} (${percentage}%)`);
			console.log('******************************');
		});

		const telemetryStart = new Date();
		const toc = await drone.logging.tocFetcher.start();

		console.log('******************************');
		console.log(`Telemetry ready! After ${(Date.now() - telemetryStart) / 1000}s`);
		console.log(`TOC is of length ${drone.logging.tocFetcher.length} and has a checksum of ${drone.logging.tocFetcher.crc}`);
		console.log('******************************');

		console.log('******************************');
		console.log('Starting gyro data. This could take some time as well...');
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
