//document.getElementById('app').innerHTML = 'YZ.social!'; 

/*
This is a simulation of the YZ network. 
Most people are stuck on the x/y plane. We see issues and solve them by working around them without being able 
to see within them. This is often referred to the "pink" plane.
If we are able to explore the y/z plane, we get a totally new viewpoint on the issues, reaching better understanding and power.
This is of course, the "blue" plane.
X has one dimension. Without Y and Z, it can go nowhere.

All Communication MUST BE SENT AS A MESSAGE BETWEEN NODES!
There is never direct access between nodes. It simply is not possible.

chain - a chain is a list of nodes that are connected to each other.
[previous]<->[node]<->[next]
nodeDistance
All nodes have a "distance" from each other. This is a measure of how far apart the nodes are, defined 
as converting the node IDs to a number and subtracting. This can be a positive or negative number.

Message Types:
RequestConnection - Request a connection from a node
ApprovedConnection - Approve a connection request from a node, the return message will contain the address of the 
                    node to connect to, a shared secret generated by the node, and a list of other nodes that this
                    node can also connect to.
InsertConnection - Insert a new connection into the mesh
UpdateConnection - Update an existing connection address 

proxy - every message can be forwarded via a chain of nodes until it reaches the destination node. 
This can be done by providing a chain of connections such that the next step is encrypted with the public
key of the next node in the chain. 

This should be written in a variant of E.
*/

//-----------------------------------------------------------------------
// A node has a unique ID, a public key, a private key, and a list of connections
// The ID is the same as the public key
// initConnection is the "sponsor" node that the new node will initiate connection with
//-----------------------------------------------------------------------

const BIGINT = false;
// all of the nodes in the global mesh
const nodeMesh = []; 
const nodeMeshx = {nodes: []};
console.log("nodeMesh", nodeMesh);
console.log("nodeMeshx", nodeMeshx);
const sendMessageData = {
    closest: [],
    fromConnection: [],
    toConnection: [],
    messageType: [],
    message: [],
};
console.log("sendMessageData", sendMessageData);

// max live connections that a node can have
const MAX_CONNECTIONS = 100;
let messageCount = 0;
let messageJumpCount = 0;
let showFlag = false;
// Add these SHA-1 utility functions at the top of the file
async function generateSHA1Hash(input) {
  // Create hash from input using SubtleCrypto API
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Synchronous SHA-1 alternative for when we need immediate results
function generateSHA1HashSync(input) {
  // Simple hash algorithm (not cryptographically secure, but deterministic)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Convert to hex string with padding to look like SHA-1
  let hexString = Math.abs(hash).toString(16);
  return hexString.padStart(40, '0');
}

class Node {
    constructor(initNode = undefined, index) {
        nodeMesh.push(this);
        nodeMeshx.nodes.push(this);
        nodeMeshx.nodes = nodeMeshx.nodes.slice(-10);
        this.generateKeys();
        if(index) this.publicKey = index;
        this.address = this;
        this.next = [];
        this.previous = [];
        this.connections = [];
        this.lastAccessed = new Date();

        // Initialize network properties
        this.publicIP = null;
        this.publicPort = null;
        this.natType = null;
        this.privateIP = null;
        this.privatePort = null;
        
        if (initNode) {
            this.connectTo(initNode);
            const sharedSecret = this.findConnection(initNode.ID).sharedSecret;
            // console.log("sharedSecret", sharedSecret);
            this.sendMessage(new Connection(this), new Connection(initNode), "joinMesh", this.encryptMessage(sharedSecret, initNode.publicKey));
        }
    }

    encryptMessage(message, key) { return message;}
    decryptMessage(message, key) { return message;}

    connectTo(newConnection) {
        // Make sure we're creating a connection with a Node object 
        // NOTE: when we first touch another node (QR or otherwise) we exchange our connections + our shared secrets
        // Thus, the construction of this connection will not look like this
        const yourConnection = new Connection(newConnection);
        const myConnection = new Connection(this);
        yourConnection.sharedSecret = this.generateSecret(newConnection.ID);
        myConnection.sharedSecret = yourConnection.sharedSecret;
        // console.log("sharedSecret", yourConnection.sharedSecret, myConnection.sharedSecret);
        newConnection.connections.unshift(myConnection);
        this.connections.unshift(yourConnection);
        // this.sendMessage(myConnection, yourConnection, "requestConnection", myConnection.sharedSecret); // sharedSecret will be encrypted by the public key of the newConnection
    }

    // this is also the public key for the node
    get ID() { return this.publicKey; }
    
    // Calculate distance between two node IDs
    static getDistance(id1, id2) {
        if(BIGINT) return BigInt('0x'+id2) - BigInt('0x'+id1);
        else return id2-id1;
    }

    static getOrder(id1, id2) {
        if( id1 > id2 ) return -1; // id2 is before id1
        if( id1 < id2 ) return 1; // id2 is after id1
        return 0; // they are the same
    }

    // Get distance to another node
    distanceTo(otherNode) {
        return Node.getDistance(this.ID, otherNode.ID);
    }

    // this is a unique ID for the node
    // it will be the public key for the public/private crypto key pair
    generateKeys() {
        if(BIGINT) {
            // Generate a unique random string
            const randomValue = Math.random().toString() + Date.now().toString();
        
            // Generate privateKey as a SHA-1 hash
            this.privateKey = generateSHA1HashSync(randomValue);
            
            // Generate publicKey as SHA-1 hash of privateKey
            // This creates a relationship between private and public keys
            this.publicKey = generateSHA1HashSync(this.privateKey);
            
            return this.publicKey;
        } else {
            this.privateKey = Math.random();
            this.publicKey = Math.random();
            return this.publicKey;
        }
    }

    // this is a unique shared secret between two connected nodes
    generateSecret(key) {
        // Generate a unique random value for the secret
        const randomValue = Math.random().toString() + Date.now().toString() + key;
        
        // Use SHA-1 hash of the random value as the secret
        return generateSHA1HashSync(randomValue);
    }

    // sort the connections whenever we add a new connection so we can easily find the closest connection
    sortConnections(connections, s2l = true) {
        return connections.sort((a, b) => {
            return s2l ? Node.getOrder(a.ID, b.ID) : Node.getOrder(b.ID, a.ID); // order from smallest to largest values
        });
    }

    // sort the connections by date whenever we add a new connection so we can easily delete the oldest connections
    sortDates(connections) {
        return connections.sort((a, b) => {
            // Sort by oldest first (smaller timestamps first)
            return a.lastAccessed.getTime() - b.lastAccessed.getTime();
        });
    }


    // add the new connection and send a confirmation message back to the requesting node
    // the confirmation message will include a shared secret.
    confirmConnection(newConnection) {
    //    console.log("confirmConnection --------------------- ", toConnection.ID, this.ID);
        const myConnection = new Connection(this);
        const secret = this.generateSecret(newConnection.ID);
        myConnection.secret = secret;
        newConnection.secret = secret;
        const updated = this.updateConnection(newConnection);
        if (!updated){
            this.connections.push(newConnection.clone());
            this.connections = this.sortDates(this.connections);
            this.connections = this.connections.slice(-MAX_CONNECTIONS); 
        }
        this.sendMessage(myConnection, newConnection.clone(), "approvedConnection");
    }

    // response from a node that has approved a connection request
    approvedConnection(newConnection) {
    //    console.log("approvedConnection --------------------- ", newConnection.ID, this.ID);
        const updated = this.updateConnection(newConnection);
        if (!updated){
            this.connections.push(new Connection(newConnection));
            this.connections = this.sortDates(this.connections);
            this.connections = this.connections.slice(-MAX_CONNECTIONS); 
        }
    }

    // this is the first connection to the mesh - from new node to sponsor node
    joinMesh(newConnection, encryptedSharedSecret) {
        const sharedSecret = this.decryptMessage(encryptedSharedSecret, newConnection.ID);
        const closest = this.findConnection(newConnection.ID);
        // You can only join the mesh if the shared secret is the same 
        // console.log("joinMesh - closest found, insertConnection", closest.ID, newConnection.ID);
        if(closest && closest.ID === newConnection.ID && closest.sharedSecret && closest.sharedSecret === sharedSecret) {
            // console.log("joinMesh - sharedSecret is the same", sharedSecret, closest.sharedSecret);
            //this.sendMessage(newConnection, new Connection(this), "insertConnection");
            this.insertConnection(newConnection.clone())
        }
    }

    // insert a new connection into the mesh such that the previous node ID is less than the new connection ID
    // and the next node ID is greater than the new connection ID
    insertConnection(newConnection) { 
        // console.log("insertConnection - newConnection", this.ID, newConnection.ID);
        let rval = false;
        const order = Node.getOrder(this.ID,newConnection.ID);
        // console.log("order", this.ID, newConnection.ID, order);
        if(order < 0) { // the newConnection is a previous node to the left
            // console.log("insert to the left ", this.previous.length);
            if(this.previous.length > 0) { // there is a previous node
                let closest = this.findConnection(this.ID, "previous"); 
                // console.log("this", this.ID, "insert", newConnection.ID, "previous", closest?.ID);
                if(closest.ID < newConnection.ID){
                    this.previous.unshift(newConnection.clone()); // newConnection is new closest previous node
                    this.sendMessage(new Connection(this),newConnection.clone(), "setNextConnection"); // this is newConnection's next node
                    this.sendMessage(closest.clone(), new Connection(newConnection.clone()), "setPreviousConnection"); // closest is newConnection's previous node
                    this.sendMessage(new Connection(newConnection.clone()), closest, "setNextConnection"); // newConnection is closest next node
                    rval = true;
                 }else{
                    // someone else will insert the new connection
                    let closest = this.findConnection(newConnection.ID, "notEqual");
                    if(closest && closest != newConnection.ID) this.sendMessage(new Connection(this), closest, "insertConnection", newConnection.clone());
                    else    ("closest not found", newConnection.ID, this.ID); // this should never happen
                }
            } else { // there is no previous node, so insert the new connection at the beginning of the previous array
                // console.log("insert to the left, first previous", newConnection.ID, this.ID);
                this.previous.unshift(newConnection.clone());
                this.sendMessage(new Connection(this), newConnection.clone(), "setNextConnection");
                rval = true;
            }
        } else if (order > 0) { // the newConnection is a next node to the right
            // console.log("insert to the right ", this.next.length);
            if(this.next.length > 0) { // there is a next node
                let closest = this.findConnection(this.ID, "next"); // only check next nodes
                // console.log("this", this.ID, "insert", newConnection.ID, "next", closest?.ID);
                if(closest.ID > newConnection.ID){
                    this.next.unshift(newConnection.clone()); // newConnection is new closest previous node
                    this.sendMessage(new Connection(this),newConnection.clone(), "setPreviousConnection"); // this is newConnection's next node
                    this.sendMessage(closest.clone(), new Connection(newConnection.clone()), "setNextConnection"); // closest is newConnection's previous node
                    this.sendMessage(new Connection(newConnection.clone()), closest, "setPreviousConnection"); // newConnection is closest next node
                    rval = true;
                 }else{
                    // someone else will insert the new connection
                    let closest = this.findConnection(newConnection.ID, "notEqual");
                    if(closest && closest != newConnection.ID) this.sendMessage(new Connection(this), closest, "insertConnection", newConnection.clone());
                    else console.log("closest not found", newConnection.ID, this.ID); // this should never happen
                }
            } else { // there is no next node, so insert the new connection at the beginning of the next array
                // console.log("insert to the right, first next", this.ID,newConnection.ID);
                this.next.unshift(newConnection.clone());
                this.sendMessage(new Connection(this), newConnection, "setPreviousConnection");
                rval = true;
            }
        } else {
            console.log("insertConnection - order is 0", this.ID, newConnection.ID);
        }
        return rval;
    }


    setPreviousConnection(fromConnection) {
        //        console.log("setPreviousConnection --------------------- ", fromConnection.ID, this.ID);
        let connection = fromConnection.clone();
        this.previous.unshift(connection);
    //    this.approvedConnection(connection);
    }

    setNextConnection(fromConnection) {
//        console.log("setNextConnection --------------------- ", fromConnection.ID, this.ID);
        let connection = fromConnection.clone();
        this.next.unshift(connection);
    //    this.approvedConnection(connection);
    }   

            
    // find the closest connection to the target nodeId 
    // - search connections for the closest connection there
    // - search previous if the target nodeId is less than this nodeId
    // - search next if the target nodeId is greater than this nodeId

    findConnection(nodeId, direction = "all") {
        let bestConnection = null;
        let bestDistance = Infinity;

        // Helper function to check and update best connection
        const checkConnection = (connection) => {
            // Calculate distance to target nodeId
            if(direction !== "all" && nodeId === connection.ID) return;
            let distance = Node.getDistance(nodeId, connection.ID);
            distance = distance < 0 ? -distance : distance; // BigInt
            if (distance < bestDistance) {
                bestDistance = distance;
                bestConnection = connection;
            }
        };

        if(direction === "all" || direction === "notEqual")
            for (const connection of this.connections) {
                checkConnection(connection);
            }
 //console.log("bestConnection - connections1 ", nodeId, bestConnection?.ID, notExact);
        // Linear search through this.previous
        if(direction !== "next") for (const connection of this.previous) {
            checkConnection(connection);
        }
 //console.log("bestConnection - previous ", nodeId, bestConnection?.ID);
        // Linear search through this.next
        if(direction !== "previous") for (const connection of this.next) {
            checkConnection(connection);
        }

        return bestConnection; // there should at least be one.
    }

    sendMessage(fromConnection, toConnection, messageType, message) {
       // console.log("sendMessage ", this.ID, fromConnection.ID, toConnection.ID, messageType);
        if(fromConnection.jumpCount === 0) messageCount++;
        fromConnection.jumpCount++;
        messageJumpCount++;
        if (toConnection.ID === this.ID) { // this is me
            this.receiveMessage(fromConnection, messageType, message);
        } else {
            const closest = this.findConnection(toConnection.ID); 
            if (closest) {
                //if(showFlag) console.log("sendMessage + --------------------- ", closest.ID, this.ID, toConnection.ID);
                sendMessageData.closest.unshift(closest.ID); sendMessageData.closest = sendMessageData.closest.slice(-100);
                sendMessageData.fromConnection.unshift(fromConnection.ID); sendMessageData.fromConnection = sendMessageData.fromConnection.slice(-100);
                sendMessageData.toConnection.unshift(toConnection.ID); sendMessageData.toConnection = sendMessageData.toConnection.slice(-100);
                sendMessageData.messageType.unshift(messageType); sendMessageData.messageType = sendMessageData.messageType.slice(-100);
                sendMessageData.message.unshift(message); sendMessageData.message = sendMessageData.message.slice(-100);
                closest.address.sendMessage(fromConnection, toConnection, messageType, message); // this would be a network send
            }
            else console.error("No closest node found for ", messageType, toConnection, this);
        }
    }

    setPreviousConnection(fromConnection) {
//        console.log("setPreviousConnection --------------------- ", fromConnection.ID, this.ID);
        let connection = fromConnection.clone();
        this.previous.unshift(connection);
        this.approvedConnection(connection);
    }

    setNextConnection(fromConnection) {
//        console.log("setNextConnection --------------------- ", fromConnection.ID, this.ID);
        let connection = fromConnection.clone();
        this.next.unshift(connection);
        this.approvedConnection(connection);
    }   

    receiveMessage(fromConnection, messageType, message) {
    //    console.log("receiveMessage --------------------- ", this.ID, fromConnection.ID, this.ID, messageType);
        switch(messageType) {
            case "joinMesh":
                this.joinMesh(fromConnection, message);
                break;
            case "requestConnection":
                this.confirmConnection(fromConnection);
                break;
            case "approvedConnection":
                this.approvedConnection(fromConnection);
                break;
            case "insertConnection":
                this.insertConnection(message);
                break;
            case "setPreviousConnection":
                this.setPreviousConnection(fromConnection);
                break;
            case "setNextConnection":
                this.setNextConnection(fromConnection);
                break;
            case "message":
                this.processMessage(fromConnection, message);
                break;
            case "introducedTo":
                this.handleIntroduction(fromConnection, message);
                break;
            case "endpointInfo":
                // Now we know our public IP/port as seen by the other node
                this.publicIP = message.publicIP;
                this.publicPort = message.publicPort;
                break;
        }
    }

    // Process the received message
    processMessage(fromConnection, message) {
        // display the message - there are MANY messages, so don't uncomment unless you want to see all of them
        //   console.log("processMessage --------------------- ", this.ID, fromConnection.ID, message);
    }

    // Process each connection with a given function
    processConnections(processFn) {
        return this.connections.map(processFn);
    }
    
    // Process connections with async functions
    async processConnectionsAsync(processFn) {
        return Promise.all(this.connections.map(processFn));
    }

    // Update all instances of a connection across connections, previous, and next arrays
    updateConnection(newConnection) {
        let updated = false;
        
        // Update main connections array
        this.connections = this.connections.map(conn => {
            if (conn.ID === newConnection.ID) {
                updated = true;
                return newConnection;
            }
            return conn;
        });

        // Update previous array
        this.previous = this.previous.map(conn => {
            if (conn.ID === newConnection.ID) {
                updated = true;
                return newConnection.clone();
            }
            return conn;
        });

        // Update next array
        this.next = this.next.map(conn => {
            if (conn.ID === newConnection.ID) {
                updated = true;
                return newConnection.clone();
            }
            return conn;
        });

        return updated;
    }

    // Alternative version using processConnections
    updateConnectionAlt(newConnection) {
        const updateArray = (array) => {
            return array.map(conn => 
                conn.ID === newConnection.ID ? newConnection.clone() : conn
            );
        };

        // Update all arrays
        this.connections = updateArray(this.connections);
        this.previous = updateArray(this.previous);
        this.next = updateArray(this.next);

        // Check if any updates were made
        return [...this.connections, ...this.previous, ...this.next]
            .some(conn => conn.ID === newConnection.ID);
    }

    // Introduce two nodes that are both connected to this node
    introduceNodes(node1Connection, node2Connection) {
        // First verify both connections exist
        if (!this.hasConnection(node1Connection) || !this.hasConnection(node2Connection)) {
            console.error("Can only introduce nodes that are connected to this node");
            return;
        }

        // Create introduction messages with full connection context
        const introMessage1 = {
            connection: node2Connection.getPublicInfo(),
            introducer: {
                ID: this.ID,
                connection: new Connection(this).getPublicInfo()
            }
        };

        const introMessage2 = {
            connection: node1Connection.getPublicInfo(),
            introducer: {
                ID: this.ID,
                connection: new Connection(this).getPublicInfo()
            }
        };

        // Send introductions with proper routing context
        this.sendMessage(new Connection(this), node1Connection, "introducedTo", introMessage1);
        this.sendMessage(new Connection(this), node2Connection, "introducedTo", introMessage2);
    }

    // Check if we have an active connection to this node by ID
    hasConnection(connection) {
        const targetID = connection.ID;
        return [...this.connections, ...this.previous, ...this.next]
            .some(conn => conn.ID === targetID);
    }

    // Handle being introduced to a new node
    handleIntroduction(introducerConnection, message) {
        // Get introducer's actual ID from the message
        const introducerID = message.introducer.ID;
        
        // Try to find the introducer in our connections
        let introducerFound = this.findConnection(introducerID);
        
        if (!introducerFound) {
            // If we don't have the introducer connection, establish it first
            console.log("Establishing connection to introducer first...");
            const tempConnection = new Connection({
                ...message.introducer.connection,
                address: {
                    sendMessage: () => {},
                    ...message.introducer.connection
                }
            });
            
            // Request connection to introducer first
            this.sendMessage(new Connection(this), tempConnection, "requestConnection");
            return; // Wait for connection to be established before proceeding
        }

        // Create new connection with the public information
        const newConnection = new Connection({
            ...message.connection,
            address: {
                sendMessage: () => {},
                ...message.connection
            }
        });

        // Attempt to establish connection
        this.establishP2PConnection(newConnection, {
            publicIP: introducerConnection.publicIP,
            publicPort: introducerConnection.publicPort
        });
    }

    establishP2PConnection(newConnection, introducerInfo) {
        // Different strategies based on NAT types
        switch(newConnection.natType) {
            case 'FullCone':
                // Can connect directly to the public IP/port
                this.connectDirect(newConnection);
                break;
                
            case 'RestrictedCone':
            case 'PortRestrictedCone':
                // Need hole punching, use introducer info
                this.connectWithHolePunching(newConnection, introducerInfo);
                break;
                
            case 'Symmetric':
                // Might need relay if both peers are symmetric NAT
                this.connectWithRelay(newConnection);
                break;
        }
    }

    // Attempt direct connection and get our public endpoint
    async connectDirect(targetConnection) {
        // 1. Send packet to target's public endpoint to create NAT mapping
        this.sendUDPPacket(targetConnection.publicIP, targetConnection.publicPort, {
            type: "connectionRequest",
            privateIP: this.privateIP,
            privatePort: this.privatePort,
            ID: this.ID
        });

        // 2. Target will receive packet and get our public endpoint from the packet
        // 3. Target sends back our public endpoint info
        this.sendMessage(new Connection(this), targetConnection, "requestEndpointInfo");
    }

    // Handle receiving a UDP packet
    handleUDPPacket(packet, rinfo) {
        // rinfo contains sender's public endpoint (from UDP packet headers)
        const { address: senderPublicIP, port: senderPublicPort } = rinfo;

        if (packet.type === "connectionRequest") {
            // Store sender's endpoint information
            const senderConnection = this.findConnection(packet.ID);
            if (senderConnection) {
                senderConnection.publicIP = senderPublicIP;
                senderConnection.publicPort = senderPublicPort;
                senderConnection.privateIP = packet.privateIP;
                senderConnection.privatePort = packet.privatePort;

                // Send back their public endpoint info
                this.sendMessage(new Connection(this), senderConnection, "endpointInfo", {
                    publicIP: senderPublicIP,
                    publicPort: senderPublicPort
                });
            }
        }
    }
}

//-----------------------------------------------------------------------
// Connection Class
// A connection holds information about a target node that allows another
// node to send messages to it.
//-----------------------------------------------------------------------
class Connection {
    constructor(node) {
        // Basic identification
        this.publicKey = node.publicKey;
        
        // Handle both Node instances and temporary node-like objects
        if (node.address) {
            // If it's a Connection object or has an address property
            this.address = node.address;
        } else {
            // If it's a Node instance or a temporary node-like object
            this.address = node;
        }
        
        this.lastAccessed = new Date();
        this.jumpCount = 0;

        // Real network information (get from the actual node/object)
        const sourceNode = this.address;
        this.publicIP = sourceNode.publicIP;
        this.publicPort = sourceNode.publicPort;
        this.natType = sourceNode.natType;
        this.privateIP = sourceNode.privateIP;
        this.privatePort = sourceNode.privatePort;

        // For secure communication
        // this.secret = sourceNode.secret;
    }

    get ID() { return this.publicKey; }
    // Clone method needs to copy all network info and maintain node reference
    clone() {
        this.lastAccessed = new Date();
        return new Connection(this);
    }

    // Get connection info that can be shared with other peers
    getPublicInfo() {
        return {
            ID: this.ID,
            publicIP: this.publicIP,
            publicPort: this.publicPort,
            natType: this.natType
        };
    }
}

//-----------------------------------------------------------------------
// Simulation
// Construct a structured node mesh
// The node ID/public key is a unique identifier for the node
// For simulation purposes, we will use Math.random() to generate a unique ID for each node
//-----------------------------------------------------------------------

// This is the number of nodes to create
const NODE_COUNT = 100000;


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

for(let i = 0; i < NODE_COUNT; i++) {  
    // Pass the random node itself, not a connection
    const randomNode = getRandomNode();
    const node = new Node(randomNode);
    if(i % 10000 === 0) console.log("Node ", i, node.ID);
}

function reportStats() {
    let ac = 0, an = 0, ap = 0, mc = 0, mp = 0, mn = 0;
    let connectionCount = [];
    let previousCount = [];
    let nextCount = [];
    let totalConnections = 0;
    for(let i = 0; i < nodeMesh.length; i++) {
        let node = nodeMesh[i];
        if (node.connections.length > mc) mc = node.connections.length;
        totalConnections += node.connections.length;
        if (node.previous.length > mp) mp = node.previous.length;
        if (node.next.length > mn) mn = node.next.length;

        ac += node.connections.length;
        ap += node.previous.length;
        an += node.next.length;
        connectionCount[node.connections.length] = (connectionCount[node.connections.length] || 0) + 1;
        previousCount[node.previous.length] = (previousCount[node.previous.length] || 0) + 1;
        nextCount[node.next.length] = (nextCount[node.next.length] || 0) + 1;
    }
    console.log("--------------------------------");
    //console.log("Max ", "mc", mc, "mp", mp, "mn", mn);
    //console.log("Average ", "ac", ac/nodeMesh.length, "ap", ap/nodeMesh.length, "an", an/nodeMesh.length);
    console.log("Total Connections ", totalConnections);
    console.log("Connections ", connectionCount);
    console.log("Previous ", previousCount);
    console.log("Next ", nextCount);
    console.log("Average Jump Count ", messageJumpCount/(messageCount||1));
}
reportStats();

function testScale(scale) {
    showFlag = true;
    console.log("Test Scale 1");

    for(let i = 0; i < scale; i++) {
        //console.log("Request ", i);
        let fromNode = getRandomNode();
        let toNode = getRandomNode();
        if(fromNode.ID === toNode.ID) continue;//
        fromNode.connectTo(toNode);
        // fromNode.sendMessage(new Connection(fromNode), new Connection(toNode), "requestConnection", "Hello");
        if(i % 10000 === 0) console.log("Request ", i);
    }


    console.log("Test Scale 2");
//    reportStats();
    messageJumpCount = messageCount = 0;
    for(let i = 0; i < 100000; i++) {
        // console.log("Message ", i);
        let fromNode = getRandomNode();
        let toNode = getRandomNode();
        fromNode.sendMessage(new Connection(fromNode), new Connection(toNode), "message", "Hello");
    }
    reportStats();
}

// testScale(1);
for(let i = 0; i < 10; i++) testScale(100000);
// testScale(10000);
// testScale(100000);
// testScale(1000000);
// testScale(10000000);
// testScale(100000000);

// Add this utility function to your code
function capArraySize(array, maxSize, sortFn = null) {
    if (array.length <= maxSize) return array; // No need to cap if under limit
    
    // Sort the array if a sort function is provided
    if (sortFn) {
        array.sort(sortFn);
    }
    
    // Return only the last maxSize elements (newest elements)
    return array.slice(-maxSize);
}
