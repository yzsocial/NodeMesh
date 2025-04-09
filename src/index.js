import { NODE_COUNT, NODE_CONNECTION_SCALE, NODE_MESSAGE_SCALE } from './constants.js';
import { initializeMesh, scaleMessages, killNodes, killLocale,resetNodes, reportStats, chordsGlobal, chordsLocal } from './simulation.js';

// Initial DOM setup
document.getElementById('app').innerHTML = 'YZ.social!';

// Display project description
console.log(`
This is a simulation of the YZ network. 

    VERSION 0.0.2
`);

// Initialize the mesh first
initializeMesh(NODE_COUNT);

scaleMessages(1000);
reportStats("no chords");

chordsGlobal();
scaleMessages(1000);
reportStats("+ global chords");

chordsLocal();
scaleMessages(1000);
reportStats("+ local chords");

scaleMessages(1000, true);
reportStats("local to local");

// remove a locale
resetNodes();
killLocale(2); 
scaleMessages(1000);
reportStats("removed locale");

// remove a percentage

for(let i = 1; i < 5; i++){
    resetNodes();
    const percentage = 0.05*i;
    killNodes(percentage); 
    scaleMessages(1000);
    reportStats((percentage*100)+"% offline");
}
