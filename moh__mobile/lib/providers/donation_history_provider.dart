import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/models/Donation.dart';
import 'package:lifeline/providers/auth_provider.dart';
import 'package:lifeline/repositories/donation_repository.dart';

final donationRepositoryProvider =
    Provider((ref) => DonationRepository());

final donationHistoryProvider = FutureProvider<List<Donation>>((ref) async {
  final user = ref.watch(authStateChangesProvider).asData?.value;
  if (user == null) return [];
  return ref.watch(donationRepositoryProvider).getDonations(user.uid);
});