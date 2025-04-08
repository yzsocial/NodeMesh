import Node from './node.js';
import Edge from './edge.js';

// Export all globals used by Node and other modules
export const nodeMesh = []; 
export const nodeMeshx = { nodes: [] };
export const nodeMeshLocal = [];
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
    messageHopCount: 0,
    errorCount: 0
};
export let showFlag = false;

function resetSendMessageData(){
    sendMessageData.closest = [];
    sendMessageData.fromEdge = [];
    sendMessageData.toEdge = [];
    sendMessageData. messageType = [];
    sendMessageData.messageTypeCount = {};
    sendMessageData. message = [];
    sendMessageData.messageCount = 0,
    sendMessageData.messageHopCount= 0,
    sendMessageData.errorCount = 0
}
// This is the number of nodes to create

// Get random node from the nodeMesh population
export const getRandomNode = () => {
    const randomIndex = Math.floor(Math.random() * nodeMesh.length);
    return nodeMesh[randomIndex]; 
}
export const getRandomNodeLocal = () => {
    const randomIndex = Math.floor(Math.random() * nodeMeshLocal.length);
    return nodeMeshLocal[randomIndex]; 
}

// Get a random ID from the node population
export const getRandomID = () => {
    const node = getRandomNode();
    return node.ID;
}

export function reportStats(message) {
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
    console.log("================================");
    console.log("===== ", message);
    console.log("================================");
    console.log("Total Edges ", totalEdges);
    console.log("Edges ", edgeCount);
    console.log("Previous ", previousCount);
    console.log("Next ", nextCount);
    console.log("Message Types ", sendMessageData.messageTypeCount);
    console.log("**** Average Hop Count ", sendMessageData.messageHopCount/(sendMessageData.messageCount||1));
    console.log("**** Error Count ", sendMessageData.errorCount);
    testConnections()
    console.log("--------------------------------");

    resetSendMessageData();
}

export function initializeMesh(nodeCount) {
    const firstNode = new Node(); // Create the first node
    firstNode.index = 1;
    nodeMesh.push(firstNode); // Ensure the first node is added to nodeMesh

    for(let i = 0; i < nodeCount; i++) {  
        const randomNode = getRandomNode(); // This should now return a valid node
        const node = new Node(randomNode); // Create a new Node
        node.index = i+2;
        nodeMesh.push(node); // Add the new node to nodeMesh
        if(node.geolocation === 1)nodeMeshLocal.push(node);
        if(i % 10000 === 0) console.log("Node ", i, node.ID);
    }
    
    reportStats("initialize mesh");
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

export function scaleMessages(scaleMessages = 100, local) {
    resetSendMessageData();
    console.log("Test scale messages ", scaleMessages, " local ", local);
    sendMessageData.messageHopCount = sendMessageData.messageCount = 0;
    for(let i = 0; i < scaleMessages; i++) {
        let fromNode = local ? getRandomNodeLocal() : getRandomNode();
        let toNode = local ? getRandomNodeLocal() : getRandomNode();

        // Check if both nodes are defined
        if (!fromNode || !toNode) {
            console.error("Random node selection failed. One or both nodes are undefined.");
            continue; // Skip this iteration if nodes are not valid
        }
        if(fromNode.available) {
            // if(!toNode.available) console.log("toNode ", toNode.ID, " is not available");
            fromNode.sendMessage(new Edge(fromNode), new Edge(toNode), "message", "Hello");
        }
        else {
            // console.log("fromNode ", fromNode.ID, " is not available"); 
        }
    }
}

export function chordsGlobal(scaleChords = 10){
    for (const node of nodeMesh) { node.chordsGlobal(); }
}
export function chordsLocal(scaleChords = 10){
    for (const node of nodeMesh) { node.chordsLocal(); }
}

// destroy a percentage of the nodes
export function killNodes( percent ){
    for (const node of nodeMesh) { if(Math.random()<percent) node.available = false; }
}

// destroy a percentage of the nodes
export function killLocale( globalLoc ){
    for (const node of nodeMesh) {  if( node.geolocation === globalLoc) node.available = false; }
}

export function resetNodes(){
    for (const node of nodeMesh) { node.available = true; node.connection = null;}
}

class ConnectionIndex {
    constructor(index){
        this.index = index;
    }
};
export function testConnections(){
    for (const node of nodeMesh) {
        if(!node.available) continue;
        let connectionIndex;
        if(node.connectionIndex) connectionIndex = node.connectionIndex; // already visited
        else connectionIndex = new ConnectionIndex(node.index); // new node
        const connections = node.edges.concat(node.previous,node.next); // all connections from this node
        for (const edge of connections) {
            if(!edge.address) console.log("edge.address is undefined", edge);
            if(edge?.address.available) // is available
                if(edge.address.connectionIndex){
                    if(edge.address.connectionIndex.index < connectionIndex.index)
                        connectionIndex.index = edge.address.connectionIndex.index;
                    else edge.address.connectionIndex.index = connectionIndex.index;
                }
                else edge.address.connectionIndex = connectionIndex;
        }
    }
    const allConnections = [];
    for (const node of nodeMesh) {
        if(!node.available) continue;
        const index = node.connectionIndex.index;
        if(allConnections.includes(index)) continue;
        allConnections.push(index);
    }
    console.log("All connections ", allConnections);
}