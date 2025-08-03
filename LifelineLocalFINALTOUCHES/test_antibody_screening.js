import { assert } from 'https://cdnjs.cloudflare.com/ajax/libs/chai/5.1.1/chai.min.js';
import * as patientService from './scripts/services/patient.service.js';
import * as labTestService from './scripts/services/labTest.service.js';
import * as bloodMatchService from './scripts/services/blood-match.service.js';

describe('Antibody Screening Feature Tests', () => {

    // Test for Patient Data Model
    describe('Patient Service', () => {
        it('should create a new patient with the correct antibody-related fields', async () => {
            const patientData = {
                fullName: 'John Doe',
                dob: '1990-01-01',
                sex: 'Male',
                bloodGroup: 'A',
                rhFactor: '+',
            };
            const newPatient = await patientService.addPatient(patientData);
            const fetchedPatient = await patientService.getPatientById(newPatient.id);

            assert.isFalse(fetchedPatient.bloodTypeConfirmed, 'bloodTypeConfirmed should be false');
            assert.deepEqual(fetchedPatient.currentAntibodies, [], 'currentAntibodies should be an empty array');
            assert.deepEqual(fetchedPatient.antibodyHistory, [], 'antibodyHistory should be an empty array');
        });
    });

    // Test for Lab Test Data Model
    describe('Lab Test Service', () => {
        it('should create a new antibody screening test with the correct structure', async () => {
            const testData = {
                patientId: 'patient123',
                hospitalId: 'hospital456',
            };
            const newTestId = await labTestService.addAntibodyScreeningTest(testData);
            const fetchedTest = await labTestService.getLabTestById(newTestId);

            assert.equal(fetchedTest.testType, 'ANTIBODY_SCREENING', 'testType should be ANTIBODY_SCREENING');
            assert.equal(fetchedTest.status, 'Pending', 'status should be Pending');
            assert.isNotNull(fetchedTest.result, 'result object should exist');
            assert.deepEqual(fetchedTest.result.antibodiesDetected, [], 'antibodiesDetected should be an empty array');
        });
    });

    // Test for Blood Matching Logic
    describe('Blood Match Service', () => {
        it('should correctly identify incompatible blood due to antibodies', () => {
            const recipient = {
                abo: 'A',
                rh: '+',
                currentAntibodies: ['Anti-K'],
            };
            const donor = {
                abo: 'A',
                rh: '+',
                minorAntigens: ['K'],
            };
            const isCompatible = bloodMatchService.isCompatible(recipient, donor);
            assert.isFalse(isCompatible, 'Blood should be incompatible due to Anti-K');
        });

        it('should correctly identify compatible blood when no conflicting antibodies are present', () => {
            const recipient = {
                abo: 'A',
                rh: '+',
                currentAntibodies: ['Anti-K'],
            };
            const donor = {
                abo: 'A',
                rh: '+',
                minorAntigens: ['Fya'],
            };
            const isCompatible = bloodMatchService.isCompatible(recipient, donor);
            assert.isTrue(isCompatible, 'Blood should be compatible');
        });

        it('should find compatible blood bags based on the new antibody fields', () => {
            const patient = {
                bloodGroup: 'O',
                rhFactor: '+',
                currentAntibodies: ['Anti-Fya'],
            };
            const bloodBags = [
                { donorId: 'donor1', bloodType: 'O+', antigen_profile: ['K'] },
                { donorId: 'donor2', bloodType: 'O+', antigen_profile: ['Fya'] },
                { donorId: 'donor3', bloodType: 'A+', antigen_profile: ['K'] },
            ];
            const compatibleBags = bloodMatchService.findCompatibleBloodBags(patient, bloodBags);
            assert.lengthOf(compatibleBags, 1, 'Should find one compatible bag');
            assert.equal(compatibleBags[0].donorId, 'donor1', 'The compatible bag should be from donor1');
        });
    });
});