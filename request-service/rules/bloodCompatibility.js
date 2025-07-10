const compatibilityRules = {
    'O-': ['O-'],
    'O+': ['O+', 'O-'],
    'A-': ['A-', 'O-'],
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-']
};

// This new structure calculates the "opportunity cost". A blood type that can be given
// to many different recipient types is more "valuable" and should be preserved if a more
// specific alternative exists. The number of compatible recipients is the cost.
const recipientCompatibility = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Cost: 8 (Universal Donor)
    'O+': ['O+', 'A+', 'B+', 'AB+'],                         // Cost: 4
    'A-': ['A-', 'A+', 'AB-', 'AB+'],                         // Cost: 4
    'A+': ['A+', 'AB+'],                                     // Cost: 2
    'B-': ['B-', 'B+', 'AB-', 'AB+'],                         // Cost: 4
    'B+': ['B+', 'AB+'],                                     // Cost: 2
    'AB-': ['AB-', 'AB+'],                                   // Cost: 2
    'AB+': ['AB+']                                          // Cost: 1 (Universal Recipient, but as a donor, very specific)
};


function getCompatibleBloodTypes(recipientType) {
    return compatibilityRules[recipientType] || [];
}

/**
 * Calculates the opportunity cost of a donor blood type by returning how many
 * types of recipients it is compatible with. A lower number is better.
 * @param {string} donorType The blood type of the donor bag.
 * @returns {number} The number of patient blood types this bag can be given to.
 */
function getRecipientCompatibilityCount(donorType) {
    return recipientCompatibility[donorType] ? recipientCompatibility[donorType].length : 999; // Return a high number if type is unknown
}

module.exports = {
    getCompatibleBloodTypes,
    getRecipientCompatibilityCount
};