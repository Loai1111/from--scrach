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
    return doc.exists ? UserProfile.fromJson(doc.data()!) : null;
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
  }) async {
    final cred = await _firebaseAuth.createUserWithEmailAndPassword(email: email, password: password);
    await _firestore.collection('users').doc(cred.user!.uid).set({
      'name': name,
      'email': email,
      'bloodType': bloodType,
      'sex': sex,
    });
    await _firestore.collection('donors').doc(cred.user!.uid).set({
      'fullName': name,
      'email': email,
      'bloodType': bloodType,
      'sex': sex,
      'lastDonationDate': null,
      'isEligible': true,
      'createdAt': FieldValue.serverTimestamp(),
      'disqualificationStatus': 'None',
      'source': 'Mobile App',
      'phone': null,
      'dob': null,
    });
    return cred;
  }
}