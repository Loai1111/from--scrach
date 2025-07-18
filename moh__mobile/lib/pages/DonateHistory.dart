import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/models/Donation.dart';
import 'package:lifeline/providers/donation_history_provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';

class Donatehistory extends ConsumerWidget {
  const Donatehistory({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final donations = ref.watch(donationHistoryProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Donate History'),
        centerTitle: true,
        backgroundColor: Colors.red[800],
      ),
      body: donations.when(
        data: (data) {
          if (data.isEmpty) {
            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  LucideIcons.history,
                  size: 60,
                  color: Colors.grey[700],
                ),
                const SizedBox(height: 20),
                const Text(
                  'No donation history found.',
                  style: TextStyle(
                    fontSize: 18,
                    color: Colors.black54,
                  ),
                ),
              ],
            );
          }
          return ListView.builder(
            itemCount: data.length,
            itemBuilder: (context, index) {
              Donation donation = data[index];
              return Card(
                margin:
                    const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                child: ListTile(
                  leading: const Icon(LucideIcons.droplet, color: Colors.red),
                  title: Text('Status: ${donation.status}'),
                  subtitle: Text(
                      'Date: ${DateFormat.yMMMd().format(donation.donatedAt)}'),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
