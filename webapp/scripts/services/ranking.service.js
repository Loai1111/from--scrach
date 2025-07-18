const DonationPotentialMap = {
  "AB+": 1,
  "AB-": 2,
  "A+": 2,
  "B+": 2,
  "O+": 4,
  "A-": 4,
  "B-": 4,
  "O-": 8,
};

const S_match = (patientBloodType, bagBloodType) => {
  return patientBloodType === bagBloodType ? 100 : 50;
};

const S_expiry = (expiryDate) => {
  // If expiryDate is missing or invalid (i.e., not a Firestore Timestamp), return a neutral score of 0.
  if (!expiryDate || typeof expiryDate.toDate !== 'function') {
    return 0;
  }
  const now = new Date();
  const expiry = expiryDate.toDate(); // Convert Firestore Timestamp to JS Date
  const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return 0; // Bag is expired
  // Use 42 days as the standard shelf life for blood bags.
  return 100 * (1 - (daysRemaining / 42));
};

const S_universality = (bagBloodType) => {
  return 100 * ((8 - DonationPotentialMap[bagBloodType]) / 7);
};

const calculateTotalScore = (patient, bag) => {
  const scoreMatch = S_match(patient.bloodType, bag.bloodType);
  const scoreExpiry = S_expiry(bag.expiryDate);
  const scoreUniversality = S_universality(bag.bloodType);

  const totalScore = (0.60 * scoreMatch) + (0.25 * scoreExpiry) + (0.15 * scoreUniversality);
  return totalScore;
};

const rankCompatibleBags = (patient, compatibleBags) => {
  const scoredBags = compatibleBags.map(bag => ({
    ...bag,
    totalScore: calculateTotalScore(patient, bag)
  }));

  scoredBags.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    // Tie-breaking using expiry date (ascending)
    return new Date(a.expiryDate) - new Date(b.expiryDate);
  });

  return scoredBags;
};

export const rankingService = {
  rankCompatibleBags,
};