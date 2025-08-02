import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/models/Donor.dart';
import 'package:lifeline/repositories/donor_repository.dart'; // Assuming donor_repository exists
import 'package:lifeline/providers/auth_provider.dart';

final donorRepositoryProvider = Provider((ref) => DonorRepository());

final donorProvider = FutureProvider<Donor?>((ref) async {
  final user = ref.watch(authStateChangesProvider).asData?.value;
  if (user == null) return null;
  return ref.watch(donorRepositoryProvider).getDonorProfile(user.uid);
});