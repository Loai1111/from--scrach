import 'package:get_it/get_it.dart';
import 'package:lifeline/services/auth_service.dart';
import 'package:lifeline/services/config_service.dart';

final getIt = GetIt.instance;

void setupLocator() {
  getIt.registerLazySingleton(() => AuthService());
  getIt.registerLazySingleton(() => ConfigService());
}