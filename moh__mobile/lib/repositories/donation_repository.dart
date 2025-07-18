import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lifeline/models/Donation.dart';

class DonationRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final CollectionReference _donationsCollection =
      FirebaseFirestore.instance.collection('donations');

  Future<void> addDonation(Donation donation) async {
    try {
      await _donationsCollection.add(donation.toJson());
    } catch (e) {
      print('Error adding donation: $e');
      throw Exception('Failed to add donation');
    }
  }

  Future<List<Donation>> getDonations(String donorId) async {
    try {
      final querySnapshot = await _donationsCollection
          .where('donorId', isEqualTo: donorId)
          .get();
      return querySnapshot.docs
          .map((doc) => Donation.fromFirestore(doc))
          .toList();
    } catch (e) {
      print('Error getting donations: $e');
      throw Exception('Failed to get donations');
    }
  }
}