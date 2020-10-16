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
}
