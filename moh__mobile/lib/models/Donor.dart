import 'package:cloud_firestore/cloud_firestore.dart';

class Donor {
  final String id;
  final String fullName;
  final DateTime dob;
  final String sex;
  final String bloodType;
  final String? email;
  final String? phone;
  final String source;
  final String disqualificationStatus;
  final int donationRecord;
  final DateTime createdAt;

  Donor({
    required this.id,
    required this.fullName,
    required this.dob,
    required this.sex,
    required this.bloodType,
    this.email,
    this.phone,
    required this.source,
    required this.disqualificationStatus,
    required this.donationRecord,
    required this.createdAt,
  });

  Donor copyWith({
    String? id,
    String? fullName,
    DateTime? dob,
    String? sex,
    String? bloodType,
    String? email,
    String? phone,
    String? source,
    String? disqualificationStatus,
    int? donationRecord,
    DateTime? createdAt,
  }) {
    return Donor(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      dob: dob ?? this.dob,
      sex: sex ?? this.sex,
      bloodType: bloodType ?? this.bloodType,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      source: source ?? this.source,
      disqualificationStatus: disqualificationStatus ?? this.disqualificationStatus,
      donationRecord: donationRecord ?? this.donationRecord,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'fullName': fullName,
      'dob': Timestamp.fromDate(dob),
      'sex': sex,
      'bloodType': bloodType,
      'email': email,
      'phone': phone,
      'source': source,
      'disqualificationStatus': disqualificationStatus,
      'donationRecord': donationRecord,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  factory Donor.fromJson(Map<String, dynamic> json) {
    return Donor(
      id: json['id'],
      fullName: json['fullName'],
      dob: (json['dob'] as Timestamp).toDate(),
      sex: json['sex'],
      bloodType: json['bloodType'],
      email: json['email'],
      phone: json['phone'],
      source: json['source'],
      disqualificationStatus: json['disqualificationStatus'],
      donationRecord: json['donationRecord'],
      createdAt: (json['createdAt'] as Timestamp).toDate(),
    );
  }

  factory Donor.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return Donor(
      id: doc.id,
      fullName: data['fullName'],
      dob: (data['dob'] as Timestamp).toDate(),
      sex: data['sex'],
      bloodType: data['bloodType'],
      email: data['email'],
      phone: data['phone'],
      source: data['source'],
      disqualificationStatus: data['disqualificationStatus'],
      donationRecord: data['donationRecord'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }
}