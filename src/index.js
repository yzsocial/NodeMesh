document.getElementById('app').innerHTML = 'YZ.social!'; 

/*
This is a simulation of the YZ network. 
Most people are stuck on the x/y plane. We see issues and solve them by working around them without being able 
to see within them. This is often referred to the "pink" plane.
If we are able to explore the y/z plane, we get a totally new viewpoint on the issues, reaching better understanding and power.
This is of course, the "blue" plane.
X has one dimension. Without Y and Z, it can go nowhere.

All Communication MUST BE SENT AS A MESSAGE BETWEEN NODES!
There is never direct access between nodes. It simply is not possible.

nodeDistance
All nodes have a "distance" from each other. This is a measure of how far apart the nodes are, defined 
as converting the node IDs to a number and subtracting. This can be a positive or negative number.

Message Types:
RequestConnection - Request a connection from a node
ApproveConnection - Approve a connection request from a node, the return message will contain the address of the 
                    node to connect to, a shared secret generated by the node, and a list of other nodes that this
                    node can also connect to.
InsertConnection - Insert a new connection into the mesh
UpdateConnection - Update an existing connection address 
*/

//-----------------------------------------------------------------------
// A node has a unique ID, a public key, a private key, and a list of connections
// The ID is the same as the public key
// initConnections is an array of node connections to connect to
// initConnections[0] is the "sponsor" node that the new node will initiate connection with
//-----------------------------------------------------------------------
class Node {
    constructor( initConnection = undefined) {
        nodeMesh.push(this);  // for testing purposes...lol
        this.generateKeys(); // generate my public/private key pair
        this.address = this; // this would normally be a public IP address - for simulation, it's just the node itself
        this.next = []; // next node connections in the mesh
        this.previous = []; // previous node conections in the mesh
        this.connections = []; // list of connections to other nodes
        if (initConnection) {
            this.connections.unshift(new Connection(initConnection));
            this.sendMessage(new Connection(this), new Connection(initConnection), "requestConnection");
        }
    }

    // this is also the public key for the node
    get ID() { return this.publicKey; }

    get sharedSecret() { return this.generateSecret(); }
    
    // Calculate distance between two node IDs
    static getDistance(id1, id2) {
        return id2 - id1;
    }

    // Get distance to another node
    distanceTo(otherNode) {
        return Node.getDistance(this.ID, otherNode.ID);
    }

    generateConnection(toNode) {
        return new Connection(toNode);
    }

    // this is a unique ID for the node
    // it will be the public key for the public/private crypto key pair
    generateKeys() {
        this.publicKey = Math.random();
        this.privateKey = Math.random();
    }

    // this is a unique shared secret between two connected nodes
    generateSecret() {
        return Math.random();
    }

    // sort the connections whenever we add a new connection so we can easily find the closest connection
    sortConnections() {
        this.connections.sort((a, b) => {
            return Node.getDistance(a.ID, b.ID);
        });
    }

    // sort the connections by date whenever we add a new connection so we can easily delete the oldest connections
    sortDates() {
        this.connections.sort((a, b) => {
            // Sort by oldest first (smaller timestamps first)
            return a.lastAccessed.getTime() - b.lastAccessed.getTime();
        });
    }

    // find the closest node connection to the target node ID using binary search
    static findClosestNode(nodeId, connections) {
        if (!connections || connections.length === 0) return null;
        if (connections.length === 1) return connections[0];
        
        let left = 0;
        let right = connections.length - 1;
        
        // Binary search to find the closest position
        while (left <= right) {
            if (right - left <= 1) {
                // Compare the two adjacent elements to find the closest
                const distLeft = Math.abs(Node.getDistance(connections[left].ID, nodeId));
                const distRight = Math.abs(Node.getDistance(connections[right].ID, nodeId));
                return distLeft <= distRight ? connections[left] : connections[right];
            }
            
            const mid = Math.floor((left + right) / 2);
            const midVal = connections[mid].ID;
            
            if (midVal === nodeId) {
                return connections[mid];
            }
            
            if (midVal < nodeId) {
                left = mid;
            } else {
                right = mid;
            }
        }
        
        return connections[left];
    }

    // Find the closest connection from newConnections, comparing against referenceConnection
    static findClosestFromArray(nodeId, referenceConnection, newConnections) {
        if (!newConnections || newConnections.length === 0) return referenceConnection;
        
        // Start with the reference connection as our best match
        let closestConnection = referenceConnection;
        let minDistance = Math.abs(Node.getDistance(nodeId, referenceConnection.ID));
        
        // Linear search through newConnections to find any closer match
        for (const connection of newConnections) {
            const distance = Math.abs(Node.getDistance(nodeId, connection.ID));
            if (distance < minDistance) {
                minDistance = distance;
                closestConnection = connection;
            }
        }
        
        return closestConnection;
    }

    // Instance method wrapper
    findClosestFromArray(targetNode, referenceConnection, newConnections) {
        return Node.findClosestFromArray(targetNode.ID, referenceConnection, newConnections);
    }

    // Update the instance method to use the static method
    findClosestNode(targetNode) {
        return Node.findClosestNode(targetNode.ID, this.connections);
    }

    // add the new connection and send a confirmation message back to the requesting node
    // the confirmation message will include a shared secret.
    confirmConnection(connection) {
        connection.secret = this.generateSecret();
        this.connections.push(connection);
        this.sendMessage(new Connection(this), connection, "approveConnection");
    }

    // request connection from a list of connections
    requestConnection(connection) {
        this.sendMessage(new Connection(this), connection, "requestConnection");
    } 

    addConnection(fromConnection) {
        this.connections.push(new Connection(fromConnection));
        if (this.connections.length > MAX_CONNECTIONS) {
            this.sortDates();
            this.connections = this.connections.slice(-MAX_CONNECTIONS);
        }
        this.sortConnections(); // Sort after adding new connection
        if(this.previous.length === 0 && this.next.length === 0) this.sendMessage(new Connection(this), null, "insertConnection");
    }

    insertConnection(fromConnection) {
        if(this.distanceTo(fromConnection) < 0) {
            if(this.previous.length > 0) {
                if( Node.getDistance(this.previous[0].ID, fromConnection.ID) > 0){
                    this.previous.unshift(fromConnection.clone());
                    this.previous[0].address.sendMessage(fromConnection, null, "insertConnection");
                    // send the new connection back to requesting connection
                    this.sendMessage(new Connection(this), fromConnection, "setNextConnection");
                } else this.sendMessage(fromConnection, null, "insertConnection");
            }
            else this.previous.unshift(fromConnection.clone());
        } else {
            if(this.next.length > 0) {
                if( Node.getDistance(this.next[0].ID, fromConnection.ID) < 0){
                    this.next.unshift(fromConnection.clone());
                    this.next[0].address.sendMessage(fromConnection, null, "insertConnection");
                    // send the new connection back to requesting connection
                    this.sendMessage(new Connection(this), fromConnection, "setPreviousConnection");
                } else this.sendMessage(fromConnection, null, "insertConnection");
            }
            else this.next.unshift(fromConnection.clone());
        }
    }

    sendMessage(fromConnection, toConnection, messageType, message) {
        console.log("sendMessage", fromConnection, toConnection, messageType, message);
        if (toConnection?.ID === this.ID || messageType === "insertConnection") { // this is me
            this.receiveMessage(fromConnection, messageType, message);
        } else { // find an even closer node to send the message to
            let closest = this.findClosestNode(toConnection);
            if (closest) closest.address.sendMessage(fromConnection, toConnection, messageType, message);
            else {
                if(this.distanceTo(toConnection) > 0 && this.previous.length > 0) this.previous[0].address.sendMessage(fromConnection, toConnection.clone(), messageType, message);
                else if(this.next.length > 0) this.next[0].address.sendMessage(fromConnection, toConnection.clone(), messageType, message);
                else console.log("No closest node found");
            }
        }
    }

    setPreviousConnection(fromConnection) {
        let connection = fromConnection.clone();
        this.addConnection(connection);
        this.previous.unshift(connection);
    }

    setNextConnection(fromConnection) {
        let connection = fromConnection.clone();
        this.addConnection(connection);
        this.next.unshift(connection);
    }   

    receiveMessage(fromConnection, messageType, message) {
        console.log("receiveMessage", fromConnection, messageType, message);
        switch(messageType) {
            case "requestConnection":
                this.confirmConnection(fromConnection);
                break;
            case "approveConnection":
                this.addConnection(fromConnection, message);
                break;
            case "insertConnection":
                this.insertConnection(fromConnection);
                break;
            case "setPreviousConnection":
                this.setPreviousConnection(fromConnection);
                break;
            case "setNextConnection":
                this.setNextConnection(fromConnection);
                break;
        }
    }
}

//-----------------------------------------------------------------------
// Connection Class
// A connection holds information about a target node that allows another
// node to send messages to it.
//-----------------------------------------------------------------------
class Connection {
    constructor(toConnection) {
        this.address = toConnection.address;
        this.ID = toConnection.ID;
        this.lastAccessed = new Date();
    }

    set secret(secret) { this._secret = secret; }
    get secret() { return this._secret; }

    get ID() { this.lastAccessed = new Date(); return this._ID; }
    set ID(id) { this.lastAccessed = new Date(); this._ID = id; }

    // Add clone method
    clone() {
        const cloned = new Connection(this);
        return cloned;
    }
}

//-----------------------------------------------------------------------
// Simulation
// Construct a structured node mesh
// The node ID/public key is a unique identifier for the node
// For simulation purposes, we will use Math.random() to generate a unique ID for each node
//-----------------------------------------------------------------------
// max live connections that a node can have
const MAX_CONNECTIONS = 10;

// all of the nodes in the global mesh
const nodeMesh = []; 

console.log("nodeMesh", nodeMesh);
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

new Node(); // create the first node

for(let i = 0; i < 100; i++) {  
    console.log("--------------------------Creating node", i);
    // create a new node and connect it to a random node in the mesh
    const node = new Node(getRandomNode());
    console.log(node.ID);
}