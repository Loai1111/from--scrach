import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfile {
  final String uid;
  final String name;
  final String email;
  final String role; // Added role for authorization

  UserProfile({
    required this.uid,
    required this.name,
    required this.email,
    required this.role,
  });

  factory UserProfile.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> json = doc.data() as Map<String, dynamic>;
    return UserProfile(
      uid: doc.id,
      name: json['name'],
      email: json['email'],
      role: json['role'] ?? 'donor', // Default role to 'donor'
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'role': role,
    };
  }
}