import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/models/Donation.dart';
import 'package:lifeline/models/Questionnaire.dart';
import 'package:lifeline/repositories/eligibility_repository.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:lifeline/services/questionnaire_service.dart';

final eligibilityRepositoryProvider = Provider((ref) => EligibilityRepository());

final eligibilityQuestionsProvider = Provider<List<Question>>((ref) {
  return QuestionnaireService.getQuestions();
});

final latestDonationProvider = FutureProvider<Donation?>((ref) async {
  final userId = FirebaseAuth.instance.currentUser?.uid;
  if (userId == null) return null;
  return ref.watch(eligibilityRepositoryProvider).getLatestDonation(userId);
});

final eligibilityStatusProvider = FutureProvider<bool>((ref) async {
  final userId = FirebaseAuth.instance.currentUser?.uid;
  if (userId == null) return false;
  return ref.watch(eligibilityRepositoryProvider).checkEligibility(userId);
});

class EligibilityNotifier extends StateNotifier<AsyncValue<void>> {
  final EligibilityRepository _repository;
  final List<Question> _questions;

  EligibilityNotifier(this._repository, this._questions) : super(const AsyncValue.data(null));

  Future<String> processAndSubmitQuestionnaire(Map<String, bool> answers,
      {String? nationalId, String? address, String? phone}) async {
    state = const AsyncValue.loading();
    try {
      String finalDisqualificationType = 'None';
      for (final question in _questions) {
        final answer = answers[question.id];
        if (answer == true) {
          if (question.type == 'Permanent') {
            finalDisqualificationType = 'Permanent';
            break;
          } else if (finalDisqualificationType != 'Permanent') {
            finalDisqualificationType = 'Temporary';
          }
        }
      }

      final result = finalDisqualificationType == 'None'
          ? 'Pass'
          : finalDisqualificationType == 'Permanent'
              ? 'Permanent Disqualification'
              : 'Temporary Disqualification';

      final answersAsString =
          answers.map((key, value) => MapEntry(key, value ? 'yes' : 'no'));

      final latestDonation = await _repository
          .getLatestDonation(FirebaseAuth.instance.currentUser!.uid);

      final questionnaireData = {
        'answers': answersAsString,
        'result': result,
        'nationalId': nationalId,
        'address': address,
        'phone': phone,
        'lastDonationDate': latestDonation?.donatedAt,
      };

      await _repository.submitQuestionnaire(questionnaireData);
      state = const AsyncValue.data(null);
      return result;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final eligibilityNotifierProvider =
    StateNotifierProvider<EligibilityNotifier, AsyncValue<void>>((ref) {
  final repository = ref.watch(eligibilityRepositoryProvider);
  final questions = ref.watch(eligibilityQuestionsProvider);
  return EligibilityNotifier(repository, questions);
});