-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 09, 2025 at 09:56 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lifeline_db_1`
--
USE `lifeline_db_1`;

--
-- Disabling foreign key checks
--
SET FOREIGN_KEY_CHECKS=0;

--
-- Dropping tables in the correct order
--
DROP TABLE IF EXISTS `requestbags`;
DROP TABLE IF EXISTS `bloodbags`;
DROP TABLE IF EXISTS `bloodrequests`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `patients`;
DROP TABLE IF EXISTS `donors`;


--
-- Table structure for table `donors`
--
CREATE TABLE `donors` (
  `DonorID` int(11) NOT NULL,
  `DonorName` varchar(255) NOT NULL,
  `BloodType` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `patients`
--
CREATE TABLE `patients` (
  `PatientID` int(11) NOT NULL,
  `PatientName` varchar(255) NOT NULL,
  `BloodType` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `notifications`
--
CREATE TABLE `notifications` (
  `NotificationID` int(11) NOT NULL,
  `RecipientRole` enum('BloodBank','Hospital') NOT NULL,
  `Message` text NOT NULL,
  `IsRead` tinyint(1) NOT NULL DEFAULT 0,
  `CreatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `NotificationType` varchar(255) DEFAULT NULL,
  `ReferenceID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `bloodrequests`
--
CREATE TABLE `bloodrequests` (
  `RequestID` int(11) NOT NULL,
  `HospitalID` int(11) NOT NULL,
  `StaffID` int(11) NOT NULL,
  `PatientID` int(11) NOT NULL,
  `BloodType` varchar(5) NOT NULL,
  `Urgency` enum('Emergency','Urgent','Scheduled') NOT NULL,
  `Status` enum('PENDING_REVIEW','PENDING_CROSSMATCH','ESCALATED_TO_DONORS','ALLOCATED','ISSUED','FULFILLED','CANCELLED_BY_HOSPITAL','REJECTED_BY_BLOODBANK') NOT NULL DEFAULT 'PENDING_REVIEW',
  `ComponentType` varchar(50) NOT NULL DEFAULT 'Whole Blood',
  `Quantity` int(11) NOT NULL,
  `SpecialRequirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`SpecialRequirements`)),
  `CrossmatchReport` varchar(255) DEFAULT NULL,
  `Notes` text DEFAULT NULL,
  `RequiredAt` datetime NOT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `StatusUpdatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `bloodbags`
--
CREATE TABLE `bloodbags` (
  `BagID` int(11) NOT NULL,
  `DonorID` int(11) DEFAULT NULL,
  `RequestID` int(11) DEFAULT NULL,
  `BloodType` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `CollectionDate` timestamp NOT NULL DEFAULT current_timestamp(),
  `ExpiryDate` timestamp NOT NULL DEFAULT current_timestamp(),
  `Status` enum('available','reserved','in-use','expired','disposed','allocated','dispatched','delivered') NOT NULL DEFAULT 'available',
  `Disposed` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `requestbags`
--
CREATE TABLE `requestbags` (
  `RequestBagID` int(11) NOT NULL,
  `RequestID` int(11) NOT NULL,
  `BagID` int(11) NOT NULL,
  `AssignedAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `eligibility`
--
CREATE TABLE `eligibility` (
  `EligibilityID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `QuestionID` int(11) NOT NULL,
  `Answer` tinyint(1) NOT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for tables
--
INSERT INTO `donors` (`DonorID`, `DonorName`, `BloodType`) VALUES
(1, 'John Smith', 'A+'),
(2, 'Jane Doe', 'O-'),
(3, 'Sam Jones', 'B+');

INSERT INTO `patients` (`PatientID`, `PatientName`, `BloodType`) VALUES
(1, 'John Smith', 'A+'),
(2, 'Jane Doe', 'O-'),
(3, 'Peter Jones', 'B+'),
(4, 'Mary Williams', 'AB+');

INSERT INTO `bloodrequests` (`RequestID`, `HospitalID`, `StaffID`, `PatientID`, `Urgency`, `Status`, `ComponentType`, `Quantity`, `SpecialRequirements`, `Notes`, `RequiredAt`, `CreatedAt`, `StatusUpdatedAt`) VALUES
(1, 1, 101, 1, 'Scheduled', 'PENDING_CROSSMATCH', 'Whole Blood', 1, '[\"CMV-Negative\"]', NULL, '2025-07-08 20:01:30', '2025-07-08 20:01:30', '2025-07-08 20:01:30'),
(2, 1, 101, 2, 'Scheduled', 'ESCALATED_TO_DONORS', 'Whole Blood', 500, '[]', NULL, '2025-07-08 20:04:00', '2025-07-08 20:04:00', '2025-07-08 20:04:00'),
(3, 1, 101, 1, 'Urgent', 'CANCELLED_BY_HOSPITAL', 'Whole Blood', 1, '[]', NULL, '2025-07-09 16:16:09', '2025-07-09 15:40:19', '2025-07-09 16:16:09'),
(4, 1, 101, 2, 'Scheduled', 'PENDING_CROSSMATCH', 'Whole Blood', 1, '[\"CMV-Negative\"]', NULL, '2025-07-09 16:13:11', '2025-07-09 16:13:11', '2025-07-09 16:13:11'),
(5, 1, 101, 2, 'Scheduled', 'CANCELLED_BY_HOSPITAL', 'Whole Blood', 1, '[]', NULL, '2025-07-09 17:03:52', '2025-07-09 16:16:34', '2025-07-09 17:03:52'),
(6, 1, 101, 1, 'Urgent', 'PENDING_CROSSMATCH', 'Whole Blood', 1, '[\"CMV-Negative\"]', NULL, '2025-07-09 17:02:10', '2025-07-09 17:02:10', '2025-07-09 17:02:10'),
(7, 1, 101, 1, 'Scheduled', 'PENDING_CROSSMATCH', 'Whole Blood', 1, '[\"CMV-Negative\"]', NULL, '2025-07-09 17:27:26', '2025-07-09 17:27:26', '2025-07-09 17:27:26'),
(8, 1, 101, 1, 'Scheduled', 'PENDING_CROSSMATCH', 'Whole Blood', 1, '[\"CMV-Negative\"]', NULL, '2025-07-09 17:39:37', '2025-07-09 17:39:37', '2025-07-09 17:39:37'),
(9, 1, 101, 1, 'Scheduled', 'PENDING_CROSSMATCH', 'Whole Blood', 1, '[\"CMV-Negative\",\"Irradiated\"]', NULL, '2025-07-09 19:38:32', '2025-07-09 19:38:32', '2025-07-09 19:38:32'),
(10, 1, 101, 4, 'Scheduled', 'PENDING_CROSSMATCH', 'Whole Blood', 1, '[\"Irradiated\",\"Leukoreduced\",\"HbS-Negative\",\"CMV-Negative\"]', NULL, '2025-07-09 19:39:46', '2025-07-09 19:39:46', '2025-07-09 19:39:46');

INSERT INTO `bloodbags` (`BagID`, `DonorID`, `BloodType`, `CollectionDate`, `ExpiryDate`, `Status`, `Disposed`) VALUES
(1, NULL, 'A+', '2025-07-08 20:00:36', '2025-08-15 20:59:59', 'available', 0),
(2, NULL, 'O-', '2025-07-08 20:00:36', '2025-08-10 20:59:59', 'available', 0),
(3, NULL, 'B+', '2025-07-08 20:00:36', '2025-08-20 20:59:59', 'available', 0),
(4, NULL, 'A+', '2025-07-08 20:06:30', '2025-07-10 21:00:00', 'available', 0),
(5, 1, 'A+', '2025-07-09 17:43:36', '0000-00-00 00:00:00', 'expired', 0),
(6, 1, 'A+', '2025-07-09 17:44:01', '0000-00-00 00:00:00', 'expired', 0),
(7, 1, 'A+', '2025-07-09 19:24:53', '2025-07-08 21:00:00', 'expired', 0),
(8, 1, 'A+', '2025-07-09 19:25:29', '2025-07-15 21:00:00', 'available', 0),
(9, 2, 'O-', '2025-07-09 19:36:39', '2025-07-22 21:00:00', 'available', 0),
(10, 2, 'O-', '2025-07-09 19:36:39', '2025-07-22 21:00:00', 'available', 0),
(11, 2, 'O-', '2025-07-09 19:36:39', '2025-07-22 21:00:00', 'available', 0),
(12, 2, 'O-', '2025-07-09 19:37:23', '0000-00-00 00:00:00', 'available', 0),
(13, 2, 'O-', '2025-07-09 19:37:23', '0000-00-00 00:00:00', 'available', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `donors`
--
ALTER TABLE `donors`
  ADD PRIMARY KEY (`DonorID`);

--
-- Indexes for table `patients`
--
ALTER TABLE `patients`
  ADD PRIMARY KEY (`PatientID`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`NotificationID`);

--
-- Indexes for table `bloodrequests`
--
ALTER TABLE `bloodrequests`
  ADD PRIMARY KEY (`RequestID`),
  ADD KEY `PatientID` (`PatientID`);

--
-- Indexes for table `bloodbags`
--
ALTER TABLE `bloodbags`
  ADD PRIMARY KEY (`BagID`),
  ADD KEY `RequestID` (`RequestID`);

--
-- Indexes for table `requestbags`
--
ALTER TABLE `requestbags`
  ADD PRIMARY KEY (`RequestBagID`),
  ADD KEY `RequestID` (`RequestID`),
  ADD KEY `BagID` (`BagID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `donors`
--
ALTER TABLE `donors`
  MODIFY `DonorID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `patients`
--
ALTER TABLE `patients`
  MODIFY `PatientID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `NotificationID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bloodrequests`
--
ALTER TABLE `bloodrequests`
  MODIFY `RequestID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `bloodbags`
--
ALTER TABLE `bloodbags`
  MODIFY `BagID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `requestbags`
--
ALTER TABLE `requestbags`
  MODIFY `RequestBagID` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bloodrequests`
--
ALTER TABLE `bloodrequests`
  ADD CONSTRAINT `bloodrequests_ibfk_1` FOREIGN KEY (`PatientID`) REFERENCES `patients` (`PatientID`);

--
-- Constraints for table `bloodbags`
--
ALTER TABLE `bloodbags`
  ADD CONSTRAINT `bloodbags_ibfk_1` FOREIGN KEY (`RequestID`) REFERENCES `bloodrequests` (`RequestID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `requestbags`
--
ALTER TABLE `requestbags`
  ADD CONSTRAINT `requestbags_ibfk_1` FOREIGN KEY (`RequestID`) REFERENCES `bloodrequests` (`RequestID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `requestbags_ibfk_2` FOREIGN KEY (`BagID`) REFERENCES `bloodbags` (`BagID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Enabling foreign key checks
--
SET FOREIGN_KEY_CHECKS=1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
