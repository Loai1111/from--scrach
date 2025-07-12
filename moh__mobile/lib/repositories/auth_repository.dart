import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:lifeline/services/config_service.dart';
import 'package:lifeline/services/auth_service.dart';
import 'package:lifeline/service_locator.dart';

class AuthRepository {
  final AuthService _authService = getIt<AuthService>();

  Future<http.Response> register(String name, String email, String password) {
    final hashedPassword = _authService.hashPassword(password);
    return http.post(
      Uri.parse('${ConfigService.apiUrl}/register'),
      headers: <String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonEncode(<String, String>{
        'name': name,
        'email': email,
        'password': hashedPassword,
      }),
    );
  }

  Future<http.Response> login(String email, String password) {
    final hashedPassword = _authService.hashPassword(password);
    return http.post(
      Uri.parse('${ConfigService.apiUrl}/login'),
      headers: <String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonEncode(<String, String>{
        'email': email,
        'password': hashedPassword,
      }),
    );
  }
}