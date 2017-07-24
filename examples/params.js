/**
 * Getting parameter data of the Crazyflie
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

		const parametersStart = new Date();
		const toc = await drone.parameters.getTOC();

		console.log('******************************');
		console.log(`Parameters ready! After ${(Date.now() - parametersStart) / 1000}s`);
		console.log(`TOC is of length ${drone.parameters.tocFetcher.length} and has a checksum of ${drone.parameters.tocFetcher.crc}`);
		console.log('******************************');

		let time = new Date();
		const posHold = await drone.parameters.get(toc.getItem('flightmode', 'poshold'));

		console.log('******************************');
		console.log(`Got 'position hold' param in ${(Date.now() - time) / 1000}s with value ${posHold}`);
		console.log('******************************');

		time = new Date();
		const newVal = await drone.parameters.set(toc.getItem('flightmode', 'poshold'), 1);

		console.log('******************************');
		console.log(`Set 'position hold' param in ${(Date.now() - time) / 1000}s with new value ${newVal}`);
		console.log('******************************');

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
