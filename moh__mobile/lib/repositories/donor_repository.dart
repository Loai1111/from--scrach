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
}