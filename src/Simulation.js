import Node from './node.js';
import Edge from './edge.js';

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
    messageTypeCount: {},
    message: [],
    messageCount: 0,
    messageHopCount: 0
};
export let showFlag = false;

// This is the number of nodes to create

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
    console.log("Average Hop Count ", sendMessageData.messageHopCount/(sendMessageData.messageCount||1));
    console.log("Message Types ", sendMessageData.messageTypeCount);
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

export function scaleConnections(scaleConnections = 100) {
    showFlag = true;
    console.log("Test scale connections ", scaleConnections, " messages ", scaleMessages);

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
}

export function scaleMessages(scaleMessages = 100) {
    console.log("Test scale messages 2");
    sendMessageData.messageHopCount = sendMessageData.messageCount = 0;
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
}

// Export everything needed for the original behavior
export default {
    initializeMesh,
    reportStats,
    getRandomNode,
    getRandomID
}; 