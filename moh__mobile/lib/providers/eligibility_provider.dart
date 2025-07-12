import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/models/Questionnaire.dart';
import 'package:lifeline/repositories/eligibility_repository.dart';

final eligibilityRepositoryProvider =
    Provider((ref) => EligibilityRepository());

final eligibilityQuestionsProvider = FutureProvider<List<Question>>((ref) async {
  return ref.watch(eligibilityRepositoryProvider).fetchQuestions();
});