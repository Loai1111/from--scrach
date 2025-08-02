# Architectural Updates for Request Prioritization System

This document outlines the architectural changes required to implement a request prioritization system based on three levels: `EMERGENCY`, `URGENT`, and `ROUTINE`.

## 1. Data Model Enhancement

To support the new prioritization system, the `requests` data model will be enhanced with a new `priorityLevel` field.

### `requests` Collection

| Field           | Type   | Description                                                 |
| --------------- | ------ | ----------------------------------------------------------- |
| `priorityLevel` | Number | A numeric representation of the request's urgency, used for efficient sorting and querying. |
| `urgency`       | String | The existing descriptive field for the request's urgency (e.g., `EMERGENCY`, `URGENT`, `ROUTINE`). |

The `priorityLevel` will be mapped from the `urgency` field as follows:

*   `EMERGENCY`: 1
*   `URGENT`: 2
*   `ROUTINE`: 3

The `createRequest` function in `scripts/services/request.service.js` will be updated to set the `priorityLevel` automatically when a new request is created.

## 2. Queuing Logic

The queuing logic will be updated to ensure that requests are processed in the correct order of priority.

### `getRequests` Function

The `getRequests` function in `scripts/services/request.service.js` will be modified to use Firestore's `orderBy` clause to sort requests by `priorityLevel` and then by `createdAt`.

```javascript
import { query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
// ...
const q = query(requestsCollection, orderBy("priorityLevel"), orderBy("createdAt"));
```

This will ensure that:

1.  `EMERGENCY` requests are always processed before `URGENT` and `ROUTINE` requests.
2.  `URGENT` requests are always processed before `ROUTINE` requests.
3.  Requests with the same priority level are processed in a first-in, first-out (FIFO) order.

## 3. Notification System

A notification system will be implemented to alert lab technicians of high-priority requests.

### `createRequest` Function

The `createRequest` function in `scripts/services/request.service.js` will be updated to trigger a notification whenever a request with a `priorityLevel` of `1` (EMERGENCY) or `2` (URGENT) is created.

The notification logic will be as follows:

1.  **Trigger:** A notification is sent immediately after a new request is created.
2.  **Condition:** The `priorityLevel` of the new request is `1` or `2`.
3.  **Action:** The `createNotification` function is called.
4.  **Message:** The notification message will include the urgency level and request ID (e.g., "New EMERGENCY request #12345 received").
5.  **Recipient:** The notification is sent to the 'bloodbank' user group.

## 4. Workflow Diagram

The following Mermaid diagram illustrates the new request prioritization workflow:

```mermaid
graph TD
    A[Hospital Creates Request] --> B{Set Priority};
    B --> |EMERGENCY| C[Priority 1];
    B --> |URGENT| D[Priority 2];
    B --> |ROUTINE| E[Priority 3];
    C --> F{Send Notification};
    D --> F;
    F --> G[Lab Tech Views Queue];
    E --> G;
    G --> H[Process Requests by Priority];