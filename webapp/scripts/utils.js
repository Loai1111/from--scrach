/**
 * utils.js
 * Contains shared utility and validation functions for the application.
 */

/**
 * Validates a Yemeni phone number.
 * Must be 9 digits and start with 70, 71, 73, 77, or 78.
 * @param {string} phone - The phone number to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function validatePhoneNumber(phone) {
    if (!phone) return false;
    // Regex for a 9-digit number starting with specific prefixes.
    const phoneRegex = /^(70|71|73|77|78)\d{7}$/;
    return phoneRegex.test(phone.trim());
}

/**
 * Validates if a date of birth corresponds to an age of at least 18.
 * @param {string} dobString - The date of birth in 'YYYY-MM-DD' format.
 * @returns {boolean} - True if age is 18 or over, false otherwise.
 */
export function isAdult(dobString) {
    if (!dobString) return false;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age >= 18;
}

/**
 * Gets today's date as a string in 'YYYY-MM-DD' format, ignoring time.
 * @returns {string}
 */
export function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Validates if a given date string is in the past.
 * @param {string} dateString - The date string to validate.
 * @returns {boolean} - True if the date is in the past, false otherwise.
 */
export function isPastDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    // Set hours to 0 to compare dates only
    today.setHours(0, 0, 0, 0);
    return date < today;
}

/**
 * Validates if a given date string is in the future.
 * @param {string} dateString - The date string to validate.
 * @returns {boolean} - True if the date is in the future, false otherwise.
 */
export function isFutureDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
}


/**
 * Defines the compatibility rules for blood types.
 * The key is the recipient's blood type, and the value is an array of compatible donor blood types.
 */
export const bloodCompatibility = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

/**
 * Signs the user out and redirects to the login page.
 * @param {Auth} auth - The Firebase Auth instance.
 */
export function handleLogout(auth) {
    auth.signOut().then(() => {
        console.log('User signed out successfully.');
        window.location.href = '/pages/login.html';
    }).catch((error) => {
        console.error('Sign out error:', error);
        // Optionally, show an error message to the user
    });
}

/**
 * Displays a loading spinner.
 */
export function showSpinner() {
    const spinner = document.createElement('div');
    spinner.id = 'spinner';
    spinner.style.position = 'fixed';
    spinner.style.top = '50%';
    spinner.style.left = '50%';
    spinner.style.transform = 'translate(-50%, -50%)';
    spinner.style.border = '8px solid #f3f3f3';
    spinner.style.borderTop = '8px solid #3498db';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '60px';
    spinner.style.height = '60px';
    spinner.style.animation = 'spin 1s linear infinite';
    spinner.style.zIndex = '1000';
    document.body.appendChild(spinner);

    const keyframes = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }`;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = keyframes;
    document.head.appendChild(styleSheet);
}

/**
 * Hides the loading spinner.
 */
export function hideSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.remove();
    }
}
