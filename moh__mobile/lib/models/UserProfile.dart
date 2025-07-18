import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfile {
  final String name;
  final String email;
  final String bloodType;
  final String sex;
  final DateTime? dob;

  UserProfile({
    required this.name,
    required this.email,
    required this.bloodType,
    required this.sex,
    this.dob,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      name: json['name'],
      email: json['email'],
      bloodType: json['bloodType'],
      sex: json['sex'],
      dob: json['dob'] != null ? (json['dob'] as Timestamp).toDate() : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'bloodType': bloodType,
      'sex': sex,
      'dob': dob,
    };
  }
}