/**
 * A list of items that have positional relationship to each other.
 * 
 * Items can be promoted or hyped to get a higher position than other items.
 * Clients can request the x top-most items.
 * 
 */
export interface Hotlist<T> {
    /**
     * Promotes an item in the hotlist.
     * If the item does not exist, yet, it will be added to the list.
     * 
     * The effect of promoting an item is depending on the Hotlist implementation.
     * Promotion should result in the item to stay in the current position or higher. 
     * 
     * @param  {T} item
     * @returns void
     */
    promote(item: T): void;
    
    /**
     * Immediatly bumps an item to the top position.
     * If the item does not exist, yet, it will be added to the list.
     * 
     * @param  {T} item
     * @returns void
     */
    hype(item: T): void;
    drop(item: T): void;

    
    /**
     * Returns the top most ("hottest") items of the hotlist.
     * 
     * @param  {number} count
     * @returns T an array oth the `count`top-most items, where the 1st item (index 0) is the top item.
     */
    getTop(count: number): T[];
}


/**
 * A hotlist where items promoted more recently are at the top of the list.
 * 
 */
export class MostRecentHotlist<T> implements Hotlist<T> {

    private instant = 0;
    private bundleToInstant = new Map<T, number>();

    constructor(private maxSize: number) {
    }

    promote(bundleName: T): void {
        this.hype(bundleName);
    }
    
    hype(bundleName: T): void {
        this.bundleToInstant.set(bundleName, this.instant++);
        this.bundleToInstant = new Map([...this.bundleToInstant.entries()].sort((entry1, entry2) => entry2[1] - entry1[1]).slice(0, this.maxSize));
    }

    drop(bundleName: T): void {
        this.bundleToInstant.delete(bundleName);
    }

    getTop(count: number): T[] {
        if (count <= 0) {
            return [];
        }
        return [...this.bundleToInstant.entries()].sort((entry1, entry2) => entry2[1] - entry1[1]).map(entry => entry[0]).slice(0, count);
    }

}



