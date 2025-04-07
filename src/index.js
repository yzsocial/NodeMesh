import { NODE_COUNT, NODE_CONNECTION_SCALE, NODE_MESSAGE_SCALE } from './constants.js';
import { initializeMesh, scaleMessages, killNodes, resetNodes, reportStats, chordsGlobal, chordsLocal, getRandomNode } from './simulation.js';

// Initial DOM setup
document.getElementById('app').innerHTML = 'YZ.social!';

// Display project description
console.log(`
This is a simulation of the YZ network. 

    VERSION 0.0.2
`);

// Initialize the mesh first
initializeMesh(NODE_COUNT);

// Run the simulation immediately as in the original code
//for(let i = 0; i < 10; i++) testScale(10, 10);
//scaleConnections(NODE_CONNECTION_SCALE);
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
killNodes(0.1); // kill 10% of the nodes
scaleMessages(1000);
reportStats("10% offline")
resetNodes();
killNodes(0.15);
scaleMessages(1000);
reportStats("15% offline")
resetNodes();
killNodes(0.20);
scaleMessages(1000);
reportStats("20% offline")
resetNodes();
killNodes(0.25);
scaleMessages(1000);
reportStats("25% offline")
resetNodes();
killNodes(0.33);
scaleMessages(1000);
reportStats("33% offline")
resetNodes();
killNodes(0.40);
scaleMessages(1000);
reportStats("40% offline")
resetNodes();
killNodes(0.50);
scaleMessages(1000);
reportStats("50% offline")
resetNodes();
killNodes(0.66);
scaleMessages(1000);
reportStats("66% offline")