/**
 * Because @types/usb doesn't have the `.on()` function for the endpoints
 * @todo Make a PR to DefinitelyTyped to fix this for others
 */

import * as usb from 'usb';

export interface InEndpointWithOn extends usb.InEndpoint {
	on(event: string, callback: (device: usb.Device) => void): void;
}

export interface OutEndpointWithOn extends usb.OutEndpoint {
	on(event: string, callback: (device: usb.Device) => void): void;
}

export interface InterfaceFixed extends usb.Interface {
	release(cb?: (err?: string) => void): void;
	release(closeEndpoints?: boolean, cb?: (err?: string) => void): void;
}
