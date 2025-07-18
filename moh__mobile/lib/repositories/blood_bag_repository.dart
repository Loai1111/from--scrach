import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lifeline/models/BloodBag.dart';

class BloodBagRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<void> checkAndExpireBags() async {
    print("Checking for expired blood bags...");
    final bagsCollection = _firestore.collection('bloodbags');
    final q = bagsCollection.where("status", whereIn: ["Available", "Crossmatching"]);
    final querySnapshot = await q.get();

    final batch = _firestore.batch();
    final thirtyFiveDaysAgo = DateTime.now().subtract(const Duration(days: 35));

    int expiredCount = 0;

    for (var docSnap in querySnapshot.docs) {
      final bag = docSnap.data();
      if (bag['donatedAt'] != null && bag['donatedAt'] is Timestamp) {
        final donationDate = (bag['donatedAt'] as Timestamp).toDate();
        if (donationDate.isBefore(thirtyFiveDaysAgo)) {
          final bagRef = _firestore.collection('bloodbags').doc(docSnap.id);
          batch.update(bagRef, {'status': 'Expired'});
          expiredCount++;
        }
      }
    }

    if (expiredCount > 0) {
      await batch.commit();
      print('Successfully marked $expiredCount blood bag(s) as Expired.');
    } else {
      print("No expired blood bags found.");
    }
  }

  Future<List<BloodBag>> getAvailableBloodBags() async {
    try {
      await checkAndExpireBags();
      final QuerySnapshot snapshot = await _firestore
          .collection('bloodbags')
          .where('status', isEqualTo: 'Available')
          .get();
      return snapshot.docs.map((doc) => BloodBag.fromFirestore(doc)).toList();
    } catch (e) {
      print('Error fetching available blood bags: $e');
      return [];
    }
  }
}