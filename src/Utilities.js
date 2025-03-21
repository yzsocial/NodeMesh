// Utility functions for the application

// SHA-1 utility functions
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

// Array size capping utility
function capArraySize(array, maxSize, sortFn = null) {
    if (array.length <= maxSize) return array; // No need to cap if under limit
    
    // Sort the array if a sort function is provided
    if (sortFn) {
        array.sort(sortFn);
    }
    
    // Return only the last maxSize elements (newest elements)
    return array.slice(-maxSize);
}

export { generateSHA1Hash, generateSHA1HashSync, capArraySize }; 