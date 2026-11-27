const skins = require('../dist/pudl-skins.json').skins.filter(s => s.admitted).map(s => s.id);
require('./chrome-identity-cases')(skins.slice(0,5)).catch(e => { console.error(e);process.exitCode=1; });
