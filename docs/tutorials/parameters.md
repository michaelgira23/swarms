# Tutorials: Parameters

Another useful thing to do is get and set the settings or "parameters" on the Crazyflie. This can be achieved by, you guessed it, the parameters subsystem.

## Initialization

Similar to the logging subsystem, a parameter Table of Contents (TOC) is required before usage. Each item in the TOC represents one value you can get or set in the drone's parameters. You can retrieve its parameter TOC like so:

```javascript
const toc = await drone.parameters.getTOC();
```

Like stated before, the TOC object is comprised of numerous "TOC items". Each item represents one value you can get (and usually set) on the Crazyflie. It contains an `id`, `group`, `name`, and `type` property. Some properties have an additional `readOnly` property, which, like the name suggests, means you cannot set it. After fetching the parameters TOC once, a cached version should be available in the `cacheDir` value of the Crazyflie options (defaults to location of swarms module + `/cache`).

It makes most sense to query the TOC items by their group and name. This is available using the `TOC.getItem()` method. For example, to get the value of whether or not it's in [Altitude Hold Mode](https://github.com/bitcraze/crazyflie-clients-python/issues/239#issuecomment-194053796) (`flightmode.althold`), you can use the following:

```javascript
const altHold = toc.getItem('flightmode', 'althold');
```

## Getting a Parameter

Getting a parameter is simple once you have the TOC item. Simply use the `parameters.get()` method. To get the status whether or not the Crazyflie is in Altitude Hold Mode, use the following:

```javascript
const isHold = await drone.parameters.get(altHold);
```

## Setting a Parameter

Setting a parameter is almost as easy as getting one! Use the `parameters.set()` method for setting a new value. This will also return the new current value. **Watch out! You can only set a parameter if it does _not_ have the `readOnly` property!**

```javascript
const newValue = await drone.parameters.set(altHold, 1);
console.log(newValue);
// 1

// If you try to set a read-only property
await drone.parameters.set(paramTOC.getItem('cpu', 'flash'), 1234);
// Throws: Cannot set property "cpu.flash" because it is read-only!
```

## Full Example

A full working example is located in [`/examples/params.js`](https://github.com/michaelgira23/swarms/blob/master/examples/params.js).
