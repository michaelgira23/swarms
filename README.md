# swarms

The ultimate node.js client for controlling Bitcraze Crazyflie 2.0 drones

[![Dependency Status](https://img.shields.io/david/michaelgira23/swarms.svg)]()
[![Dev Dependency Status](https://img.shields.io/david/dev/michaelgira23/swarms.svg)]()
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/michaelgira23/swarms/master/LICENSE)

Warning: This projects is going under heavy active development!

## Motive

There were too many outdated and undocumented node.js libraries out there for programming Crazyflies. This package's goal is to fix that.

## Getting Started

### Prerequisites

#### Crazyflie Firmware

This package assumes you have the latest version of the Crazyflie firmware. You can find [instructions on the Bitcraze website](https://www.bitcraze.io/getting-started-with-the-crazyflie-2-0/#latest-fw) on how to update your firmware.

#### Crazyradio Driver on Windows

If on a Windows machine, look on [the Bitcraze wiki](https://wiki.bitcraze.io/doc:crazyradio:index#drivers) for instructions on how to install the correct driver onto your Crazyradio. You do not need to do this on macOS or Linux!

### Installation

This package's main dependency is `node-usb`. [Refer to its installation directions](https://github.com/tessel/node-usb#installation) for any help installing it on your operating system.

```
$ npm install swarms
```

Note: On Windows, you may fail to install the `node-usb` package getting errors like:

```
error C2011: 'timespec': 'struct' type redefinition
```

You can fix this by following the [directions here](https://github.com/libusb/libusb/issues/144#issuecomment-269832528).

## Usage

The following script moves the drone's propellers. More examples are located in the [`/examples`](https://github.com/michaelgira23/swarms/tree/master/examples) directory.

```javascript
const { Crazyradio } = require('swarms');

const radio = new Crazyradio();

// Because you can only use `await` within an async function...
main();
async function main() {
	try {
		await radio.init();
		const drones = await radio.findDrones();

		if (drones.length < 1) {
			throw 'Could not find any drones!';
		}

		const drone = await radio.connect(drones[0]);

		await drone.commander.setpoint({
			roll  : 0,
			yaw   : 0,
			pitch : 0,
			thrust: 32500
		});

	} catch (err) {
		console.log('Uh oh!', err);
		await radio.close();
	}
}
```

## Tutorial

[Refer to the documentation](https://github.com/michaelgira23/swarms/blob/master/docs/table-of-contents.md) for tutorials on using the Crazyflie library.

## Troubleshooting

Got a problem? Refer to the [troubleshooting page](https://github.com/michaelgira23/swarms/blob/master/docs/troubleshooting.md) in the documentation. If that doesn't help, [create an issue.](https://github.com/michaelgira23/swarms/issues/new)

## Contributing

Encounter a bug? Have an idea for a new feature? [Open up an issue!](https://github.com/michaelgira23/swarms/issues/new) PR's are also welcome!

## Development

### Compiling

This project uses TypeScript. To compile from source, run:

```
$ npm run ts
```

During development, it may be useful to automagically compile on any file changes. Do this by running:

```
$ npm run ts:watch
```

### Testing

Before making a pull request, make sure your code passes linting and unit tests by using:

```
$ npm test
```

## License

This project is under the [MIT License](https://github.com/michaelgira23/swarms/blob/master/LICENSE).

## Acknowledgments

Special thanks to the following people, whose libraries were used as a reference:
- [Bitcraze team's `crazyflie-lib-python` library](https://github.com/bitcraze/crazyflie-lib-python)
- [C J Silverio's `aerogel` library](https://github.com/ceejbot/aerogel)
