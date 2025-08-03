import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/models/Donor.dart';
import 'package:lifeline/repositories/donor_repository.dart'; // Assuming donor_repository exists
import 'package:lifeline/providers/auth_provider.dart';

final donorRepositoryProvider = Provider((ref) => DonorRepository());

final donorProvider = FutureProvider<Donor?>((ref) async {
  print('[donorProvider] Starting execution.');
  final user = ref.watch(authStateChangesProvider).asData?.value;
  if (user == null) {
    print('[donorProvider] User is null. Exiting.');
    return null;
  }
  print('[donorProvider] User found: ${user.uid}');

  final donorRepository = ref.watch(donorRepositoryProvider);
  var donorProfile = await donorRepository.getDonorProfile(user.uid);
  print('[donorProvider] Initial donor profile check: ${donorProfile == null ? "Not Found" : "Found"}');

  if (donorProfile == null) {
    print('[donorProvider] No donor profile found for UID: ${user.uid}. Attempting to create one.');
    try {
      print('[donorProvider] Watching userProvider.future to get user profile for creation.');
      final userProfile = await ref.watch(userProvider.future);
      
      if (userProfile != null) {
        print('[donorProvider] User profile found: ${userProfile.name}. Creating new donor profile.');
        final newDonor = Donor(
          id: user.uid,
          fullName: userProfile.name,
          email: userProfile.email,
          bloodType: 'Unknown', // Default value
          sex: 'Unknown', // Default value
          dob: 'Unknown', // Default value
          createdAt: DateTime.now(),
          disqualificationStatus: 'None',
          source: 'Mobile App (Created on Profile Load)',
          phone: null,
          donationRecord: 0,
        );
        await donorRepository.addDonor(newDonor);
        donorProfile = await donorRepository.getDonorProfile(user.uid);
        print('[donorProvider] New donor profile created successfully.');
      } else {
        print('[donorProvider] FAILED to create donor profile: userProvider.future returned null.');
        return null;
      }
    } catch (e, s) {
      print('[donorProvider] ERROR during donor creation: $e');
      print(s);
      return null;
    }
  }
  print('[donorProvider] Returning donor profile.');
  return donorProfile;
});