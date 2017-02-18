# swarms

The ultimate node.js client for controlling Bitcraze Crazyflie 2.0 drones

# Installing

## Windows 10

On Windows 10, you may encounter a problem installing usb.js. This can be solved by following [the procedure here.](https://github.com/libusb/libusb/issues/144#issuecomment-269832528) Essentially, navigate to `C:\Program Files (x86)\Windows Kits\10\Include\10.0.10240.0\ucrt\time.h` and add double slashes (`//`) behind each line of this code:

```c++
	struct timespec
	{
		time_t tv_sec;  // Seconds - >= 0
		long   tv_nsec; // Nanoseconds - [0, 999999999]
	};
```

Install usb.js then remove the slashes again to revert this temporary fix.

# Development

## Compiling

This project uses TypeScript. To run locally, download all dev dependencies and run `npm run tsc` to compile. During development, run `npm run tsc:watch` to compile the TypeScript automatically when it detects any changes of the source files.
