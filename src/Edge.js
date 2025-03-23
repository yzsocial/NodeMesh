// Edge Class - for managing connections between nodes
class Edge {
    constructor(node) {
        // Basic identification
        this.publicKey = node.publicKey;
        this.localKey = node.localKey;
        // Handle both Node instances and temporary node-like objects
        if (node.address) {
            // If it's a Edge object or has an address property
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
    get LocalID() { return this.localKey+this.publicKey; } 
    // Clone method needs to copy all network info and maintain node reference
    clone() {
        this.lastAccessed = new Date();
        return new Edge(this);
    }

    // Get edge info that can be shared with other peers
    getPublicInfo() {
        return {
            ID: this.ID,
            publicIP: this.publicIP,
            publicPort: this.publicPort,
            natType: this.natType
        };
    }
}

export default Edge; 