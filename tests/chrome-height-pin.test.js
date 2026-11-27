require('./chrome-height-pin-cases')(['standard','bevel','gel','glaze','matte'])
 .catch(e=>{console.error(e);process.exitCode=1;});
