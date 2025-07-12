import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/models/Questionnaire.dart';
import 'package:lifeline/providers/eligibility_provider.dart';

class EligibilityPage extends ConsumerStatefulWidget {
  const EligibilityPage({super.key});

  @override
  ConsumerState<EligibilityPage> createState() => _EligibilityPageState();
}

class _EligibilityPageState extends ConsumerState<EligibilityPage> {
  final Map<String, bool> _answers = {};

  Future<void> submitAnswers(List<Question> questions) async {
    final eligibilityRepository = ref.read(eligibilityRepositoryProvider);
    final answers = _answers.entries.map((entry) {
      return {'questionId': entry.key, 'answer': entry.value};
    }).toList();

    final response = await eligibilityRepository.submitAnswers(answers);

    if (response.statusCode == 200) {
      final result = json.decode(response.body);
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Result'),
          content: Text(result['eligible']
              ? 'You are eligible to donate blood!'
              : 'You are NOT eligible to donate blood at this time.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                if (result['eligible']) Navigator.pop(context);
              },
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } else {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Error'),
          content: const Text('Failed to submit answers. Please try again.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  Widget buildQuestion(Question question) {
    return Card(
      margin: EdgeInsets.symmetric(vertical: 8),
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(question.text,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.red[700],
                )),
            SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: RadioListTile<bool>(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Yes'),
                    value: true,
                    groupValue: _answers[question.id],
                    activeColor: Colors.red,
                    onChanged: (val) {
                      setState(() {
                        _answers[question.id] = val!;
                      });
                    },
                  ),
                ),
                Expanded(
                  child: RadioListTile<bool>(
                    contentPadding: EdgeInsets.zero,
                    title: Text('No'),
                    value: false,
                    groupValue: _answers[question.id],
                    activeColor: Colors.red,
                    onChanged: (val) {
                      setState(() {
                        _answers[question.id] = val!;
                      });
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.red[50],
      appBar: AppBar(
        title: Text('Eligibility Test'),
        centerTitle: true,
        backgroundColor: Colors.red[800],
      ),
      body: ref.watch(eligibilityQuestionsProvider).when(
            data: (questions) {
              if (questions.isEmpty) {
                return const Center(child: Text('No questions available.'));
              }
              return SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Please answer the following questions:',
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.red),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    ...questions.map((q) => buildQuestion(q)).toList(),
                    const SizedBox(height: 30),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        minimumSize: const Size(double.infinity, 50),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () {
                        if (_answers.length == questions.length) {
                          submitAnswers(questions);
                        } else {
                          showDialog(
                            context: context,
                            builder: (_) => AlertDialog(
                              title: const Text('Incomplete'),
                              content: const Text(
                                  'Please answer all the questions before submitting.'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text('OK'),
                                ),
                              ],
                            ),
                          );
                        }
                      },
                      child: const Text(
                        'Submit',
                        style: TextStyle(color: Colors.black, fontSize: 18),
                      ),
                    ),
                  ],
                ),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => Center(child: Text('Error: $error')),
          ),
    );
  }
}
