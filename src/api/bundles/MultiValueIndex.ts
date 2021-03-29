export default class MultiValueIndex<K, V> {
    #i2v: Map<K, Set<V>> = new Map();
    
    index(idx: K, value: V) {
        let bucket = this.#i2v.get(idx);
        if (!bucket) {
            bucket = new Set<V>();
            this.#i2v.set(idx, bucket);
        }
        bucket.add(value);
    }
    
    getValues(key: K): Set<V> {
        return this.#i2v.get(key) ?? new Set();
    }
    
    getKeys(): IterableIterator<K> {
        return this.#i2v.keys();
    }
    
    clear() {
        this.#i2v.clear();
    }
    /**
     * Signal that "value" needs to be removed from all buckets.
     * Remove the index, if the buckets is empty afterwards
     * @param value
     */
    invalidateValue(value: V): void {

        const keysToDelete: K[] = [];

        for (let entry of this.#i2v.entries()) {
            const key = entry[0];
            const bucket = entry[1];
            if (bucket.has(value)) {
                if (bucket.size <= 1) {
                    keysToDelete.push(key);
                } else {
                    bucket.delete(value);
                }
            }
        }
        for (let keyToDelete of keysToDelete) {
            this.#i2v.delete(keyToDelete);
        }
    }

}
