USE lifeline_db_1;

DROP TABLE IF EXISTS donors;
CREATE TABLE donors (
  DonorID int,
  DonorName varchar(255),
  BloodType varchar(3),
  Email varchar(255),
  DateOfBirth date,
  PhoneNumber varchar(20)
);

DROP TABLE IF EXISTS patients;
CREATE TABLE patients (
  PatientID int,
  PatientName varchar(255),
  BloodType varchar(3)
);

DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  NotificationID int,
  RecipientRole varchar(10),
  Message text,
  IsRead tinyint,
  CreatedAt varchar(255),
  NotificationType varchar(255),
  ReferenceID int
);

DROP TABLE IF EXISTS bloodrequests;
CREATE TABLE bloodrequests (
  RequestID int,
  HospitalID int,
  StaffID int,
  PatientID int,
  BloodType varchar(5),
  Urgency varchar(10),
  Status varchar(25),
  ComponentType varchar(50),
  Quantity int,
  SpecialRequirements longtext,
  CrossmatchReport varchar(255),
  Notes text,
  RequiredAt varchar(255),
  CreatedAt varchar(255),
  StatusUpdatedAt varchar(255)
);

DROP TABLE IF EXISTS bloodbags;
CREATE TABLE bloodbags (
  BagID int,
  DonorID int,
  RequestID int,
  BloodType varchar(3),
  CollectionDate varchar(255),
  ExpiryDate varchar(255),
  Status varchar(25),
  Disposed tinyint
);

DROP TABLE IF EXISTS requestbags;
CREATE TABLE requestbags (
  RequestBagID int,
  RequestID int,
  BagID int,
  AssignedAt varchar(255)
);

DROP TABLE IF EXISTS eligibility;
CREATE TABLE eligibility (
  EligibilityID int,
  UserID int,
  QuestionID int,
  Answer tinyint,
  CreatedAt varchar(255)
);

-- Inserting sample data
INSERT INTO donors (DonorID, DonorName, BloodType, Email, DateOfBirth, PhoneNumber) VALUES
(1, 'abdulrahman ali', 'A+', 'donor@example.com', '2004-01-06', '772770537'),
(2, 'Jane Smith', 'O-'),
(3, 'John Doe', 'B+'),
(4, 'Emily Jones', 'AB+'),
(5, 'Michael Brown', 'A-');

INSERT INTO patients (PatientID, PatientName, BloodType) VALUES
(101, 'Alice Johnson', 'A+'),
(102, 'Bob Williams', 'B+'),
(103, 'Charlie Brown', 'O-'),
(104, 'Diana Miller', 'AB+'),
(105, 'Ethan Davis', 'A-');

INSERT INTO bloodbags (BagID, DonorID, BloodType, CollectionDate, ExpiryDate, Status, Disposed) VALUES
(1001, 1, 'A+', '2024-05-01', '2024-06-15', 'Available', 0),
(1002, 2, 'O-', '2024-05-02', '2024-06-16', 'Available', 0),
(1003, 3, 'B+', '2024-05-03', '2024-06-17', 'Available', 0),
(1004, 4, 'AB+', '2024-05-04', '2024-06-18', 'Available', 0),
(1005, 5, 'A-', '2024-05-05', '2024-06-19', 'Available', 0),
(1006, 1, 'A+', '2024-05-06', '2024-06-20', 'Available', 0);

INSERT INTO notifications (NotificationID, RecipientRole, Message, IsRead, CreatedAt, NotificationType, ReferenceID) VALUES
(1, 'BloodBank', 'Blood bag 1001 is nearing expiry.', 0, '2024-06-10 10:00:00', 'EXPIRY_WARNING', 1001),
(2, 'Hospital', 'New blood request for patient Alice Johnson.', 0, '2024-06-11 11:00:00', 'NEW_REQUEST', 1);

INSERT INTO bloodrequests (RequestID, HospitalID, StaffID, PatientID, BloodType, Urgency, Status, Quantity, CreatedAt, RequiredAt) VALUES
(1, 1, 1, 101, 'A+', 'Urgent', 'PENDING_CROSSMATCH', 2, '2024-06-11 11:00:00', '2024-06-11 14:00:00'),
(2, 2, 2, 103, 'O-', 'Emergency', 'ESCALATED_TO_DONORS', 1, '2024-06-12 09:00:00', '2024-06-12 10:00:00');
