import 'package:cloud_firestore/cloud_firestore.dart';

class EligibilityQuestionnaire {
  final String donorId;
  final String? nationalId;
  final String? address;
  final String? phone;
  final DateTime? lastDonationDate;
  final Map<String, String> answers;
  final String result;
  final Timestamp createdAt;

  EligibilityQuestionnaire({
    required this.donorId,
    this.nationalId,
    this.address,
    this.phone,
    this.lastDonationDate,
    required this.answers,
    required this.result,
    required this.createdAt,
  });

  factory EligibilityQuestionnaire.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return EligibilityQuestionnaire(
      donorId: data['donorId'],
      nationalId: data['nationalId'],
      address: data['address'],
      phone: data['phone'],
      lastDonationDate: (data['lastDonationDate'] as Timestamp?)?.toDate(),
      answers: Map<String, String>.from(data['answers']),
      result: data['result'],
      createdAt: data['createdAt'],
    );
  }
}