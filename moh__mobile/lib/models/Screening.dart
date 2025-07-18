import 'package:cloud_firestore/cloud_firestore.dart';

class Screening {
  final double weight;
  final double temperature;
  final int heartRate;
  final String bloodPressure;

  Screening({
    required this.weight,
    required this.temperature,
    required this.heartRate,
    required this.bloodPressure,
  });

  factory Screening.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return Screening(
      weight: (data['weight'] as num).toDouble(),
      temperature: (data['temperature'] as num).toDouble(),
      heartRate: data['heartRate'] as int,
      bloodPressure: data['bloodPressure'] as String,
    );
  }
}