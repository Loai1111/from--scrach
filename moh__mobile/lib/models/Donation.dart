import 'package:cloud_firestore/cloud_firestore.dart';

class Donation {
  final String id;
  final String donorId;
  final String labTestId;
  final String bloodBagId;
  final DateTime donatedAt;
  final String status;

  Donation({
    required this.id,
    required this.donorId,
    required this.labTestId,
    required this.bloodBagId,
    required this.donatedAt,
    required this.status,
  });

  Donation copyWith({
    String? id,
    String? donorId,
    String? labTestId,
    String? bloodBagId,
    DateTime? donatedAt,
    String? status,
  }) {
    return Donation(
      id: id ?? this.id,
      donorId: donorId ?? this.donorId,
      labTestId: labTestId ?? this.labTestId,
      bloodBagId: bloodBagId ?? this.bloodBagId,
      donatedAt: donatedAt ?? this.donatedAt,
      status: status ?? this.status,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'donorId': donorId,
      'labTestId': labTestId,
      'bloodBagId': bloodBagId,
      'donatedAt': Timestamp.fromDate(donatedAt),
      'status': status,
    };
  }

  factory Donation.fromJson(Map<String, dynamic> json) {
    return Donation(
      id: json['id'],
      donorId: json['donorId'],
      labTestId: json['labTestId'],
      bloodBagId: json['bloodBagId'],
      donatedAt: (json['donatedAt'] as Timestamp).toDate(),
      status: json['status'],
    );
  }
  factory Donation.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return Donation(
      id: doc.id,
      donorId: data['donorId'],
      labTestId: data['labTestId'],
      bloodBagId: data['bloodBagId'],
      donatedAt: (data['donatedAt'] as Timestamp).toDate(),
      status: data['status'],
    );
  }
}