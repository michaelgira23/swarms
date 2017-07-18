export class TOC {

	/**
	 * Table of Contents. Represents an array of TOC items + some useful methods.
	 */

	constructor(public items: TOCItem[] = []) {

	}

	/**
	 * Add TOC item to the TOC array as long as it isn't a duplicate.
	 * Returns true if successfully added (no duplicate) otherwise false.
	 */

	addItem(item: TOCItem) {
		// If there's an item already, then don't add
		if (this.getItemById(item.id)) {
			return false;
		}
		this.items.push(item);
		this.items.sort((a, b) => a.id - b.id);
		return true;
	}

	/**
	 * Gets an item by its group + name.
	 * Returns null if no item exists.
	 */

	getItem(group: string, name: string) {
		for (const item of this.items) {
			if (item.group === group && item.name === name) {
				return item;
			}
		}
		return null;
	}

	/**
	 * Returns TOC item with a certain id.
	 * Returns null if no item exists.
	 */

	getItemById(id: number) {
		for (const item of this.items) {
			if (item.id === id) {
				return item;
			}
		}
		return null;
	}

}

export interface TOCItem {
	id: number;
	type: string;
	group: string;
	name: string;
}
