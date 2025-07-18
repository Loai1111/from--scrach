import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/providers/auth_provider.dart';
import 'package:lucide_icons/lucide_icons.dart';

class Profile extends ConsumerWidget {
  const Profile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsyncValue = ref.watch(userProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        centerTitle: true,
        backgroundColor: Colors.red[800],
      ),
      body: userAsyncValue.when(
        data: (user) {
          if (user == null) {
            return const Center(child: Text('No user logged in.'));
          }
          return Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundColor: Colors.red[800],
                  child: const Icon(
                    LucideIcons.user,
                    color: Colors.white,
                    size: 50,
                  ),
                ),
                const SizedBox(height: 20),
                Text('Name: ${user.name}'),
                Text('Email: ${user.email}'),
                Text('Blood Type: ${user.bloodType}'),
                Text('Sex: ${user.sex}'),
                const SizedBox(height: 30),
                ListTile(
                  leading: const Icon(LucideIcons.logOut),
                  title: const Text('Logout'),
                  onTap: () => ref.read(authRepositoryProvider).signOut(),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
