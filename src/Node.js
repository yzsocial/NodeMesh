import Edge from './edge.js';
import { generateSHA1HashSync, capArraySize } from './utilities.js';
import { nodeMesh, nodeMeshx, sendMessageData } from './simulation.js';
import { MAX_EDGES } from './constants.js';
import { Keys } from './keys.js';

// Global constants
const showFlag = false;
// Node Class - core P2P network node
class Node {
    constructor(sponsor = undefined) {
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
        
        if (sponsor) {
            this.sponsorNode(sponsor);
        }
        // console.log("Node constructor exit");
    }

    encryptMessage(message, key) { return message;}
    decryptMessage(message, key) { return message;}

    // this is a placeholder for testing. Actual connection ihes done
    // using a STUN server.
    sponsorNode(sponsoringNode) {
        // connect to the sponsoring node
        // At this point, both the sponsoring node and the new node have been created and have a direct link to each other
        // We send a message to the sponsoring node who generates a shared secret, and inserts the new node into the mesh
        const sponsoringEdge = new Edge(sponsoringNode);
        const myEdge = new Edge(this);
        myEdge.sponsor = sponsoringEdge.ID;
        this.edges.unshift(sponsoringEdge); // this will be replaced with the response from the sponsoring node w/ shared secret
        this.sendMessage(myEdge, sponsoringEdge, "confirmConnection"); // this is a sponsored node
    }

    connectTo(newEdge) {
        const myEdge = new Edge(this);
        this.sendMessage(myEdge, new Edge(newEdge), "confirmConnection"); // this is not  sponsored node
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
    confirmConnection(newEdge) {
        if(showFlag) console.log("confirmConnection --------------------- ", newEdge.ID, this.ID);
        const myEdge = new Edge(this);
        const secret = this.generateSecret(newEdge.ID);
        myEdge.secret = secret;
        newEdge = newEdge.clone();
        newEdge.secret = secret;
        const updated = this.updateEdge(newEdge);
        if (!updated){
            this.edges.push(newEdge);
            this.edges = this.sortDates(this.edges);
            this.edges = this.edges.slice(-MAX_EDGES); 
        }
        this.sendMessage(myEdge, newEdge.clone(), "approvedConnection");
        if(showFlag) console.log("Am I sponsor?", newEdge.sponsor, this.ID);
        if(newEdge.sponsor === this.ID) {
            if(showFlag) console.log("I am sponsor - insertMesh", newEdge.ID, this.ID);
            this.insertMesh(newEdge);
        }
    }

    // response from a node that has approved a edge request
    approvedConnection(newEdge) {
    //    console.log("approvedConnection --------------------- ", newEdge.ID, this.ID);
        const updated = this.updateEdge(newEdge);
        if (!updated){
            this.edges.push(new Edge(newEdge));
            this.edges = this.sortDates(this.edges);
            this.edges = this.edges.slice(-MAX_EDGES); 
        }
    }

    // insert a new edge into the mesh such that the previous node ID is less than the new edge ID
    // and the next node ID is greater than the new edge ID
    insertMesh(newEdge) { 
        // console.log("insertMesh - newEdge", this.ID, newEdge.ID);
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
                    if(closest && closest != newEdge.ID) this.sendMessage(new Edge(this), closest, "insertMesh", newEdge.clone());
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
                    if(closest && closest != newEdge.ID) this.sendMessage(new Edge(this), closest, "insertMesh", newEdge.clone());
                    else console.log("closest not found", newEdge.ID, this.ID); // this should never happen
                }
            } else { // there is no next node, so insert the new edge at the beginning of the next array
                // console.log("insert to the right, first next", this.ID,newEdge.ID);
                this.next.unshift(newEdge.clone());
                this.sendMessage(new Edge(this), newEdge, "setPreviousEdge");
                rval = true;
            }
        } else {
            console.log("insertMesh - order is 0", this.ID, newEdge.ID);
        }
        return rval;
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
        if(showFlag) console.log("sendMessage ", this.ID, fromEdge.ID, toEdge.ID, this.ID === toEdge.ID,messageType, message);
        if(fromEdge.hopCount === 0) {
            sendMessageData.messageCount++;
            if(!sendMessageData.messageTypeCount[messageType]) sendMessageData.messageTypeCount[messageType] = 0;
            sendMessageData.messageTypeCount[messageType]++;
        }
        fromEdge.hopCount++;
        sendMessageData.messageHopCount++;
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
        this.confirmConnection(edge);
        //this.approvedConnection(edge);
    }

    setNextEdge(fromEdge) {
//        console.log("setNextEdge --------------------- ", fromEdge.ID, this.ID);
        let edge = fromEdge.clone();
        this.next.unshift(edge);
        this.confirmConnection(edge);
        //this.approvedConnection(edge);
    }   

    receiveMessage(fromEdge, messageType, message) {
    //    console.log("receiveMessage --------------------- ", this.ID, fromEdge.ID, this.ID, messageType);
        switch(messageType) {
            case "message": // generic message
                this.processMessage(fromEdge, message);
                break;
            case "confirmConnection": // Please connect to the new node
                this.confirmConnection(fromEdge);
                break;
            case "approvedConnection": // I approve my connection to the new node and here is our shared secret
                this.approvedConnection(fromEdge);
                break;
            case "insertMesh": // Please insert the new node into the spatial mesh
                this.insertMesh(message);
                break;
            case "setPreviousEdge": // Please insert the new node to the left of me
                this.setPreviousEdge(fromEdge);
                break;
            case "setNextEdge": // Please insert the new node to the right of me
                this.setNextEdge(fromEdge);
                break;
        }
    }

    // Process the received message
    processMessage(fromEdge, message) {
        // console.log("processMessage --------------------- ", this.ID, fromEdge.ID, message);
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
}

export default Node; 