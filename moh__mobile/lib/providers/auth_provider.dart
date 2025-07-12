import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/repositories/auth_repository.dart';

final authRepositoryProvider = Provider((ref) => AuthRepository());