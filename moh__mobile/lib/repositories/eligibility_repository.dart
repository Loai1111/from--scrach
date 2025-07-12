import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:lifeline/models/Questionnaire.dart';
import 'package:lifeline/services/config_service.dart';
import 'package:lifeline/services/questionnaire_service.dart';

class EligibilityRepository {
  Future<List<Question>> fetchQuestions() async {
    // Simulate a network delay
    await Future.delayed(const Duration(seconds: 1));
    return QuestionnaireService.questions;
  }

  Future<http.Response> submitAnswers(List<Map<String, dynamic>> answers) {
    return http.post(
      Uri.parse('${ConfigService.apiUrl}/submit-answers'),
      headers: <String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonEncode(answers),
    );
  }
}