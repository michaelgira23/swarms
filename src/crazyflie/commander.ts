import { Crazyflie } from '.';
import { COMMANDS, PORTS } from '../constants';
import { Packet } from '../packet';

export const defaultSetpoint: Setpoint = {
	roll   : 0,
	pitch  : 0,
	yaw    : 0,
	thrust : 0
};

export const defaultVelocityWorldSetpoint: VelocityWorldSetpoint = {
	velocityX : 0,
	velocityY : 0,
	velocityZ : 0,
	yawRate   : 0
};

export const defaultZDistanceSetpoint: ZDistanceSetpoint = {
	roll      : 0,
	pitch     : 0,
	yawRate   : 0,
	zDistance : 0
};

export const defaultHoverSetpoint: HoverSetpoint = {
	velocityX : 0,
	velocityY : 0,
	yawRate   : 0,
	zDistance : 0
};

export class Commander {

	get currentSetpoint(): Setpoint | VelocityWorldSetpoint | ZDistanceSetpoint | HoverSetpoint {
		return this.lastArgs;
	}

	private lastFunction: SETPOINT_TYPE = null;
	private lastArgs: Setpoint | VelocityWorldSetpoint | ZDistanceSetpoint | HoverSetpoint;

	private setpointInterval: NodeJS.Timer;

	/**
	 * Class for dealing with the 'commander' port
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:commander)
	 */

	constructor(private crazyflie: Crazyflie) {
		// Stop setpoint interval upon disconnect
		this.crazyflie.radio.on('disconnect', () => {
			this.clearSetpointInterval();
		});
	}

	/**
	 * We need to update the Crazyflie's position every so often otherwise it will stop after a few seconds
	 */

	startSetpointInterval() {
		this.clearSetpointInterval();
		this.setpointInterval = setInterval(() => {
			switch (this.lastFunction) {
				case SETPOINT_TYPE.SETPOINT:
					this.setpoint();
					break;
				case SETPOINT_TYPE.VELOCITY_WORLD:
					this.velocityWorldSetpoint();
					break;
				case SETPOINT_TYPE.Z_DISTANCE:
					this.zDistanceSetpoint();
					break;
				case SETPOINT_TYPE.HOVER:
					this.hoverSetpoint();
					break;
			}
		}, 100);
	}

	/**
	 * Clear the setpoint interval
	 */

	clearSetpointInterval() {
		if (this.setpointInterval) {
			clearInterval(this.setpointInterval);
		}
	}

	/**
	 * Set the setpoint point
	 */

	setpoint(setpoint?: Setpoint) {

		// Default to previous values
		let target: Setpoint;
		if (this.lastFunction === SETPOINT_TYPE.SETPOINT) {
			target = Object.assign({}, defaultSetpoint, this.lastArgs, setpoint);
		} else {
			target = Object.assign({}, defaultSetpoint, setpoint);
		}

		// Set thrust limits
		// (https://forum.bitcraze.io/viewtopic.php?t=442)
		if (target.thrust < 0) {
			target.thrust = 0;
		}
		if (target.thrust > 60000) {
			target.thrust = 60000;
		}

		this.lastFunction = SETPOINT_TYPE.SETPOINT;
		this.lastArgs = target;

		const packet = new Packet();
		packet.port = PORTS.COMMANDER;

		packet
			.write('float', target.roll)
			.write('float', -target.pitch)
			.write('float', target.yaw)
			.write('uInt16', target.thrust);

		return this.crazyflie.radio.sendPacket(packet);
	}

	/**
	 * Deals with the generic commander. Stops all motors and potentially makes it fall.
	 * (https://wiki.bitcraze.io/doc:crazyflie:crtp:generic_setpoint#stop)
	 */

	stopSetpoint() {
		this.lastFunction = null;
		this.lastArgs = null;

		const packet = new Packet();
		packet.port = PORTS.COMMANDER_GENERIC;

		packet.write('int8', COMMANDS.COMMANDER_GENERIC.STOP);

		return this.crazyflie.radio.sendPacket(packet);
	}

	/**
	 * Send Velocity in the world frame of reference setpoint.
	 * Velocity x, y, and z are in m/s while yaw rate is in degrees/second
	 * (https://github.com/bitcraze/crazyflie-lib-python/blob/master/cflib/crazyflie/commander.py#L91)
	 */

	velocityWorldSetpoint(setpoint?: VelocityWorldSetpoint) {

		// Default to previous values
		let target: VelocityWorldSetpoint;
		if (this.lastFunction === SETPOINT_TYPE.VELOCITY_WORLD) {
			target = Object.assign({}, defaultVelocityWorldSetpoint, this.lastArgs, setpoint);
		} else {
			target = Object.assign({}, defaultVelocityWorldSetpoint, setpoint);
		}

		this.lastFunction = SETPOINT_TYPE.VELOCITY_WORLD;
		this.lastArgs = target;

		const packet = new Packet();
		packet.port = PORTS.COMMANDER_GENERIC;

		packet
			.write('int8', COMMANDS.COMMANDER_GENERIC.VELOCITY_WORLD)
			.write('float', target.velocityX)
			.write('float', target.velocityY)
			.write('float', target.velocityZ)
			.write('float', target.yawRate);

		return this.crazyflie.radio.sendPacket(packet);
	}

	/**
	 * Setpoint with absolute height.
	 * Roll and pitch are in degrees, yaw rate is in degrees/second, and z distance is in meters.
	 * (https://github.com/bitcraze/crazyflie-lib-python/blob/master/cflib/crazyflie/commander.py#L104)
	 */

	zDistanceSetpoint(setpoint?: ZDistanceSetpoint) {

		// Default to previous values
		let target: ZDistanceSetpoint;
		if (this.lastFunction === SETPOINT_TYPE.Z_DISTANCE) {
			target = Object.assign({}, defaultZDistanceSetpoint, this.lastArgs, setpoint);
		} else {
			target = Object.assign({}, defaultZDistanceSetpoint, setpoint);
		}

		this.lastFunction = SETPOINT_TYPE.Z_DISTANCE;
		this.lastArgs = target;

		const packet = new Packet();
		packet.port = PORTS.COMMANDER_GENERIC;

		packet
			.write('int8', COMMANDS.COMMANDER_GENERIC.Z_DISTANCE)
			.write('float', target.roll)
			.write('float', target.pitch)
			.write('float', target.yawRate)
			.write('float', target.zDistance);

		return this.crazyflie.radio.sendPacket(packet);
	}

	/**
	 * Setpoint with absolute height.
	 * Velocity x and y are in m/s, yaw rate is in degrees/second, and z distance is in meters.
	 * (https://github.com/bitcraze/crazyflie-lib-python/blob/master/cflib/crazyflie/commander.py#L104)
	 */

	hoverSetpoint(setpoint?: HoverSetpoint) {

		// Default to previous values
		let target: HoverSetpoint;
		if (this.lastFunction === SETPOINT_TYPE.HOVER) {
			target = Object.assign({}, defaultHoverSetpoint, this.lastArgs, setpoint);
		} else {
			target = Object.assign({}, defaultHoverSetpoint, setpoint);
		}

		this.lastFunction = SETPOINT_TYPE.HOVER;
		this.lastArgs = target;

		const packet = new Packet();
		packet.port = PORTS.COMMANDER_GENERIC;

		packet
			.write('int8', COMMANDS.COMMANDER_GENERIC.HOVER)
			.write('float', target.velocityX)
			.write('float', target.velocityY)
			.write('float', target.yawRate)
			.write('float', target.zDistance);

		return this.crazyflie.radio.sendPacket(packet);
	}

}

const enum SETPOINT_TYPE {
	SETPOINT,
	VELOCITY_WORLD,
	Z_DISTANCE,
	HOVER
}

export interface Setpoint {
	roll?: number;
	pitch?: number;
	yaw?: number;
	thrust?: number;
}

export interface VelocityWorldSetpoint {
	velocityX?: number;
	velocityY?: number;
	velocityZ?: number;
	yawRate?: number;
}

export interface ZDistanceSetpoint {
	roll?: number;
	pitch?: number;
	yawRate?: number;
	zDistance?: number;
}

export interface HoverSetpoint {
	velocityX?: number;
	velocityY?: number;
	yawRate?: number;
	zDistance?: number;
}
