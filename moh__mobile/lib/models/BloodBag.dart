import 'package:cloud_firestore/cloud_firestore.dart';

class BloodBag {
  final String id;
  final String donorId;
  final String bloodType;
  final String status;
  final DateTime donatedAt;
  final DateTime expiryDate;

  BloodBag({
    required this.id,
    required this.donorId,
    required this.bloodType,
    required this.status,
    required this.donatedAt,
    required this.expiryDate,
  });

  BloodBag copyWith({
    String? id,
    String? donorId,
    String? bloodType,
    String? status,
    DateTime? donatedAt,
    DateTime? expiryDate,
  }) {
    return BloodBag(
      id: id ?? this.id,
      donorId: donorId ?? this.donorId,
      bloodType: bloodType ?? this.bloodType,
      status: status ?? this.status,
      donatedAt: donatedAt ?? this.donatedAt,
      expiryDate: expiryDate ?? this.expiryDate,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'donorId': donorId,
      'bloodType': bloodType,
      'status': status,
      'donatedAt': Timestamp.fromDate(donatedAt),
      'expiryDate': Timestamp.fromDate(expiryDate),
    };
  }

  factory BloodBag.fromJson(Map<String, dynamic> json) {
    return BloodBag(
      id: json['id'],
      donorId: json['donorId'],
      bloodType: json['bloodType'],
      status: json['status'],
      donatedAt: (json['donatedAt'] as Timestamp).toDate(),
      expiryDate: (json['expiryDate'] as Timestamp).toDate(),
    );
  }

  factory BloodBag.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return BloodBag(
      id: doc.id,
      donorId: data['donorId'],
      bloodType: data['bloodType'],
      status: data['status'],
      donatedAt: (data['donatedAt'] as Timestamp).toDate(),
      expiryDate: (data['expiryDate'] as Timestamp).toDate(),
    );
  }
}