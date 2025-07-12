import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:lifeline/models/BloodBag.dart';
import 'package:lifeline/services/config_service.dart';

class BloodInventoryRepository {
  Future<List<BloodBag>> fetchBloodBags() async {
    final response = await http.get(Uri.parse('${ConfigService.apiUrl}/inventory'));

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => BloodBag.fromJson(json)).toList();
    } else {
      print('Failed to load blood bags. Status code: ${response.statusCode}');
      print('Response body: ${response.body}');
      throw Exception('Failed to load blood bags');
    }
  }
}