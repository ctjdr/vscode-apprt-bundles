import { Minimatch } from "minimatch";

export {
    allNotMatching
};

function allNotMatching<T>(exclusionGlobs: string[], items: T[], pathProvider: (item:T) => string): T[] {

    const globs = exclusionGlobs.map(pattern => new Minimatch(pattern));

    if (globs.length === 0) {
        return items;
    }

    return items.filter( item => {
        return !globs.some(pattern => pattern.match(pathProvider(item)));
    });

}