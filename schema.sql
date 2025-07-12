USE lifeline_db_1;

CREATE TABLE donors (
  DonorID int,
  DonorName varchar(255),
  BloodType varchar(3)
);

CREATE TABLE patients (
  PatientID int,
  PatientName varchar(255),
  BloodType varchar(3)
);

CREATE TABLE notifications (
  NotificationID int,
  RecipientRole varchar(10),
  Message text,
  IsRead tinyint,
  CreatedAt varchar(255),
  NotificationType varchar(255),
  ReferenceID int
);

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

CREATE TABLE requestbags (
  RequestBagID int,
  RequestID int,
  BagID int,
  AssignedAt varchar(255)
);

CREATE TABLE eligibility (
  EligibilityID int,
  UserID int,
  QuestionID int,
  Answer tinyint,
  CreatedAt varchar(255)
);
