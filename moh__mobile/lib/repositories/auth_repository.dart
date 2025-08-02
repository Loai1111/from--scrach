import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lifeline/models/UserProfile.dart';

class AuthRepository {
  final FirebaseAuth _firebaseAuth;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  AuthRepository(this._firebaseAuth);

  Stream<User?> get authStateChanges => _firebaseAuth.authStateChanges();

  Future<UserProfile?> getUserProfile(String uid) async {
    final doc = await _firestore.collection('users').doc(uid).get();
    return doc.exists ? UserProfile.fromFirestore(doc) : null;
  }

  Future<void> signOut() async {
    await _firebaseAuth.signOut();
  }

  Future<UserCredential> signInWithEmailAndPassword(String email, String password) async {
    try {
      print('Attempting to sign in with email: $email');
      final cred = await _firebaseAuth.signInWithEmailAndPassword(email: email, password: password);
      print('Sign-in successful for user: ${cred.user!.uid}');
      return cred;
    } on FirebaseAuthException catch (e) {
      print('Firebase Auth Exception: ${e.code} - ${e.message}');
      rethrow;
    } catch (e) {
      print('An unexpected error occurred during sign-in: $e');
      rethrow;
    }
  }

  Future<UserCredential> register({
    required String email,
    required String password,
    required String name,
    required String bloodType,
    required String sex,
    required String dob, // Changed to String
  }) async {
    final cred = await _firebaseAuth.createUserWithEmailAndPassword(email: email, password: password);

    // Create user document
    await _firestore.collection('users').doc(cred.user!.uid).set({
      'name': name,
      'email': email,
      'role': 'donor',
    });

    // Create donor document
    await _firestore.collection('donors').doc(cred.user!.uid).set({
      'fullName': name,
      'email': email,
      'bloodType': bloodType,
      'sex': sex,
      'dob': dob, // Save as formatted string
      'lastDonationDate': null,
      'isEligible': true,
      'createdAt': FieldValue.serverTimestamp(),
      'disqualificationStatus': 'None',
      'source': 'Mobile App',
      'phone': null,
    });

    return cred;
  }

  Future<void> updateUserProfile(String uid, Map<String, dynamic> data) async {
    await _firestore.collection('users').doc(uid).update(data);
    if (data.containsKey('name') ||
        data.containsKey('bloodType') ||
        data.containsKey('sex') ||
        data.containsKey('birthday')) {
      Map<String, dynamic> donorData = {};
      if (data.containsKey('name')) {
        donorData['fullName'] = data['name'];
      }
      if (data.containsKey('bloodType')) {
        donorData['bloodType'] = data['bloodType'];
      }
      if (data.containsKey('sex')) {
        donorData['sex'] = data['sex'];
      }
      if (data.containsKey('birthday')) {
        donorData['dob'] = data['birthday'];
      }
      await _firestore.collection('donors').doc(uid).update(donorData);
    }
  }
}