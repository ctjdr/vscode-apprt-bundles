import { Minimatch } from "minimatch";

export {
    allNotMatching
};
/**
 * Filters a list of file path-assigned items by globs.
 * 
 * @param  {string[]} exclusionGlobs List of globs defining which paths should be excluded.
 * @param  {T[]} items Items to be filtered.
 * @param  {(item:T)=>string} pathProvider Function mapping an item to its file path which is matched against the globs.
 * @returns all items whose patch is *not* matching any of the globs
 */
function allNotMatching<T>(exclusionGlobs: string[], items: T[], pathProvider: (item:T) => string): T[] {

    const globs = exclusionGlobs.map(pattern => new Minimatch(pattern));

    if (globs.length === 0) {
        return items;
    }

    return items.filter( item => {
        return !globs.some(pattern => pattern.match(pathProvider(item)));
    });

}