import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/models/BloodBag.dart';
import 'package:lifeline/repositories/blood_inventory_repository.dart';

final bloodInventoryRepositoryProvider =
    Provider((ref) => BloodInventoryRepository());

final bloodInventoryProvider = FutureProvider<List<BloodBag>>((ref) async {
  return ref.watch(bloodInventoryRepositoryProvider).fetchBloodBags();
});