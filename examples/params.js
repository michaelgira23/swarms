/**
 * Getting parameter data of the Crazyflie
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
		console.log('******************************');

		const parametersStart = new Date();

		// drone.parameters.tocFetcher.on('toc item', item => {
		// 	const time = (Date.now() - parametersStart) / 1000;
		// 	const nthItem = drone.parameters.tocFetcher.toc.items.length;
		// 	const percentage = swarms.utils.round((nthItem / drone.parameters.tocFetcher.length) * 100, 2);
		// 	console.log('******************************');
		// 	console.log(`Got TOC Item ID ${item.id}! After ${time}s`);
		// 	console.log(`TOC item ${nthItem} / ${drone.parameters.tocFetcher.length} (${percentage}%)`);
		// 	console.log('******************************');
		// });

		const toc = await drone.parameters.tocFetcher.start();

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
