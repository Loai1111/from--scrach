import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/providers/auth_provider.dart';
import 'package:lifeline/providers/donor_provider.dart';

class Profile extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userProfileAsync = ref.watch(userProvider);
    final donorProfileAsync = ref.watch(donorProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: userProfileAsync.when(
        data: (userProfile) {
          if (userProfile == null) {
            return Center(child: Text('Not logged in'));
          }
          return donorProfileAsync.when(
            data: (donorProfile) {
              if (donorProfile == null) {
                return Center(child: Text('Donor details not found.'));
              }
              // Build UI using data from both userProfile and donorProfile
              return ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  Text('Name: ${userProfile.name}'),
                  Text('Email: ${userProfile.email}'),
                  Text('Role: ${userProfile.role}'),
                  Text('Blood Type: ${donorProfile.bloodType}'),
                  Text('Sex: ${donorProfile.sex}'),
                  Text('Date of Birth: ${donorProfile.dob}'),
                  Text('Total Donations: ${donorProfile.donationRecord}'),
                  Text('Disqualification Status: ${donorProfile.disqualificationStatus}'),
                ],
              );
            },
            loading: () => Center(child: CircularProgressIndicator()),
            error: (err, stack) => Center(child: Text('Error loading donor profile')),
          );
        },
        loading: () => Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error loading user profile')),
      ),
    );
  }
}
