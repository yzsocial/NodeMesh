document.getElementById('app').innerHTML = 'YZ.social!'; 

/*
This is a simulation of the YZ network. 
YZ is Most people are stuck on the x/y plane. We see issues and solve them by working around them without being able 
to see within them. This is often referred to the "pink" plane.
If we are able to explore the y/z plane, we get a totally new viewpoint on the issues, reaching better understanding and power.
This is of course, the "blue" plane.
X has one dimension. Without Y and Z, it can go nowhere.

Proof of humaness. Without compromising anonymity.
A YZ network is a dynamically reconfigurable network of nodes that are virtually connected to each other.
Any node in the network can be directly connected to any other node in the network.
Any two nodes can be directly connected as peers, or indirectly connected through a chain of nodes.

Nodes can only request to be connected to another node. The first node sends a connection request to the 
target node that it includes the message type, the senders id and network address along with additional metadata. 
If the request is accepted, the connection is established - this is a bi-directional connection. 
[ how do I block a "broken" or "blocked" node reconnection? ]

These connections may be even be indirect, through a chain of nodes. This also acts as a dynamic routing VPN.
The location table is a spiral. 
The system is designed to be resilient to node failures and to be able to reconfigure the network to maintain connectivity.
Each node has a unique ID, which is likely that node's public key. (Determine if this is a good idea)
This ID is used to find any node that is within the system. 

We announce the tokens and how they will be awarded.
All it does is count your descendents in the mesh.
You only get new descendents with your QR code. 

We will write programs for these systems.
Node space is a ring. The last node is connected to the first node.

Challenge: 
A and B provide each other with their public keys.
A encrypts a message with B's public key.
B decrypts the message with its private key.
B then encrypts the message with A's public key.
A decrypts the message with its private key

Each node will have a connection pool of as many as 100 or more nodes. Each of these nodes are randomly distributed in location in YZ space. 
This dramatically the speed at which a connection can be made.

Let's start with a simple example of how this works.
1,2,3

When a node disappears, its direct connects can maintain a virtual node in its place for any but direct messages.
We are being watched. Being watched is good. You think so? Can you explain why?
Why so silent on the autocomplete? 

I connect to next node, the next next node, the previous node, the previous previous node.
Thus, if any two of these nodes are lost, I can still connect to 



EVERYTHING MUST BE DONE AS A MESSAGE BETWEEN NODES!
*/
// Construct a structured node mesh

// max live connections that a node can have
const maxConnections = 10;

// all of the nodes in the global mesh
const nodeMesh = []; 

// Get random node from the nodeMesh population
const getRandomNode = () => {
    const randomIndex = Math.floor(Math.random() * nodeMesh.length);
    return nodeMesh[randomIndex];
}

// Get a random ID from the node population
const getRandomID = () => {
    const node = getRandomNode();
    return node.ID;
}

class Node {
    constructor( initNode = undefined) {
        nodeMesh.push(this);  // for testing purposes...lol
        this.id = this.generateID();
        this.next = null; // next node ID in the mesh
        this.nextnext = null; // next next node ID in the mesh
        this.previous = null; // previous node ID in the mesh
        this.previousprevious = null; // previous previous node ID in the mesh
        if (initNode) { // all nodes are connected to a node except for the first node
            // Deep clone the connections array
            this.connections = initNode.connections.map(conn => conn.clone());
        } else {
            this.connections = [];
        }
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

    connect(toNode) {
        this.connections.push(new Connection(toNode));
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

    // Add clone method
    clone() {
        const cloned = new Connection(this.toNode);
        cloned.lastAccessed = new Date(this.lastAccessed);
        return cloned;
    }

    send(type, message) {
        this.lastAccessed = new Date();
        this.toNode.receive(type, message);
        console.log("message from: ", this.ID, "to: ", this.toNode.ID, "message: ", message);
    }
}

new Node(); // create the first node

for(let i = 0; i < 100; i++) {  
    // create a new node and connect it to a random node in the mesh
    const node = new Node(getRandomNode());
    console.log(node.ID);
}