/**
 * Comprehensive Test Suite for CMV and Sickle Cell Filters
 * 
 * This test suite includes:
 * 1. Basic CMV and Sickle Cell filter compatibility tests
 * 2. Patient antibody screening and verification tests
 * 3. Blood type confirmation from hospital data tests
 * 4. Historical antibody data integration tests
 * 5. Full allocation optimization testing
 * 6. Edge cases including unknown status, case sensitivity, and missing data
 */

import { testCmvNegativeFilter, testSickleCellNegativeFilter, isCompatible, findCompatibleBloodBags } from './scripts/services/blood-match.service.js';

console.log("=== Comprehensive Blood Compatibility Filter Testing ===\n");

// Test Data for various scenarios
const TEST_DATA = {
    // Sample patients with different antibody profiles
    patients: {
        basic: {
            id: 'patient1',
            fullName: 'John Doe',
            bloodGroup: 'A',
            rhFactor: '+',
            antibody_history: [],
            requiresCmvNegative: false,
            requiresSickleCellNegative: false
        },
        withAntibodies: {
            id: 'patient2',
            fullName: 'Jane Smith',
            bloodGroup: 'B',
            rhFactor: '-',
            antibody_history: ['Anti-K', 'Anti-Fya'],
            requiresCmvNegative: true,
            requiresSickleCellNegative: false
        },
        withComplexAntibodies: {
            id: 'patient3',
            fullName: 'Robert Johnson',
            bloodGroup: 'O',
            rhFactor: '-',
            antibody_history: ['Anti-D', 'Anti-C', 'Anti-E', 'Anti-K', 'Anti-Fya', 'Anti-Jka'],
            requiresCmvNegative: true,
            requiresSickleCellNegative: true
        },
        withUnknownBloodType: {
            id: 'patient4',
            fullName: 'Unknown Patient',
            bloodGroup: 'Unknown',
            rhFactor: '-',
            antibody_history: [],
            requiresCmvNegative: false,
            requiresSickleCellNegative: false
        },
        withHistoricalAntibodies: {
            id: 'patient5',
            fullName: 'Historical Patient',
            bloodGroup: 'AB',
            rhFactor: '+',
            antibody_history: ['Anti-K'], // Current antibodies
            historicalAntibodies: ['Anti-Fya', 'Anti-Jkb'], // Past antibodies
            requiresCmvNegative: true,
            requiresSickleCellNegative: false
        }
    },

    // Sample blood bags with different characteristics
    bloodBags: [
        {
            id: 'bag1',
            donorId: 'donor1',
            bloodType: 'A+',
            status: 'Available',
            antigen_profile: ['D', 'C', 'e'],
            cmvStatus: 'Negative',
            sickleCellStatus: 'Negative'
        },
        {
            id: 'bag2',
            donorId: 'donor2',
            bloodType: 'B-',
            status: 'Available',
            antigen_profile: ['D', 'C', 'E', 'K'],
            cmvStatus: 'Positive',
            sickleCellStatus: 'Negative'
        },
        {
            id: 'bag3',
            donorId: 'donor3',
            bloodType: 'O-',
            status: 'Available',
            antigen_profile: [],
            cmvStatus: 'Negative',
            sickleCellStatus: 'Negative'
        },
        {
            id: 'bag4',
            donorId: 'donor4',
            bloodType: 'A+',
            status: 'Available',
            antigen_profile: ['D', 'C', 'e', 'K', 'Fya'],
            cmvStatus: 'Negative',
            sickleCellStatus: 'Positive'
        },
        {
            id: 'bag5',
            donorId: 'donor5',
            bloodType: 'AB+',
            status: 'Available',
            antigen_profile: ['D', 'C', 'E', 'K', 'Fya', 'Jka'],
            cmvStatus: 'Unknown',
            sickleCellStatus: 'Unknown'
        },
        {
            id: 'bag6',
            donorId: 'donor6',
            bloodType: 'O-',
            status: 'Available',
            antigen_profile: ['D', 'C', 'e'],
            cmvStatus: 'Negative',
            sickleCellStatus: 'Negative'
        }
    ],

    // Special requirements
    specialRequirements: [
        'CMV Negative',
        'Sickle Cell Negative',
        'CMV Negative, Sickle Cell Negative'
    ]
};

/**
 * Test Suite 1: Basic CMV and Sickle Cell Filter Tests
 * These are the original tests that were already implemented
 */
function runBasicFilterTests() {
    console.log("\n=== 1. Basic CMV and Sickle Cell Filter Tests ===\n");

    // Test CMV Negative Filter
    console.log("1.1. Testing CMV Negative Filter:");
    const cmvResults = testCmvNegativeFilter();
    console.log(`CMV Filter Test Summary: ${cmvResults.passed} passed, ${cmvResults.failed} failed\n`);

    // Test Sickle Cell Negative Filter
    console.log("1.2. Testing Sickle Cell Negative Filter:");
    const sickleCellResults = testSickleCellNegativeFilter();
    console.log(`Sickle Cell Filter Test Summary: ${sickleCellResults.passed} passed, ${sickleCellResults.failed} failed\n`);

    return {
        cmv: cmvResults,
        sickleCell: sickleCellResults
    };
}

/**
 * Test Suite 2: Patient Antibody Screening and Verification Tests
 * Tests how the filters work with patients who have various antibody profiles
 */
function testPatientAntibodyScreening() {
    console.log("\n=== 2. Patient Antibody Screening and Verification Tests ===\n");

    const testCases = [
        {
            name: "Patient with no antibodies",
            patient: TEST_DATA.patients.basic,
            bloodBag: TEST_DATA.bloodBags[0], // A+ with D, C, e antigens
            expected: true
        },
        {
            name: "Patient with Anti-K antibody, donor has K antigen",
            patient: TEST_DATA.patients.withAntibodies, // Has Anti-K
            bloodBag: TEST_DATA.bloodBags[1], // B- with K antigen
            expected: false
        },
        {
            name: "Patient with Anti-K antibody, donor without K antigen",
            patient: TEST_DATA.patients.withAntibodies, // Has Anti-K
            bloodBag: TEST_DATA.bloodBags[0], // A+ without K antigen
            expected: true
        },
        {
            name: "Patient with multiple antibodies, donor has all matching antigens",
            patient: TEST_DATA.patients.withComplexAntibodies, // Has Anti-D, Anti-C, Anti-E, Anti-K, Anti-Fya, Anti-Jka
            bloodBag: TEST_DATA.bloodBags[4], // AB+ with all those antigens
            expected: false
        },
        {
            name: "Patient with multiple antibodies, donor has no matching antigens",
            patient: TEST_DATA.patients.withComplexAntibodies, // Has Anti-D, Anti-C, Anti-E, Anti-K, Anti-Fya, Anti-Jka
            bloodBag: TEST_DATA.bloodBags[2], // O- with no antigens
            expected: true
        },
        {
            name: "Patient with Anti-Fya antibody, donor has Fya antigen",
            patient: TEST_DATA.patients.withAntibodies, // Has Anti-Fya
            bloodBag: TEST_DATA.bloodBags[3], // A+ with Fya antigen
            expected: false
        },
        {
            name: "Patient with antibodies but donor antigen data missing",
            patient: TEST_DATA.patients.withAntibodies,
            bloodBag: { ...TEST_DATA.bloodBags[0], antigen_profile: undefined },
            expected: false
        }
    ];

    const results = {
        passed: 0,
        failed: 0,
        details: []
    };

    testCases.forEach(testCase => {
        try {
            const recipientProfile = {
                abo: testCase.patient.bloodGroup,
                rh: testCase.patient.rhFactor,
                unexpectedAntibodies: testCase.patient.antibody_history,
                requiresCmvNegative: testCase.patient.requiresCmvNegative,
                requiresSickleCellNegative: testCase.patient.requiresSickleCellNegative
            };

            const donorProfile = {
                abo: testCase.bloodBag.bloodType.slice(0, -1),
                rh: testCase.bloodBag.bloodType.slice(-1),
                minorAntigens: testCase.bloodBag.antigen_profile || [],
                cmvStatus: testCase.bloodBag.cmvStatus || 'Unknown',
                sickleCellStatus: testCase.bloodBag.sickleCellStatus || 'Unknown'
            };

            const actual = isCompatible(recipientProfile, donorProfile);
            const passed = actual === testCase.expected;

            if (passed) {
                results.passed++;
                console.log(`✓ PASS: ${testCase.name}`);
            } else {
                results.failed++;
                console.error(`✗ FAIL: ${testCase.name} - Expected ${testCase.expected}, got ${actual}`);
            }

            results.details.push({
                name: testCase.name,
                passed: passed,
                expected: testCase.expected,
                actual: actual
            });
        } catch (error) {
            results.failed++;
            console.error(`✗ ERROR: ${testCase.name} - ${error.message}`);
            results.details.push({
                name: testCase.name,
                passed: false,
                error: error.message
            });
        }
    });

    console.log(`\nPatient Antibody Screening Test Results:`);
    console.log(`Passed: ${results.passed}/${testCases.length}`);
    console.log(`Failed: ${results.failed}/${testCases.length}`);

    return results;
}

/**
 * Test Suite 3: Blood Type Confirmation from Hospital Data Tests
 * Tests scenarios where blood type data comes from hospital records
 */
function testBloodTypeConfirmation() {
    console.log("\n=== 3. Blood Type Confirmation from Hospital Data Tests ===\n");

    const testCases = [
        {
            name: "Standard blood type confirmation (A+)",
            patient: { ...TEST_DATA.patients.basic, bloodGroup: 'A', rhFactor: '+' },
            bloodBag: TEST_DATA.bloodBags[0], // A+
            expected: true
        },
        {
            name: "Standard blood type confirmation (B-)",
            patient: { ...TEST_DATA.patients.basic, bloodGroup: 'B', rhFactor: '-' },
            bloodBag: TEST_DATA.bloodBags[1], // B-
            expected: true
        },
        {
            name: "Standard blood type confirmation (O-)",
            patient: { ...TEST_DATA.patients.basic, bloodGroup: 'O', rhFactor: '-' },
            bloodBag: TEST_DATA.bloodBags[2], // O-
            expected: true
        },
        {
            name: "ABO incompatibility (A patient, B blood)",
            patient: { ...TEST_DATA.patients.basic, bloodGroup: 'A', rhFactor: '+' },
            bloodBag: TEST_DATA.bloodBags[1], // B-
            expected: false
        },
        {
            name: "Rh incompatibility (Rh- patient, Rh+ blood)",
            patient: { ...TEST_DATA.patients.basic, bloodGroup: 'A', rhFactor: '-' },
            bloodBag: TEST_DATA.bloodBags[0], // A+
            expected: false
        },
        {
            name: "Unknown blood type patient",
            patient: TEST_DATA.patients.withUnknownBloodType, // Unknown blood type
            bloodBag: TEST_DATA.bloodBags[2], // O-
            expected: true
        },
        {
            name: "Unknown blood type patient with non-O- blood",
            patient: TEST_DATA.patients.withUnknownBloodType, // Unknown blood type
            bloodBag: TEST_DATA.bloodBags[0], // A+
            expected: false
        },
        {
            name: "Case sensitivity test for blood type (lowercase)",
            patient: { ...TEST_DATA.patients.basic, bloodGroup: 'a', rhFactor: '+' },
            bloodBag: TEST_DATA.bloodBags[0], // A+
            expected: false // Should fail as 'a' is not a valid blood type
        }
    ];

    const results = {
        passed: 0,
        failed: 0,
        details: []
    };

    testCases.forEach(testCase => {
        try {
            const recipientProfile = {
                abo: testCase.patient.bloodGroup,
                rh: testCase.patient.rhFactor,
                unexpectedAntibodies: testCase.patient.antibody_history || [],
                requiresCmvNegative: testCase.patient.requiresCmvNegative || false,
                requiresSickleCellNegative: testCase.patient.requiresSickleCellNegative || false
            };

            const donorProfile = {
                abo: testCase.bloodBag.bloodType.slice(0, -1),
                rh: testCase.bloodBag.bloodType.slice(-1),
                minorAntigens: testCase.bloodBag.antigen_profile || [],
                cmvStatus: testCase.bloodBag.cmvStatus || 'Unknown',
                sickleCellStatus: testCase.bloodBag.sickleCellStatus || 'Unknown'
            };

            const actual = isCompatible(recipientProfile, donorProfile);
            const passed = actual === testCase.expected;

            if (passed) {
                results.passed++;
                console.log(`✓ PASS: ${testCase.name}`);
            } else {
                results.failed++;
                console.error(`✗ FAIL: ${testCase.name} - Expected ${testCase.expected}, got ${actual}`);
            }

            results.details.push({
                name: testCase.name,
                passed: passed,
                expected: testCase.expected,
                actual: actual
            });
        } catch (error) {
            results.failed++;
            console.error(`✗ ERROR: ${testCase.name} - ${error.message}`);
            results.details.push({
                name: testCase.name,
                passed: false,
                error: error.message
            });
        }
    });

