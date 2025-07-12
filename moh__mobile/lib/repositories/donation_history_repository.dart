import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:lifeline/services/config_service.dart';

class DonationHistoryRepository {
  Future<List<dynamic>> fetchDonations() async {
    final response =
        await http.get(Uri.parse('${ConfigService.apiUrl}/donations'));

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load donations');
    }
  }
}