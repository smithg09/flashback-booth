import { writable } from 'svelte/store';

export const currentPage = writable('landing'); // landing, selection, processing, result
export const currentResultId = writable(null);
export const selectedFrame = writable('simple-white');
export const customEmoji = writable('🎃');
export const customColor = writable('#f4ba6c');
export const selectedFilter = writable('color'); // color, bw
export const photos = writable([]); // Array of captured photo data URLs
export const finalStrip = writable(null); // The final composed strip image
