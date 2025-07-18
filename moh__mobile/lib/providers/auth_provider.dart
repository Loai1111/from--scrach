import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/models/UserProfile.dart';
import 'package:lifeline/repositories/auth_repository.dart';

final firebaseAuthProvider = Provider<FirebaseAuth>((ref) => FirebaseAuth.instance);

final authRepositoryProvider = Provider((ref) => AuthRepository(ref.watch(firebaseAuthProvider)));

final authStateChangesProvider = StreamProvider<User?>((ref) {
  return ref.watch(authRepositoryProvider).authStateChanges;
});

final userProvider = FutureProvider<UserProfile?>((ref) async {
  final user = ref.watch(authStateChangesProvider).asData?.value;
  if (user == null) return null;
  return ref.watch(authRepositoryProvider).getUserProfile(user.uid);
});