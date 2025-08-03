# Antibody Screening and Blood Type Confirmation Architecture

This document outlines the proposed architecture for integrating patient antibody screening, blood type confirmation, and historical antibody data into the blood allocation system.

## 1. Data Model Changes

### 1.1. Patient Collection (`patients`)

The existing `patient` model will be updated to better support antibody data and blood type confirmation.

**Proposed `patient` document structure:**

```json
{
  "fullName": "String",
  "dob": "Timestamp",
  "sex": "String",
  "bloodGroup": "String", // (A, B, AB, O)
  "rhFactor": "String", // (+, -)
  "bloodType": "String", // (e.g., A+, O-)
  "bloodTypeConfirmed": "Boolean", // New field
  "currentAntibodies": ["String"], // New field for active antibodies
  "antibodyHistory": [ // Modified field
    {
      "antibody": "String", // e.g., "Anti-K"
      "dateDetected": "Timestamp",
      "testId": "String" // Reference to the lab test
    }
  ],
  "lastBloodTest": "Timestamp",
  "createdAt": "Timestamp"
}
```

**Changes:**

*   **`bloodTypeConfirmed` (Boolean):** A new field to indicate if the patient's blood type has been confirmed by a lab test. This will be `false` by default and updated to `true` after a confirmation test.
*   **`currentAntibodies` (Array of Strings):** A new field to store currently identified antibodies that are clinically significant for transfusions.
*   **`antibodyHistory` (Array of Objects):** The existing `antibody_history` field will be changed to `antibodyHistory` and its structure will be an array of objects to store more detailed historical data for each antibody, including the date of detection and a reference to the lab test that identified it.

### 1.2. Lab Test Collection (`labTests`)

A new type of lab test will be introduced for patient antibody screening and blood type confirmation.

**Proposed `labTest` document structure for Antibody Screening:**

```json
{
  "testType": "String", // "ANTIBODY_SCREENING"
  "patientId": "String", // Reference to the patient
  "hospitalId": "String",
  "status": "String", // (Pending, Completed, Failed)
  "result": {
    "bloodGroup": "String",
    "rhFactor": "String",
    "antibodiesDetected": ["String"] // e.g., ["Anti-K", "Anti-Fya"]
  },
  "createdAt": "Timestamp"
}
```

**Changes:**

*   A new `testType` of `"ANTIBODY_SCREENING"` will be used to differentiate these tests.
*   The document will reference a `patientId` instead of a `donorId`.
*   The `result` object will contain the confirmed blood type and a list of any detected antibodies.

## 2. Blood Bank UI/UX

### 2.1. Patient Details View

The patient details view in the blood bank portal will be updated to display the new antibody and blood type information.

**Mockup of the updated Patient Details Panel:**

```
<!-- Inside the details panel for a patient -->
<div class="p-4 border-b">
    <h3 class="font-bold text-lg">Jane Doe</h3>
    <p class="text-sm text-gray-500">Patient ID: pat_12345</p>
</div>
<div class="p-4">
    <div class="flex justify-between items-center mb-4">
        <h4 class="font-semibold">Blood Type: A+</h4>
        <span id="blood-type-status" class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Confirmed
        </span>
    </div>
    <div>
        <h4 class="font-semibold mb-2">Current Antibodies</h4>
        <div id="current-antibodies-list" class="flex flex-wrap gap-2">
            <span class="bg-red-100 text-red-800 px-2 py-1 rounded">Anti-K</span>
        </div>
    </div>
    <div class="mt-4">
        <h4 class="font-semibold mb-2">Antibody History</h4>
        <ul id="antibody-history-list" class="space-y-2">
            <li class="text-sm">
                <strong>Anti-K</strong> - Detected on 2024-08-15
            </li>
            <li class="text-sm">
                <strong>Anti-Fya</strong> - Detected on 2023-05-20
            </li>
        </ul>
    </div>
</div>
```

### 2.2. Lab Test Management

A new tab or section will be added to the "Tests" page for managing patient antibody screening tests. This will allow blood bank staff to:

*   Request a new antibody screening test for a patient.
*   View the results of completed tests.
*   Update a patient's blood type confirmation status based on test results.

## 3. Allocation Logic

The blood allocation algorithm will be modified to incorporate the new antibody data for more precise matching.

### 3.1. `isCompatible` Function

The `isCompatible` function in `blood-match.service.js` will be updated to use the `currentAntibodies` field from the patient's record.

**Proposed changes to `isCompatible`:**

```javascript
export function isCompatible(recipient, donor) {
    // ... existing ABO/Rh checks

    // Alloantibody compatibility using currentAntibodies
    if (recipient.currentAntibodies && recipient.currentAntibodies.length > 0) {
        if (!donor.minorAntigens || donor.minorAntigens.length === 0) {
            return false; // Cannot confirm compatibility if donor antigens are unknown
        }
        const hasIncompatibleAntigen = recipient.currentAntibodies.some(antibody => {
            const antigenSymbol = antibody.replace('Anti-', '').toUpperCase();
            return donor.minorAntigens.some(minorAntigen => minorAntigen.toUpperCase() === antigenSymbol);
        });
        if (hasIncompatibleAntigen) {
            return false;
        }
    }

    // ... existing CMV and Sickle Cell checks

    return true;
}
```

### 3.2. `findCompatibleBloodBags` Function

The `findCompatibleBloodBags` function will be updated to pass the `currentAntibodies` to the `isCompatible` function.

**Proposed changes to `findCompatibleBloodBags`:**

```javascript
export function findCompatibleBloodBags(patient, bloodBags, specialRequirements = []) {
    const recipientProfile = {
        abo: patient.bloodGroup,
        rh: patient.rhFactor,
        currentAntibodies: patient.currentAntibodies || [], // Use currentAntibodies
        requiresCmvNegative: specialRequirements.includes('CMV Negative'),
        requiresSickleCellNegative: specialRequirements.includes('Sickle Cell Negative'),
    };

    return bloodBags.filter(bag => {
        // ... existing donor profile creation
        const donorProfile = {
            // ...
        };
        return isCompatible(recipientProfile, donorProfile);
    });
}
```

## 4. Workflow Diagram

Here is a Mermaid diagram illustrating the proposed workflow for antibody screening and its impact on blood allocation.

```mermaid
graph TD
    A[Patient Admitted] --> B{Blood Type Confirmed?};
    B -- No --> C[Request Blood Type Confirmation Test];
    C --> D[Perform Lab Test];
    D --> E{Antibodies Detected?};
    B -- Yes --> F[Check for Previous Antibody History];
    F --> G{Antibodies in History?};
    G -- Yes --> H[Request Antibody Screening Test];
    G -- No --> I[Proceed with Standard Crossmatch];
    H --> D;
    E -- Yes --> J[Update Patient Record with Current Antibodies];
    E -- No --> K[Update Patient Record - No Antibodies Detected];
    J --> L[Allocation Algorithm Considers Antibodies];
    K --> I;
    L --> M[Find Compatible Blood];
    I --> M;