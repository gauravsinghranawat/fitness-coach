// Web: the browser already has localStorage. (Native platforms use storage.native.ts.)
export const authStorage = typeof window === 'undefined' ? undefined : window.localStorage;
