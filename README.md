# swarms

The ultimate node.js client for controlling Bitcraze Crazyflie 2.0 drones

# Motive

There were too many outdated and undocumented node.js libraries out there for programming Crazyflies. This package's goal is to fix that.

# Installation

## Crazyflie

This package assumes you have the latest version of the Crazyflie firmware. [You can find instructions on the Bitcraze website on how to update your firmware.](https://www.bitcraze.io/getting-started-with-the-crazyflie-2-0/#latest-fw)

## Windows

### `libusb` Driver

First, you must install the `libusb` driver onto the Crazyradio. [Look on the Bitcraze wiki for instructions on how to install the correct driver.](https://wiki.bitcraze.io/doc:crazyradio:index#drivers)

### Installing `node-usb`

On Windows, you may encounter a problem installing the `node-usb` package. This can be solved by following [the procedure here.](https://github.com/libusb/libusb/issues/144#issuecomment-269832528) Essentially, navigate to `C:\Program Files (x86)\Windows Kits\10\Include\10.0.10240.0\ucrt\time.h` and, using an editor running as administrator, add double slashes (`//`) behind each line of this code segment:

```c++
	struct timespec
	{
		time_t tv_sec;  // Seconds - >= 0
		long   tv_nsec; // Nanoseconds - [0, 999999999]
	};
```

Install usb.js normally using `npm install` then remove the slashes again to revert this temporary fix.

## Linux

[Look at the `node-usb`'s README for directions to install the package.](https://github.com/tessel/node-usb#installation)

# Development

## Compiling

This project uses TypeScript. To run locally, download all dev dependencies and run `npm run ts` to compile. During development, run `npm run ts:watch` to compile the TypeScript automagically when it detects any changes of the source files.

# Acknowledgments

Developing this library, the following references were used:
- [Bitcraze team's `crazyflie-lib-python` library](https://github.com/bitcraze/crazyflie-lib-python)
- [C J Silverio's `aerogel` library](https://github.com/ceejbot/aerogel)
