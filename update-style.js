const fs = require('fs');
let svelte = fs.readFileSync('src/lib/Landing.svelte', 'utf8');

// We will manually rewrite the style tag keeping the variables and keeping it mobile-first.
