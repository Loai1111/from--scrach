import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lifeline/models/Donor.dart';

class DonorRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final CollectionReference _donorsCollection =
      FirebaseFirestore.instance.collection('donors');

  Future<void> addDonor(Donor donor) async {
    try {
      await _donorsCollection.add(donor.toJson());
    } catch (e) {
      print('Error adding donor: $e');
      throw Exception('Failed to add donor');
    }
  }

  Future<Donor?> getDonor(String donorId) async {
    try {
      final docSnapshot = await _donorsCollection.doc(donorId).get();
      if (docSnapshot.exists) {
        return Donor.fromFirestore(docSnapshot);
      }
      return null;
    } catch (e) {
      print('Error getting donor: $e');
      throw Exception('Failed to get donor');
    }
  }

  Future<void> updateDonor(Donor donor) async {
    try {
      await _donorsCollection.doc(donor.id).update(donor.toJson());
    } catch (e) {
      print('Error updating donor: $e');
      throw Exception('Failed to update donor');
    }
  }

  Future<Donor?> getDonorProfile(String uid) async {
    try {
      final querySnapshot =
          await _donorsCollection.where('userId', isEqualTo: uid).limit(1).get();
      if (querySnapshot.docs.isNotEmpty) {
        return Donor.fromFirestore(querySnapshot.docs.first);
      }
      return null;
    } catch (e) {
      print('Error getting donor profile: $e');
      throw Exception('Failed to get donor profile');
    }
  }
  Future<void> incrementDonationRecord(String donorId) async {
    try {
      await _donorsCollection.doc(donorId).update({
        'donationRecord': FieldValue.increment(1),
      });
    } catch (e) {
      print('Error incrementing donation record: $e');
      throw Exception('Failed to increment donation record');
    }
  }

  Future<void> updateDonorDisqualificationStatus(
      String donorId, String status) async {
    try {
      await _donorsCollection.doc(donorId).update({
        'disqualificationStatus': status,
      });
    } catch (e) {
      print('Error updating donor disqualification status: $e');
      throw Exception('Failed to update donor disqualification status');
    }
  }
}