# Bug Reports

This document contains a list of all functional and non-functional issues identified during the systematic testing of the mobile application.

---

### Bug Report: Hardcoded API Endpoint in Registration

**Severity:** High

**Steps to Reproduce:**
1. Open the `RegisterPage.dart` file.
2. Observe the `onPressed` callback of the `ElevatedButton` on line 171.
3. The API endpoint for registration is hardcoded as `http://10.0.2.2:3003/register`.

**Expected Behavior:**
API endpoints should be managed through a centralized configuration solution to allow for easy switching between different environments.

**Actual Behavior:**
The API endpoint is hardcoded, making it difficult to maintain and update.

---

### Bug Report: Direct API Call from UI in Registration

**Severity:** High

**Steps to Reproduce:**
1. Open the `RegisterPage.dart` file.
2. Observe the `onPressed` callback of the `ElevatedButton` on line 171.
3. The registration logic, including the HTTP POST request, is handled directly in the UI code.

**Expected Behavior:**
API calls should be abstracted away from the UI into a separate data layer (e.g., a repository) to improve separation of concerns, testability, and maintainability.

**Actual Behavior:**
The UI is tightly coupled with the API, making the code difficult to test and maintain.

---

### Bug Report: Poor Error Handling in Registration

**Severity:** Medium

**Steps to Reproduce:**
1. Attempt to register with invalid data (e.g., an email that is already in use).
2. Observe the error message.

**Expected Behavior:**
The application should display a specific and helpful error message to the user, indicating the reason for the registration failure.

**Actual Behavior:**
The application displays a generic "Registration failed" message, which is not helpful for the user or for debugging.

---

### Bug Report: Insecure Password Handling in Registration

**Severity:** Critical

**Steps to Reproduce:**
1. Register a new user.
2. Intercept the network traffic between the application and the backend.
3. Observe that the password is sent in plain text.

**Expected Behavior:**
Passwords should always be hashed before being sent to the server.

**Actual Behavior:**
The password is sent in plain text, which is a major security vulnerability.

---

### Bug Report: Restrictive Email Validation

**Severity:** Medium

**Steps to Reproduce:**
1. Attempt to register with an email address that does not end in `@gmail.com`.
2. Observe the validation error.

**Expected Behavior:**
The email validation should allow for any valid email address format.

**Actual Behavior:**
The email validation is too restrictive and only allows for `@gmail.com` addresses.

---

### Bug Report: Hardcoded API Endpoint in Login

**Severity:** High

**Steps to Reproduce:**
1. Open the `home.dart` file.
2. Observe the `onPressed` callback of the `ElevatedButton` on line 91.
3. The API endpoint for login is hardcoded as `http://10.0.2.2:3003/login`.

**Expected Behavior:**
API endpoints should be managed through a centralized configuration solution to allow for easy switching between different environments.

**Actual Behavior:**
The API endpoint is hardcoded, making it difficult to maintain and update.

---

### Bug Report: Direct API Call from UI in Login

**Severity:** High

**Steps to Reproduce:**
1. Open the `home.dart` file.
2. Observe the `onPressed` callback of the `ElevatedButton` on line 91.
3. The login logic, including the HTTP POST request, is handled directly in the UI code.

**Expected Behavior:**
API calls should be abstracted away from the UI into a separate data layer (e.g., a repository) to improve separation of concerns, testability, and maintainability.

**Actual Behavior:**
The UI is tightly coupled with the API, making the code difficult to test and maintain.

---

### Bug Report: Poor Error Handling in Login

**Severity:** Medium

**Steps to Reproduce:**
1. Attempt to log in with invalid credentials.
2. Observe the error message.

**Expected Behavior:**
The application should display a specific and helpful error message to the user, indicating the reason for the login failure.

**Actual Behavior:**
The application displays a generic "Invalid credentials" message, which is not helpful for the user or for debugging.

---

### Bug Report: Insecure Password Handling in Login

**Severity:** Critical

**Steps to Reproduce:**
1. Log in with a valid user.
2. Intercept the network traffic between the application and the backend.
3. Observe that the password is sent in plain text.

**Expected Behavior:**
Passwords should always be hashed before being sent to the server.

**Actual Behavior:**
The password is sent in plain text, which is a major security vulnerability.

---

### Bug Report: Hardcoded API Endpoint in Blood Inventory

**Severity:** High

**Steps to Reproduce:**
1. Open the `BloodInventory.dart` file.
2. Observe the `fetchBloodBags` function on line 14.
3. The API endpoint for fetching blood bags is hardcoded as `http://10.0.2.2:3003/bloodbags`.

**Expected Behavior:**
API endpoints should be managed through a centralized configuration solution to allow for easy switching between different environments.

**Actual Behavior:**
The API endpoint is hardcoded, making it difficult to maintain and update.

---

### Bug Report: Direct API Call from UI in Blood Inventory

**Severity:** High

**Steps to Reproduce:**
1. Open the `BloodInventory.dart` file.
2. Observe the `FutureBuilder` on line 34.
3. The `fetchBloodBags` function, which makes a direct API call, is called from the UI.

**Expected Behavior:**
API calls should be abstracted away from the UI into a separate data layer (e.g., a repository) to improve separation of concerns, testability, and maintainability.

**Actual Behavior:**
The UI is tightly coupled with the API, making the code difficult to test and maintain.

---

### Bug Report: Inefficient Data Fetching in Blood Inventory

**Severity:** High

**Steps to Reproduce:**
1. Navigate to the Blood Inventory screen.
2. Navigate away from the screen and then back to it.
3. Observe that a new API call is made each time the screen is loaded.

**Expected Behavior:**
Data should be fetched once and then cached. The UI should be updated from the cache, and a mechanism should be in place to refresh the data when needed.

**Actual Behavior:**
The use of `FutureBuilder` causes the data to be fetched every time the widget is built, leading to unnecessary API calls and a poor user experience.

---

### Bug Report: Poor Error Handling in Blood Inventory

**Severity:** Medium

**Steps to Reproduce:**
1. Disconnect from the network.
2. Navigate to the Blood Inventory screen.
3. Observe the error message.

**Expected Behavior:**
The application should display a user-friendly error message and provide an option to retry the request.

**Actual Behavior:**
The application displays a generic error message that is not helpful to the user.

---

### Bug Report: Hardcoded Donor Name on Dashboard

**Severity:** Medium

**Steps to Reproduce:**
1. Log in to the application.
2. Observe the welcome message on the dashboard.

**Expected Behavior:**
The dashboard should display the name of the logged-in user.

**Actual Behavior:**
The dashboard displays a hardcoded name ("Mohammed").

---

### Bug Report: Profile and Logout Functionality Commented Out

**Severity:** High

**Steps to Reproduce:**
1. Log in to the application.
2. Attempt to access the user profile or log out.

**Expected Behavior:**
Users should be able to access their profile and log out of the application.

**Actual Behavior:**
The profile and logout functionality is commented out in the `dashboard.dart` file, making it inaccessible to users.

---

### Bug Report: Hardcoded API Endpoints in Eligibility Test

**Severity:** High

**Steps to Reproduce:**
1. Open the `eligibility.dart` file.
2. Observe the `fetchQuestions` and `submitAnswers` functions.
3. The API endpoints for the eligibility test are hardcoded.

**Expected Behavior:**
API endpoints should be managed through a centralized configuration solution.

**Actual Behavior:**
The API endpoints are hardcoded, making the application difficult to maintain.

---

### Bug Report: Direct API Calls from UI in Eligibility Test

**Severity:** High

**Steps to Reproduce:**
1. Open the `eligibility.dart` file.
2. Observe that the `fetchQuestions` and `submitAnswers` functions are called directly from the UI.

**Expected Behavior:**
API calls should be abstracted away from the UI into a separate data layer.

**Actual Behavior:**
The UI is tightly coupled with the API.

---

### Bug Report: Inefficient Data Fetching in Eligibility Test

**Severity:** High

**Steps to Reproduce:**
1. Navigate to the Eligibility Test screen.
2. Navigate away and back to the screen.
3. Observe that the questions are fetched from the API every time the screen is loaded.

**Expected Behavior:**
The questions should be fetched once and cached.

**Actual Behavior:**
The use of `FutureBuilder` leads to inefficient data fetching.

---

### Bug Report: Poor Error Handling in Eligibility Test

**Severity:** Medium

**Steps to Reproduce:**
1. Disconnect from the network.
2. Navigate to the Eligibility Test screen.
3. Observe the error message.

**Expected Behavior:**
The application should display a user-friendly error message.

**Actual Behavior:**
The application displays a generic error message.

---

### Bug Report: Hardcoded API Endpoint in Donation History

**Severity:** High

**Steps to Reproduce:**
1. Open the `DonateHistory.dart` file.
2. Observe the `fetchDonations` function on line 38.
3. The API endpoint for fetching donation history is hardcoded as `https://your-backend-api.com/donations`.

**Expected Behavior:**
API endpoints should be managed through a centralized configuration solution.

**Actual Behavior:**
The API endpoint is hardcoded and is a placeholder, making the feature non-functional.

---

### Bug Report: Direct API Call from UI in Donation History

**Severity:** High

**Steps to Reproduce:**
1. Open the `DonateHistory.dart` file.
2. Observe that the `fetchDonations` function is called directly from the `FutureBuilder` in the UI.

**Expected Behavior:**
API calls should be abstracted away from the UI into a separate data layer.

**Actual Behavior:**
The UI is tightly coupled with the API.

---

### Bug Report: Inefficient Data Fetching in Donation History

**Severity:** High

**Steps to Reproduce:**
1. Navigate to the Donation History screen.
2. Navigate away and back to the screen.
3. Observe that the donation history is fetched from the API every time the screen is loaded.

**Expected Behavior:**
The donation history should be fetched once and cached.

**Actual Behavior:**
The use of `FutureBuilder` leads to inefficient data fetching.

---

### Bug Report: Poor Error Handling in Donation History

**Severity:** Medium

**Steps to Reproduce:**
1. Disconnect from the network.
2. Navigate to the Donation History screen.
3. Observe the error message.

**Expected Behavior:**
The application should display a user-friendly error message.

**Actual Behavior:**
The application displays a generic error message.

---

### Bug Report: Lack of Offline Support

**Severity:** High

**Steps to Reproduce:**
1. Disconnect the device from the internet.
2. Open the application.
3. Attempt to use any of the features.

**Expected Behavior:**
The application should provide some level of offline functionality, such as displaying previously loaded data or allowing the user to queue actions to be performed when the connection is restored.

**Actual Behavior:**
The application is completely non-functional without an internet connection.

---

### Bug Report: Lack of Push Notifications

**Severity:** Medium

**Steps to Reproduce:**
1. Review the application's codebase.
2. Observe that there is no implementation of push notifications.

**Expected Behavior:**
The application should use push notifications to alert users about important events, such as when their blood is needed or when they are eligible to donate again.

**Actual Behavior:**
The application does not have push notification capabilities.

---

### Bug Report: Inconsistent UI Styling

**Severity:** Low

**Steps to Reproduce:**
1. Navigate through the different screens of the application.
2. Observe the styling of the UI elements, such as buttons and input fields.

**Expected Behavior:**
The UI styling should be consistent throughout the application, following a clear design system.

**Actual Behavior:**
The UI styling is inconsistent, with different styles being used for similar elements on different screens.

---

### Bug Report: Lack of User Feedback

**Severity:** Low

**Steps to Reproduce:**
1. Submit the eligibility questionnaire.
2. Observe that there is no loading indicator to show that the answers are being submitted.

**Expected Behavior:**
The application should provide clear feedback to the user when performing actions, such as showing a loading indicator when data is being submitted.

**Actual Behavior:**
The application lacks user feedback in several places, which can make the user experience confusing.

---

### Bug Report: Unengaging Empty States

**Severity:** Low

**Steps to Reproduce:**
1. View the donation history screen when there is no donation history.
2. Observe the empty state.

**Expected Behavior:**
Empty states should be engaging and provide clear instructions to the user on what to do next.

**Actual Behavior:**
The empty states in the application are basic and unengaging.

---

### Bug Report: Poor Application Performance

**Severity:** High

**Steps to Reproduce:**
1. Use the application and navigate between different screens.
2. Observe the application's performance.

**Expected Behavior:**
The application should be fast and responsive.

**Actual Behavior:**
The application's performance is poor due to inefficient data fetching. This leads to slow launch times, slow screen transitions, and increased memory and battery consumption.
