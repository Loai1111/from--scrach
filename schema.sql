-- =================================================================
-- FINAL DATABASE SCHEMA - RUN THIS ENTIRE SCRIPT
-- =================================================================
-- First, drop existing tables in the correct order to avoid errors.
DROP TABLE IF EXISTS `BloodRequestItems`;
DROP TABLE IF EXISTS `BloodRequests`;
DROP TABLE IF EXISTS `BloodBags`;

-- =================================================================
-- Creates the table for storing blood bags in the inventory.
-- This version has NO foreign keys for simplicity.
-- =================================================================
CREATE TABLE `BloodBags` (
    `BagID` INT AUTO_INCREMENT PRIMARY KEY,
    `BloodType` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    `CollectionDate` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `ExpiryDate` TIMESTAMP NOT NULL
) ENGINE=InnoDB;

-- =================================================================
-- Creates the main table for blood requests.
-- This version INCLUDES PatientID and CreatedAt.
-- =================================================================
CREATE TABLE `BloodRequests` (
    `RequestID` INT AUTO_INCREMENT PRIMARY KEY,
    `HospitalID` INT NOT NULL,
    `StaffID` INT NOT NULL,
    `PatientID` VARCHAR(255) NOT NULL, -- This column is required by the API
    `PatientBloodType` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NULL,
    `Urgency` ENUM('Emergency', 'Urgent', 'Scheduled') NOT NULL,
    `Status` ENUM(
        'PENDING_REVIEW',
        'PENDING_CROSSMATCH',
        'ESCALATED_TO_DONORS',
        'ALLOCATED',
        'ISSUED',
        'FULFILLED',
        'CANCELLED_BY_HOSPITAL',
        'REJECTED_BY_BLOODBANK'
    ) NOT NULL DEFAULT 'PENDING_REVIEW',
    `Notes` TEXT NULL,
    `CreatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- This column is required by the API
    `UpdatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =================================================================
-- Creates the table for the items within each blood request.
-- =================================================================
CREATE TABLE `BloodRequestItems` (
    `ItemID` INT AUTO_INCREMENT PRIMARY KEY,
    `RequestID` INT NOT NULL,
    `ComponentType` VARCHAR(50) NOT NULL DEFAULT 'Whole Blood',
    `Quantity` INT NOT NULL,
    `SpecialRequirements` JSON NULL,
    FOREIGN KEY (`RequestID`) REFERENCES `BloodRequests`(`RequestID`) ON DELETE CASCADE
) ENGINE=InnoDB;
