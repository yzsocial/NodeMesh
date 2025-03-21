import Node from './Node.js';
import Edge from './Edge.js';
import { MAX_EDGES } from './Constants.js'; // Import MAX_EDGES

// Export all globals used by Node and other modules
export const nodeMesh = []; 
export const nodeMeshx = { nodes: [] };
console.log("nodeMesh", nodeMesh);
console.log("nodeMeshx", nodeMeshx);

export const sendMessageData = {
    closest: [],
    fromEdge: [],
    toEdge: [],
    messageType: [],
    message: [],
    messageCount: 0,
    messageJumpCount: 0
};
export let showFlag = false;

// This is the number of nodes to create
export const NODE_COUNT = 100000;

// Get random node from the nodeMesh population
export const getRandomNode = () => {
    const randomIndex = Math.floor(Math.random() * nodeMesh.length);
    return nodeMesh[randomIndex]; 
}

// Get a random ID from the node population
export const getRandomID = () => {
    const node = getRandomNode();
    return node.ID;
}

export function reportStats() {
    let ac = 0, an = 0, ap = 0, mc = 0, mp = 0, mn = 0;
    let edgeCount = [];
    let previousCount = [];
    let nextCount = [];
    let totalEdges = 0;
    for(let i = 0; i < nodeMesh.length; i++) {
        let node = nodeMesh[i];
        if (node.edges.length > mc) mc = node.edges.length;
        totalEdges += node.edges.length;
        if (node.previous.length > mp) mp = node.previous.length;
        if (node.next.length > mn) mn = node.next.length;

        ac += node.edges.length;
        ap += node.previous.length;
        an += node.next.length;
        edgeCount[node.edges.length] = (edgeCount[node.edges.length] || 0) + 1;
        previousCount[node.previous.length] = (previousCount[node.previous.length] || 0) + 1;
        nextCount[node.next.length] = (nextCount[node.next.length] || 0) + 1;
    }
    console.log("--------------------------------");
    console.log("Total Edges ", totalEdges);
    console.log("Edges ", edgeCount);
    console.log("Previous ", previousCount);
    console.log("Next ", nextCount);
    console.log("Average Jump Count ", sendMessageData.messageJumpCount/(sendMessageData.messageCount||1));
}

export function initializeMesh(nodeCount) {
    const firstNode = new Node(); // Create the first node
    nodeMesh.push(firstNode); // Ensure the first node is added to nodeMesh

    for(let i = 0; i < nodeCount; i++) {  
        const randomNode = getRandomNode(); // This should now return a valid node
        const node = new Node(randomNode); // Create a new Node
        nodeMesh.push(node); // Add the new node to nodeMesh
        if(i % 10000 === 0) console.log("Node ", i, node.ID);
    }
    
    reportStats();
    console.log("Mesh initialized successfully");
}

export function testScale(scaleConnections = 100, scaleMessages = 100) {
    showFlag = true;
    console.log("TestScale connections ", scaleConnections, " messages ", scaleMessages);

    for(let i = 0; i < scaleConnections; i++) {
        let fromNode = getRandomNode();
        let toNode = getRandomNode();

        // Check if both nodes are defined
        if (!fromNode || !toNode) {
            console.error("Random node selection failed. One or both nodes are undefined.");
            continue; // Skip this iteration if nodes are not valid
        }

        if(fromNode.ID === toNode.ID) continue; // Avoid connecting to itself
        fromNode.connectTo(toNode);
        if(i % 10000 === 0) console.log("Request ", i);
    }

    console.log("Test Scale 2");
    sendMessageData.messageJumpCount = sendMessageData.messageCount = 0;
    for(let i = 0; i < scaleMessages; i++) {
        let fromNode = getRandomNode();
        let toNode = getRandomNode();

        // Check if both nodes are defined
        if (!fromNode || !toNode) {
            console.error("Random node selection failed. One or both nodes are undefined.");
            continue; // Skip this iteration if nodes are not valid
        }

        fromNode.sendMessage(new Edge(fromNode), new Edge(toNode), "message", "Hello");
    }
    reportStats();
}

// Export everything needed for the original behavior
export default {
    initializeMesh,
    testScale,
    reportStats,
    getRandomNode,
    getRandomID
}; 