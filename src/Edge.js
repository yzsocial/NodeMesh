// Edge Class - for managing connections between nodes
class Edge {
    constructor(node) {
        // Basic identification
        this.publicKey = node.publicKey;
        this.geolocation = node.geolocation;
        this.sponsor = node.sponsor;
        // Handle both Node instances and temporary node-like objects
        if (node.address) {
            // If it's a Edge object or has an address property
            this.address = node.address;
        } else {
            // If it's a Node instance or a temporary node-like object
            this.address = node;
        }
        
        this.lastAccessed = new Date();
        this.hopCount = 0;
    }

    get ID() { return this.geolocation+this.publicKey; }
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