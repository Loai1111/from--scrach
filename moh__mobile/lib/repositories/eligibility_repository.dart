import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:lifeline/models/Donation.dart';

class EligibilityRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<Donation?> getLatestDonation(String userId) async {
    try {
      final snapshot = await _firestore
          .collection('donations')
          .where('donorId', isEqualTo: userId)
          .orderBy('donatedAt', descending: true)
          .limit(1)
          .get();
      if (snapshot.docs.isNotEmpty) {
        return Donation.fromFirestore(snapshot.docs.first);
      }
      return null;
    } catch (e) {
      print('Error fetching latest donation: $e');
      return null;
    }
  }

  Future<bool> checkEligibility(String userId) async {
    // This method should contain the logic to check eligibility
    // For now, it returns true as a placeholder
    return true;
  }

  Future<void> submitQuestionnaire(Map<String, dynamic> questionnaireData) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('User not logged in');
      }
      await _firestore.collection('eligibilityQuestionnaires').add({
        ...questionnaireData,
        'donorId': user.uid,
        'createdAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error submitting questionnaire: $e');
      throw Exception('Failed to submit questionnaire');
    }
  }
}