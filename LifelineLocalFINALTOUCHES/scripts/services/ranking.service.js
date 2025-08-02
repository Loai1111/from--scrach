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

const S_expiry = (expiryDate, referenceDate = new Date()) => {
  // If expiryDate is missing or invalid, return a low score.
  if (!expiryDate || typeof expiryDate.toDate !== 'function') {
    console.log("S_expiry: Invalid or missing expiryDate. Returning -1.");
    return -1;
  }
  const expiry = expiryDate.toDate();
  const daysRemaining = Math.ceil((expiry - referenceDate) / (1000 * 60 * 60 * 24));
  console.log(`S_expiry: Days remaining for bag: ${daysRemaining}`);

  // If the bag expires before the reference date, it's unsuitable.
  if (daysRemaining < 0) {
    console.log("S_expiry: Bag has expired. Returning -1.");
    return -1;
  }
  
  // Use 42 days as the standard shelf life for blood bags.
  // The score is higher for bags that expire sooner (but after the reference date).
  return 100 * (1 - (daysRemaining / 42));
};

const S_universality = (bagBloodType) => {
  return 100 * ((8 - DonationPotentialMap[bagBloodType]) / 7);
};

const calculateTotalScore = (patient, bag, request) => {
  const referenceDate = request && request.scheduledAt ? request.scheduledAt.toDate() : new Date();
  
  // Defensively access patient's blood type
  const patientBloodType = patient?.bloodType || patient?.antigenProfile?.abo;
  if (!patientBloodType) {
    console.error("Could not determine patient blood type from patient object:", patient);
    return -1; // Or handle as a critical error
  }

  const scoreMatch = S_match(patientBloodType, bag.bloodType);
  const scoreExpiry = S_expiry(bag.expiryDate, referenceDate);
  const scoreUniversality = S_universality(bag.bloodType);

  // If scoreExpiry is -1, the bag is considered invalid for this request.
  if (scoreExpiry < 0) {
    return -1;
  }

  const totalScore = (0.60 * scoreMatch) + (0.25 * scoreExpiry) + (0.15 * scoreUniversality);
  return totalScore;
};

const rankCompatibleBags = (patient, compatibleBags, request) => {
  console.log(`Ranking ${compatibleBags.length} compatible bags...`);
  const scoredBags = compatibleBags
    .map(bag => {
      const score = calculateTotalScore(patient, bag, request);
      console.log(`Bag ${bag.id} received score: ${score}`);
      return {
        ...bag,
        totalScore: score
      };
    })
    .filter(bag => bag.totalScore >= 0); // Remove bags that expired before the reference date.
  
  console.log(`${scoredBags.length} bags remaining after filtering out negative scores.`);

  scoredBags.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    // Tie-breaking: prioritize the bag that expires sooner.
    return a.expiryDate.toDate() - b.expiryDate.toDate();
  });

  return scoredBags;
};

export const rankingService = {
  rankCompatibleBags,
};