import { GET_DATA_RATE } from './constants';

export class Uri {
	constructor(public dataRate: number, public channel: number) {
	}

	toString() {
		return `radio://1/${this.channel}/${GET_DATA_RATE(this.dataRate)}`;
	}
}
