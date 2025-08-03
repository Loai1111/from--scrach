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
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Profile'),
        centerTitle: true,
        backgroundColor: Colors.red[800],
      ),
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
              return SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Card(
                        elevation: 4,
                        color: Colors.red.shade50,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            children: [
                              CircleAvatar(
                                radius: 50,
                                backgroundColor: Colors.red.shade100,
                                child: Icon(Icons.person, size: 50, color: Colors.red[800]),
                              ),
                              SizedBox(height: 16),
                              Text(
                                userProfile.name,
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                userProfile.email,
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Colors.black54,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(height: 20),
                      Card(
                        elevation: 4,
                        color: Colors.red.shade50,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            ListTile(
                              leading: Icon(Icons.bloodtype, color: Colors.red[800]),
                              title: Text('Blood Type'),
                              subtitle: Text(donorProfile.bloodType),
                            ),
                            ListTile(
                              leading: Icon(Icons.person_outline, color: Colors.red[800]),
                              title: Text('Sex'),
                              subtitle: Text(donorProfile.sex),
                            ),
                            ListTile(
                              leading: Icon(Icons.cake, color: Colors.red[800]),
                              title: Text('Date of Birth'),
                              subtitle: Text(donorProfile.dob.toString().substring(0,10)),
                            ),
                             ListTile(
                              leading: Icon(Icons.history, color: Colors.red[800]),
                              title: Text('Total Donations'),
                              subtitle: Text(donorProfile.donationRecord.toString()),
                            ),
                             ListTile(
                              leading: Icon(Icons.block, color: Colors.red[800]),
                              title: Text('Disqualification Status'),
                              subtitle: Text(donorProfile.disqualificationStatus),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
            loading: () => Center(child: CircularProgressIndicator(color: Colors.red[800])),
            error: (err, stack) => Center(child: Text('Error loading donor profile')),
          );
        },
        loading: () => Center(child: CircularProgressIndicator(color: Colors.red[800])),
        error: (err, stack) => Center(child: Text('Error loading user profile')),
      ),
    );
  }
}
