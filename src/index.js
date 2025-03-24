import { NODE_COUNT, NODE_CONNECTION_SCALE, NODE_MESSAGE_SCALE } from './Constants.js';
import { initializeMesh, scaleMessages, scaleConnections, reportStats } from './Simulation.js';

// Initial DOM setup
document.getElementById('app').innerHTML = 'YZ.social!';

// Display project description
console.log(`
This is a simulation of the YZ network. 
Most people are stuck on the x/y plane. We see issues and solve them by working around them without being able 
to see within them. This is often referred to the "pink" plane.
If we are able to explore the y/z plane, we get a totally new viewpoint on the issues, reaching better understanding and power.
This is of course, the "blue" plane.
    X has one dimension. Without Y and Z, it can go nowhere.

    VERSION 0.0.1
`);

// Initialize the mesh first
initializeMesh(NODE_COUNT);

// Run the simulation immediately as in the original code
//for(let i = 0; i < 10; i++) testScale(10, 10);
scaleConnections(NODE_CONNECTION_SCALE);
scaleMessages(NODE_MESSAGE_SCALE);
reportStats();