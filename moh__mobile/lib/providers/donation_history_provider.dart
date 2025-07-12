import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/repositories/donation_history_repository.dart';

final donationHistoryRepositoryProvider =
    Provider((ref) => DonationHistoryRepository());

final donationHistoryProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.watch(donationHistoryRepositoryProvider).fetchDonations();
});