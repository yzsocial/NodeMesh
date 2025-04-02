import Edge from './Edge.js';
import { generateSHA1HashSync, capArraySize } from './Utilities.js';
import { nodeMesh, nodeMeshx, sendMessageData } from './Simulation.js';
import { MAX_EDGES } from './constants.js';
import { Keys } from './keys.js';

// Global constants
const BIGINT = false;
const showFlag = false;
// Node Class - core P2P network node
class Node {
    constructor(initNode = undefined) {
        // console.log("Node constructor:", initNode);
        // in simulation
        nodeMesh.push(this);
        nodeMeshx.nodes.push(this);
        nodeMeshx.nodes = nodeMeshx.nodes.slice(-10);
        
        this.keys = new Keys();
        this.keys.generateKeys();
        this.address = this;
        this.next = [];
        this.previous = [];
        this.edges = [];
        this.lastAccessed = new Date();
        
        if (initNode) {
            this.connectTo(initNode);
            const sharedSecret = this.findEdge(initNode.ID).sharedSecret;
            this.sendMessage(new Edge(this), new Edge(initNode), "joinMesh", this.encryptMessage(sharedSecret, initNode.publicKey));
        }
        // console.log("Node constructor exit");
    }

    encryptMessage(message, key) { return message;}
    decryptMessage(message, key) { return message;}

    // this is a placeholder for testing. Actual connection is done
    // using a STUN server.
    connectTo(newEdge) {
        const yourEdge = new Edge(newEdge);
        const myEdge = new Edge(this);
        yourEdge.sharedSecret = this.generateSecret(newEdge.ID);
        myEdge.sharedSecret = yourEdge.sharedSecret;
        //console.log("connectTo - myEdge", myEdge, yourEdge);
        newEdge.edges.unshift(myEdge);
        this.edges.unshift(yourEdge);
    }

    // this is also the public key for the node
    get ID() { return this.keys.ID; }
    get publicKey() { return this.keys.publicKey; }
    get privateKey() { return this.keys.privateKey; }
    get geolocation() { return this.keys.geolocation; }

    // this is a unique shared secret between two connected nodes
    generateSecret(key) {
        // Generate a unique random value for the secret
        const randomValue = Math.random().toString() + Date.now().toString() + this.ID + key;
        
        // Use SHA-1 hash of the random value as the secret
        return generateSHA1HashSync(randomValue);
    }

    // sort the edges whenever we add a new edge so we can easily find the closest edge
    sortEdges(edges, s2l = true) {
        return edges.sort((a, b) => {
            return s2l ? Keys.getOrder(a.ID, b.ID) : Keys.getOrder(b.ID, a.ID); // order from smallest to largest values
        });
    }

    // sort the edges by date whenever we add a new edge so we can easily delete the oldest edges
    sortDates(edges) {
        return edges.sort((a, b) => {
            // Sort by oldest first (smaller timestamps first)
            return a.lastAccessed.getTime() - b.lastAccessed.getTime();
        });
    }

    // add the new edge and send a confirmation message back to the requesting node
    // the confirmation message will include a shared secret.
    confirmEdge(newEdge) {
    //    console.log("confirmEdge --------------------- ", toEdge.ID, this.ID);
        const myEdge = new Edge(this);
        const secret = this.generateSecret(newEdge.ID);
        myEdge.secret = secret;
        newEdge.secret = secret;
        const updated = this.updateEdge(newEdge);
        if (!updated){
            this.edges.push(newEdge.clone());
            this.edges = this.sortDates(this.edges);
            this.edges = this.edges.slice(-MAX_EDGES); 
        }
        this.sendMessage(myEdge, newEdge.clone(), "approvedEdge");
    }

    // response from a node that has approved a edge request
    approvedEdge(newEdge) {
    //    console.log("approvedEdge --------------------- ", newEdge.ID, this.ID);
        const updated = this.updateEdge(newEdge);
        if (!updated){
            this.edges.push(new Edge(newEdge));
            this.edges = this.sortDates(this.edges);
            this.edges = this.edges.slice(-MAX_EDGES); 
        }
    }

    // this is the first edge to the mesh - from new node to sponsor node
    joinMesh(newEdge, encryptedSharedSecret) {
        const sharedSecret = this.decryptMessage(encryptedSharedSecret, newEdge.ID);
        const closest = this.findEdge(newEdge.ID);
        // You can only join the mesh if the shared secret is the same 
        // console.log("joinMesh - closest found, insertEdge", closest.ID, newEdge.ID);
        if(closest && closest.ID === newEdge.ID && closest.sharedSecret && closest.sharedSecret === sharedSecret) {
            // console.log("joinMesh - sharedSecret is the same", sharedSecret, closest.sharedSecret);
            //this.sendMessage(newEdge, new Edge(this), "insertEdge");
            this.insertEdge(newEdge.clone())
        }
    }

    // insert a new edge into the mesh such that the previous node ID is less than the new edge ID
    // and the next node ID is greater than the new edge ID
    insertEdge(newEdge) { 
        // console.log("insertEdge - newEdge", this.ID, newEdge.ID);
        let rval = false;
        const order = Keys.getOrder(this.ID,newEdge.ID);
        // console.log("order", this.ID, newEdge.ID, order);
        if(order < 0) { // the newEdge is a previous node to the left
            // console.log("insert to the left ", this.previous.length);
            if(this.previous.length > 0) { // there is a previous node
                let closest = this.findEdge(this.ID, "previous"); 
                // console.log("this", this.ID, "insert", newEdge.ID, "previous", closest?.ID);
                if(closest.ID < newEdge.ID){
                    this.previous.unshift(newEdge.clone()); // newEdge is new closest previous node
                    this.sendMessage(new Edge(this),newEdge.clone(), "setNextEdge"); // this is newEdge's next node
                    this.sendMessage(closest.clone(), new Edge(newEdge.clone()), "setPreviousEdge"); // closest is newEdge's previous node
                    this.sendMessage(new Edge(newEdge.clone()), closest, "setNextEdge"); // newEdge is closest next node
                    rval = true;
                 }else{
                    // someone else will insert the new edge
                    let closest = this.findEdge(newEdge.ID, "notEqual");
                    if(closest && closest != newEdge.ID) this.sendMessage(new Edge(this), closest, "insertEdge", newEdge.clone());
                    else    ("closest not found", newEdge.ID, this.ID); // this should never happen
                }
            } else { // there is no previous node, so insert the new edge at the beginning of the previous array
                // console.log("insert to the left, first previous", newEdge.ID, this.ID);
                this.previous.unshift(newEdge.clone());
                this.sendMessage(new Edge(this), newEdge.clone(), "setNextEdge");
                rval = true;
            }
        } else if (order > 0) { // the newEdge is a next node to the right
            // console.log("insert to the right ", this.next.length);
            if(this.next.length > 0) { // there is a next node
                let closest = this.findEdge(this.ID, "next"); // only check next nodes
                // console.log("this", this.ID, "insert", newEdge.ID, "next", closest?.ID);
                if(closest.ID > newEdge.ID){
                    this.next.unshift(newEdge.clone()); // newEdge is new closest previous node
                    this.sendMessage(new Edge(this),newEdge.clone(), "setPreviousEdge"); // this is newEdge's next node
                    this.sendMessage(closest.clone(), new Edge(newEdge.clone()), "setNextEdge"); // closest is newEdge's previous node
                    this.sendMessage(new Edge(newEdge.clone()), closest, "setPreviousEdge"); // newEdge is closest next node
                    rval = true;
                 }else{
                    // someone else will insert the new edge
                    let closest = this.findEdge(newEdge.ID, "notEqual");
                    if(closest && closest != newEdge.ID) this.sendMessage(new Edge(this), closest, "insertEdge", newEdge.clone());
                    else console.log("closest not found", newEdge.ID, this.ID); // this should never happen
                }
            } else { // there is no next node, so insert the new edge at the beginning of the next array
                // console.log("insert to the right, first next", this.ID,newEdge.ID);
                this.next.unshift(newEdge.clone());
                this.sendMessage(new Edge(this), newEdge, "setPreviousEdge");
                rval = true;
            }
        } else {
            console.log("insertEdge - order is 0", this.ID, newEdge.ID);
        }
        return rval;
    }


    setPreviousEdge(fromEdge) {
        //        console.log("setPreviousEdge --------------------- ", fromEdge.ID, this.ID);
        let edge = fromEdge.clone();
        this.previous.unshift(edge);
    //    this.approvedEdge(edge);
    }

    setNextEdge(fromEdge) {
//        console.log("setNextEdge --------------------- ", fromEdge.ID, this.ID);
        let edge = fromEdge.clone();
        this.next.unshift(edge);
    //    this.approvedEdge(edge);
    }   

            
    // find the closest edge to the target nodeId 
    // - search edges for the closest edge there
    // - search previous if the target nodeId is less than this nodeId
    // - search next if the target nodeId is greater than this nodeId

    findEdge(nodeId, direction = "all") {
        let bestEdge = null;
        let bestDistance = Infinity;

        // Helper function to check and update best edge
        const checkEdge = (edge) => {
            // Calculate distance to target nodeId
            if(direction !== "all" && nodeId === edge.ID) return;
            let distance = Keys.getDistance(nodeId, edge.ID);
            distance = distance < 0 ? -distance : distance; // BigInt
            if (distance < bestDistance) {
                bestDistance = distance;
                bestEdge = edge;
            }
        };

        if(direction === "all" || direction === "notEqual")
            for (const edge of this.edges) {
                checkEdge(edge);
            }
 //console.log("bestEdge - edges1 ", nodeId, bestEdge?.ID, notExact);
        // Linear search through this.previous
        if(direction !== "next") for (const edge of this.previous) {
            checkEdge(edge);
        }
 //console.log("bestEdge - previous ", nodeId, bestEdge?.ID);
        // Linear search through this.next
        if(direction !== "previous") for (const edge of this.next) {
            checkEdge(edge);
        }

        return bestEdge; // there should at least be one.
    }

    sendMessage(fromEdge, toEdge, messageType, message) {
        // console.log("sendMessage ", this.ID, fromEdge.ID, toEdge.ID, messageType, messageCount);
        if(fromEdge.jumpCount === 0) sendMessageData.messageCount++;
        fromEdge.jumpCount++;
        sendMessageData.messageJumpCount++;
        if (toEdge.ID === this.ID) { // this is me  
            this.receiveMessage(fromEdge, messageType, message);
        } else {
            const closest = this.findEdge(toEdge.ID); 
            if (closest) {
                if(showFlag) console.log("sendMessage + --------------------- ", closest.ID, this.ID, toEdge.ID);
                sendMessageData.closest.unshift(closest.ID); sendMessageData.closest = sendMessageData.closest.slice(-100);
                sendMessageData.fromEdge.unshift(fromEdge.ID); sendMessageData.fromEdge = sendMessageData.fromEdge.slice(-100);
                sendMessageData.toEdge.unshift(toEdge.ID); sendMessageData.toEdge = sendMessageData.toEdge.slice(-100);
                sendMessageData.messageType.unshift(messageType); sendMessageData.messageType = sendMessageData.messageType.slice(-100);
                sendMessageData.message.unshift(message); sendMessageData.message = sendMessageData.message.slice(-100);
                closest.address.sendMessage(fromEdge, toEdge, messageType, message); // this would be a network send
            }
            else console.error("No closest node found for ", messageType, toEdge, this);
        }
    }

    setPreviousEdge(fromEdge) {
//        console.log("setPreviousEdge --------------------- ", fromEdge.ID, this.ID);
        let edge = fromEdge.clone();
        this.previous.unshift(edge);
        this.approvedEdge(edge);
    }

    setNextEdge(fromEdge) {
//        console.log("setNextEdge --------------------- ", fromEdge.ID, this.ID);
        let edge = fromEdge.clone();
        this.next.unshift(edge);
        this.approvedEdge(edge);
    }   

    receiveMessage(fromEdge, messageType, message) {
    //    console.log("receiveMessage --------------------- ", this.ID, fromEdge.ID, this.ID, messageType);
        switch(messageType) {
            case "joinMesh":
                this.joinMesh(fromEdge, message);
                break;
            case "requestEdge":
                this.confirmEdge(fromEdge);
                break;
            case "approvedEdge":
                this.approvedEdge(fromEdge);
                break;
            case "insertEdge":
                this.insertEdge(message);
                break;
            case "setPreviousEdge":
                this.setPreviousEdge(fromEdge);
                break;
            case "setNextEdge":
                this.setNextEdge(fromEdge);
                break;
            case "message":
                this.processMessage(fromEdge, message);
                break;
            case "introducedTo":
                this.handleIntroduction(fromEdge, message);
                break;
            case "endpointInfo":
                // Now we know our public IP/port as seen by the other node
                this.publicIP = message.publicIP;
                this.publicPort = message.publicPort;
                break;
        }
    }

    // Process the received message
    processMessage(fromEdge, message) {
        // display the message - there are MANY messages, so don't uncomment unless you want to see all of them
        //   console.log("processMessage --------------------- ", this.ID, fromEdge.ID, message);
    }

    // Process each edge with a given function
    processEdges(processFn) {
        return this.edges.map(processFn);
    }
    
    // Process edges with async functions
    async processEdgesAsync(processFn) {
        return Promise.all(this.edges.map(processFn));
    }

    // Update all instances of a edge across edges, previous, and next arrays
    updateEdge(newEdge) {
        let updated = false;
        
        // Update main edges array
        this.edges = this.edges.map(conn => {
            if (conn.ID === newEdge.ID) {
                updated = true;
                return newEdge;
            }
            return conn;
        });

        // Update previous array
        this.previous = this.previous.map(conn => {
            if (conn.ID === newEdge.ID) {
                updated = true;
                return newEdge.clone();
            }
            return conn;
        });

        // Update next array
        this.next = this.next.map(conn => {
            if (conn.ID === newEdge.ID) {
                updated = true;
                return newEdge.clone();
            }
            return conn;
        });

        return updated;
    }

    // Alternative version using processEdges
    updateEdgeAlt(newEdge) {
        const updateArray = (array) => {
            return array.map(conn => 
                conn.ID === newEdge.ID ? newEdge.clone() : conn
            );
        };

        // Update all arrays
        this.edges = updateArray(this.edges);
        this.previous = updateArray(this.previous);
        this.next = updateArray(this.next);

        // Check if any updates were made
        return [...this.edges, ...this.previous, ...this.next]
            .some(conn => conn.ID === newEdge.ID);
    }

    // Introduce two nodes that are both connected to this node
    introduceNodes(node1Edge, node2Edge) {
        // First verify both edges exist
        if (!this.hasEdge(node1Edge) || !this.hasEdge(node2Edge)) {
            console.error("Can only introduce nodes that are connected to this node");
            return;
        }

        // Create introduction messages with full edge context
        const introMessage1 = {
            edge: node2Edge.getPublicInfo(),
            introducer: {
                ID: this.ID,
                edge: new Edge(this).getPublicInfo()
            }
        };

        const introMessage2 = {
            edge: node1Edge.getPublicInfo(),
            introducer: {
                ID: this.ID,
                edge: new Edge(this).getPublicInfo()
            }
        };

        // Send introductions with proper routing context
        this.sendMessage(new Edge(this), node1Edge, "introducedTo", introMessage1);
        this.sendMessage(new Edge(this), node2Edge, "introducedTo", introMessage2);
    }

    // Check if we have an active edge to this node by ID
    hasEdge(edge) {
        const targetID = edge.ID;
        return [...this.edges, ...this.previous, ...this.next]
            .some(conn => conn.ID === targetID);
    }

    // Handle being introduced to a new node
    handleIntroduction(introducerEdge, message) {
        // Get introducer's actual ID from the message
        const introducerID = message.introducer.ID;
        
        // Try to find the introducer in our edges
        let introducerFound = this.findEdge(introducerID);
        
        if (!introducerFound) {
            // If we don't have the introducer edge, establish it first
            console.log("Establishing edge to introducer first...");
            const tempEdge = new Edge({
                ...message.introducer.edge,
                address: {
                    sendMessage: () => {},
                    ...message.introducer.edge
                }
            });
            
            // Request edge to introducer first
            this.sendMessage(new Edge(this), tempEdge, "requestEdge");
            return; // Wait for edge to be established before proceeding
        }

        // Create new edge with the public information
        const newEdge = new Edge({
            ...message.edge,
            address: {
                sendMessage: () => {},
                ...message.edge
            }
        });

        // Attempt to establish edge
        this.establishP2PEdge(newEdge, {
            publicIP: introducerEdge.publicIP,
            publicPort: introducerEdge.publicPort
        });
    }

    establishP2PEdge(newEdge, introducerInfo) {
        // Different strategies based on NAT types
        switch(newEdge.natType) {
            case 'FullCone':
                // Can connect directly to the public IP/port
                this.connectDirect(newEdge);
                break;
                
            case 'RestrictedCone':
            case 'PortRestrictedCone':
                // Need hole punching, use introducer info
                this.connectWithHolePunching(newEdge, introducerInfo);
                break;
                
            case 'Symmetric':
                // Might need relay if both peers are symmetric NAT
                this.connectWithRelay(newEdge);
                break;
        }
    }

    // Attempt direct edge and get our public endpoint
    async connectDirect(targetEdge) {
        // 1. Send packet to target's public endpoint to create NAT mapping
        this.sendUDPPacket(targetEdge.publicIP, targetEdge.publicPort, {
            type: "edgeRequest",
            privateIP: this.privateIP,
            privatePort: this.privatePort,
            ID: this.ID
        });

        // 2. Target will receive packet and get our public endpoint from the packet
        // 3. Target sends back our public endpoint info
        this.sendMessage(new Edge(this), targetEdge, "requestEndpointInfo");
    }

    // Handle receiving a UDP packet
    handleUDPPacket(packet, rinfo) {
        // rinfo contains sender's public endpoint (from UDP packet headers)
        const { address: senderPublicIP, port: senderPublicPort } = rinfo;

        if (packet.type === "edgeRequest") {
            // Store sender's endpoint information
            const senderEdge = this.findEdge(packet.ID);
            if (senderEdge) {
                senderEdge.publicIP = senderPublicIP;
                senderEdge.publicPort = senderPublicPort;
                senderEdge.privateIP = packet.privateIP;
                senderEdge.privatePort = packet.privatePort;

                // Send back their public endpoint info
                this.sendMessage(new Edge(this), senderEdge, "endpointInfo", {
                    publicIP: senderPublicIP,
                    publicPort: senderPublicPort
                });
            }
        }
    }
}

export default Node; 