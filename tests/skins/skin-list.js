/* Review candidates as well as admitted skins; registration is no admission. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
module.exports = function skinList(source) {
  return JSON.parse(fs.readFileSync(path.join(source, 'skins/registry.json'), 'utf8')).map(entry => entry.id);
};
