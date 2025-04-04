import { BIGINT, MAX_PK, MAX_KEY } from "./constants.js";

// this is to abstract the keys from the node class
// we are using a very simple random key for the simulation
// in a real implementation, we would use a more complex key
// and we would use a more complex distance calculation

// this needs to be updated so that it uses the circular chord space
// distance is only defined on the linear space - not wrapping

export class Keys {
    constructor() {
        this.publicKey = null;
        this.privateKey = null; 
        this.geolocation = null;
        this.maxKey = MAX_KEY;
        this.maxPK = MAX_PK; 
;
    }

    generateKeys() {
        if(BIGINT) {
            // Generate a unique random string
            const randomValue = Math.random().toString() + Date.now().toString();
        
            // Generate privateKey as a SHA-1 hash
            this.privateKey = generateSHA1HashSync(randomValue);
            
            // Generate publicKey as SHA-1 hash of privateKey
            // This creates a relationship between private and public keys
            this.publicKey = generateSHA1HashSync(this.privateKey);
            this.geolocation = Math.floor(Math.random()*this.maxKey); 
        } else {
            this.privateKey = Math.random();
            this.publicKey = Math.random();
            this.geolocation = Math.floor(Math.random()*this.maxKey); 
            // console.log("Keys generated:", this.privateKey, this.publicKey, this.geolocation);
        }
    }

    get ID() {return this.geolocation+this.publicKey;}

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
        return Keys.getDistance(this.ID, otherNode.ID);
    }

    // Get order of another node
    orderTo(otherNode) {
        return Keys.getOrder(this.ID, otherNode.ID);
    }

    // get the locations of the chords for this node
    // count is the number of chords to generate on each side of the node
    // the number of chords is 2*count-1
    // the actual connected chords are determined by the distance to this node
    chordsGlobal(count) {
        let chords = [];
        let c = this.ID+(this.maxKey/2);
        if(c > this.maxKey) c = c-this.maxKey;
        chords.push(c); // furthest away chord location
        for(let i = 1; i < count; i++) {
            const delta = this.maxKey/(2**(i+1));
            c = this.ID+delta;
            if(c > this.maxKey) c = c-this.maxKey;
            chords.push(c);
            c = this.ID-delta;
            if(c < 0) c = c+this.maxKey;
            chords.push(c);
        }
        return chords;
    }

    // get the geo locations of the chords for this node
    // count is the number of chords to generate on each side of the node
    // the number of chords is 2*count-1
    // the actual connected chords are determined by the distance to this node
    chordsLocal(count) {
        let chords = [];
        let c = this.publicKey+(this.maxPK/2);
        if(c > this.maxPK) c = c-this.maxPK;
        chords.push(c+this.geolocation); // furthest away chord location
        for(let i = 1; i < count; i++) {
            const delta = this.maxPK/(2**(i+1));
            c = this.publicKey+delta;
            if(c > this.maxPK) c = c-this.maxPK;
            chords.push(c+this.geolocation);
            c = this.publicKey-delta;
            if(c < 0) c = c+this.maxPK;
            chords.push(c+this.geolocation);
        }
        return chords;
    }
}