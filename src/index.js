document.getElementById('app').innerHTML = 'YZ.social!'; 


// Construct a structured node mesh

const maxConnections = 10;
// all of the nodes in the global mesh
const nodeMesh = []; 
// Get random node from nodeMesh
const getRandomNode = () => {
    const randomIndex = Math.floor(Math.random() * nodeMesh.length);
    return nodeMesh[randomIndex];
}

class Node {
    constructor( initNode = undefined) {
        nodeMesh.push(this);
        this.id = this.generateID();
        this.next = null; // next node ID in the mesh
        this.previous = null; // previous node ID in the mesh
        if (initNode) { // all nodes are connected to a node except for the first node
            // copy the connections from the initNode to bootstrap its connections
            this.connections = [...initNode.connections];
        } else this.connections = [];
    }

    get ID() {
        return this.id;
    }

    // Calculate distance between two node IDs
    static getDistance(id1, id2) {
        // Convert both IDs to their binary representation
        const bin1 = Buffer.from(id1).toString('binary');
        const bin2 = Buffer.from(id2).toString('binary');
        
        // XOR the binary strings and count the 1s
        let distance = 0;
        const maxLength = Math.max(bin1.length, bin2.length);
        
        for (let i = 0; i < maxLength; i++) {
            const byte1 = bin1.charCodeAt(i) || 0;
            const byte2 = bin2.charCodeAt(i) || 0;
            const xor = byte1 ^ byte2;
            // Count the 1s in xor (Hamming weight)
            distance += xor.toString(2).replace(/0/g, '').length;
        }
        
        return distance;
    }

    // Get distance to another node
    distanceTo(otherNode) {
        return Node.getDistance(this.id, otherNode.id);
    }

    // this is a unique ID for the node
    // it will be the public key for the public/private crypto key pair
    generateID() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // sort the connections whenever we add a new connection so we can easily find the closest connection
    sortConnections() {
        const selfId = this.id;
        this.connections.sort((a, b) => {
            const distA = Node.getDistance(selfId, a.ID);
            const distB = Node.getDistance(selfId, b.ID);
            return distA - distB;  // Sort by closest first
        });
    }

    findClosestNode(targetNode) {
        if (this.connections.length === 0) return null;
        
        return this.connections.reduce((closest, current) => {
            const currentDistance = Node.getDistance(current.ID, targetNode.id);
            const closestDistance = Node.getDistance(closest.ID, targetNode.id);
            
            return currentDistance < closestDistance ? current : closest;
        }, this.connections[0]);
    }

    connect(node) {
        this.connections.push(new Connection(node));
        this.sortConnections(); // Sort after adding new connection
        // Truncate to maxConnections by keeping only the last elements
        if (this.connections.length > maxConnections) {
            this.connections = this.connections.slice(-maxConnections);
        }
    }
}

class Connection {
    constructor(toNode) {
        this.toNode = toNode;
        this.ID = toNode.ID;
        this.lastAccessed = new Date();
    }

    send(message) {
        this.lastAccessed = new Date();
        console.log("message from: ", this.ID, "to: ", this.toNode.ID, "message: ", message);
    }
}

new Node(); // create the first node

for(let i = 0; i < 100; i++) {  
    // create a new node and connect it to a random node in the mesh
    const node = new Node(getRandomNode());
    console.log(node.ID);
}