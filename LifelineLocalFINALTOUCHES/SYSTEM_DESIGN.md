# System Design: Blood Transfusion Matching

This document outlines the data structures for patients and blood bags in the blood transfusion matching system.

## Patient Data Structure

The patient data structure stores the individual's blood antigen profile and antibody history.

**Example:**
```json
{
  "antigenProfile": {
    "abo": "A",
    "rh": "+"
  },
  "antibodyHistory": {
    "expectedAntibodies": ["Anti-B"],
    "unexpectedAntibodies": ["Anti-K"]
  }
}
```

### Fields

-   **antigenProfile**:
    -   `abo` (String): The patient's ABO blood group. Can be "A", "B", "AB", or "O".
    -   `rh` (String): The patient's Rh factor. Can be "+" or "-".
-   **antibodyHistory**:
    -   `expectedAntibodies` (Array of Strings): Antibodies that are expected to be present based on the ABO blood group. For example, a patient with type 'A' blood is expected to have 'Anti-B' antibodies.
    -   `unexpectedAntibodies` (Array of Strings): Alloantibodies detected through an antibody screen. These are antibodies against red blood cell antigens that the patient lacks. Examples include "Anti-K", "Anti-Fya", etc.

## Blood Bag Data Structure

The blood bag data structure contains the antigen profile of the donated blood.

**Example:**
```json
{
  "antigenProfile": {
    "abo": "A",
    "rh": "+",
    "minorAntigens": ["K", "Fya"]
  }
}
```

### Fields

-   **antigenProfile**:
    -   `abo` (String): The blood bag's ABO blood group. Can be "A", "B", "AB", or "O".
    -   `rh` (String): The blood bag's Rh factor. Can be "+" or "-".
    -   `minorAntigens` (Array of Strings): A list of clinically significant minor antigens present on the red blood cells in the bag. Examples include "K", "Fya", "Jka".
