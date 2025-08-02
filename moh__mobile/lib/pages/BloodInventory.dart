import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/providers/blood_inventory_provider.dart';

class Bloodinventory extends ConsumerWidget {
  const Bloodinventory({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bloodInventory = ref.watch(bloodInventoryProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Blood Bags Available'),
        centerTitle: true,
        backgroundColor: Colors.red[800],
      ),
      body: bloodInventory.when(
        data: (data) {
          if (data.isEmpty) {
            return const Center(child: Text('No blood bags available.'));
          }
          return ListView.builder(
            itemCount: data.length,
            itemBuilder: (context, index) {
              return Card(
                margin: const EdgeInsets.all(8.0),
                child: ListTile(
                  title: Text('Donor: ${data[index].donorName ?? 'Unknown'}'),
                  subtitle: Text('Blood Type: ${data[index].bloodType}'),
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
