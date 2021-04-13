/**
 * A list of entries that have positional relationship to each other.
 * 
 * Entries can be promoted or hyped to get a higher position than other entries.
 * Clients can request the x top-most entries.
 * 
 */
export interface Hotlist<T> {
    /**
     * Promotes an entry in the hotlist.
     * If the entry does not exist, yet, it will be added to the list.
     * 
     * The effect of promoting an entry is depending on the Hotlist implementation.
     * Promotion should result in the entry to stay in the current position or higher. 
     * 
     * @param  {T} entry
     * @returns void
     */
    promote(entry: T): void;
    
    /**
     * Immediately bumps an entry to the top position.
     * If the entry does not exist, yet, it will be added to the list.
     * 
     * @param  {T} entry
     * @returns void
     */
    hype(entry: T): void;
    drop(entry: T): void;

    
    /**
     * Returns the top most ("hottest") entries of the hotlist.
     * 
     * @param  {number} count
     * @returns T an array oth the `count` top-most entries, where the 1st entry (index 0) is the top entry.
     */
    getTop(count: number): T[];
}


/**
 * A hotlist where entries promoted more recently are at the top of the list.
 * 
 */
export class MostRecentHotlist<T> implements Hotlist<T> {

    private instant = 0;
    private entryToInstant = new Map<T, number>();

    constructor(private maxSize: number) {
    }

    promote(entry: T): void {
        this.hype(entry);
    }
    
    hype(entry: T): void {
        this.entryToInstant.set(entry, this.instant++);
        this.entryToInstant = new Map([...this.entryToInstant.entries()].sort((entry1, entry2) => entry2[1] - entry1[1]).slice(0, this.maxSize));
    }

    drop(entry: T): void {
        this.entryToInstant.delete(entry);
    }

    getTop(count: number): T[] {
        if (count <= 0) {
            return [];
        }
        return [...this.entryToInstant.entries()].sort((entry1, entry2) => entry2[1] - entry1[1]).map(entry => entry[0]).slice(0, count);
    }

}



