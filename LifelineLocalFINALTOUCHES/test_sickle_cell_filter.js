/**
 * Test script for Sickle Cell Negative filter implementation
 */

import { testCmvNegativeFilter, testSickleCellNegativeFilter } from './scripts/services/blood-match.service.js';

console.log("=== Testing Blood Compatibility Filters ===\n");

// Test CMV Negative Filter
console.log("1. Testing CMV Negative Filter:");
const cmvResults = testCmvNegativeFilter();
console.log(`CMV Filter Test Summary: ${cmvResults.passed} passed, ${cmvResults.failed} failed\n`);

// Test Sickle Cell Negative Filter
console.log("2. Testing Sickle Cell Negative Filter:");
const sickleCellResults = testSickleCellNegativeFilter();
console.log(`Sickle Cell Filter Test Summary: ${sickleCellResults.passed} passed, ${sickleCellResults.failed} failed\n`);

// Overall Summary
const totalPassed = cmvResults.passed + sickleCellResults.passed;
const totalFailed = cmvResults.failed + sickleCellResults.failed;
console.log("=== Overall Test Summary ===");
console.log(`Total Tests: ${totalPassed + totalFailed}`);
console.log(`Passed: ${totalPassed}`);
console.log(`Failed: ${totalFailed}`);

if (totalFailed === 0) {
    console.log("\n✓ All tests passed! The Sickle Cell Negative filter has been successfully implemented.");
} else {
    console.log(`\n✗ ${totalFailed} test(s) failed. Please review the implementation.`);
}