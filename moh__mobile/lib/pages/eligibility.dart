import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/models/Questionnaire.dart';
import 'package:lifeline/providers/auth_provider.dart';
import 'package:lifeline/providers/eligibility_provider.dart';

class EligibilityPage extends ConsumerStatefulWidget {
  const EligibilityPage({super.key});

  @override
  ConsumerState<EligibilityPage> createState() => _EligibilityPageState();
}

class _EligibilityPageState extends ConsumerState<EligibilityPage> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, bool?> _answers = {};
  final _nationalIdController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _nationalIdController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _submitForm() async {
    final questions = ref.read(eligibilityQuestionsProvider);
    final allAnswered = questions.every((q) => _answers[q.id] != null);

    if (!allAnswered) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please answer all questions.')),
      );
      return;
    }

    if (_formKey.currentState!.validate()) {
      final finalAnswers =
          _answers.map((key, value) => MapEntry(key, value!));
      final result = await ref
          .read(eligibilityNotifierProvider.notifier)
          .processAndSubmitQuestionnaire(
            finalAnswers,
            nationalId: _nationalIdController.text,
            address: _addressController.text,
            phone: _phoneController.text,
          );
      _showResultDialog(result);
    }
  }

  void _showResultDialog(String result) {
    String title;
    String content;

    switch (result) {
      case 'Pass':
        title = 'Eligibility Status';
        content = 'You are eligible to donate.';
        break;
      case 'Permanent Disqualification':
        title = 'Eligibility Status';
        content =
            'You are permanently disqualified from donating due to a medical condition indicated in your answers.';
        break;
      case 'Temporary Disqualification':
        title = 'Eligibility Status';
        content = 'You are temporarily disqualified from donating.';
        break;
      default:
        title = 'Submission Successful';
        content =
            'Your questionnaire has been submitted. You will be notified of the result.';
    }

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context); // Go back to the previous page
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final questions = ref.watch(eligibilityQuestionsProvider);
    final userAsyncValue = ref.watch(userProvider);
    final latestDonationAsyncValue = ref.watch(latestDonationProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Eligibility Test')),
      body: userAsyncValue.when(
        data: (user) {
          if (user == null) {
            return const Center(child: Text('User not found. Please log in.'));
          }
          final latestDonation = latestDonationAsyncValue.value;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionTitle('Eligibility Questionnaire'),
                  if (questions.isEmpty)
                    const Center(child: Text('No questions available.'))
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: questions.length,
                      itemBuilder: (context, index) {
                        final question = questions[index];
                        return _buildQuestion(question);
                      },
                    ),
                  const SizedBox(height: 24),
                  _buildSectionTitle('Additional Information'),
                  TextFormField(
                    controller: _nationalIdController,
                    decoration: const InputDecoration(labelText: 'National ID'),
                    validator: (value) => value!.isEmpty ? 'Please enter your National ID' : null,
                  ),
                  TextFormField(
                    controller: _addressController,
                    decoration: const InputDecoration(labelText: 'Address'),
                     validator: (value) => value!.isEmpty ? 'Please enter your address' : null,
                  ),
                  TextFormField(
                    controller: _phoneController,
                    decoration: const InputDecoration(labelText: 'Phone Number'),
                     validator: (value) => value!.isEmpty ? 'Please enter your phone number' : null,
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _submitForm,
                      child: const Text('Submit'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Error loading user: $e')),
      ),
    );
  }


  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Text(title, style: Theme.of(context).textTheme.headlineSmall),
    );
  }


  Widget _buildQuestion(Question question) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(question.text, style: const TextStyle(fontSize: 16)),
            Row(
              children: [
                Radio<bool?>(
                  value: true,
                  groupValue: _answers[question.id],
                  onChanged: (val) => setState(() => _answers[question.id] = val),
                ),
                const Text('Yes'),
                Radio<bool?>(
                  value: false,
                  groupValue: _answers[question.id],
                  onChanged: (val) => setState(() => _answers[question.id] = val),
                ),
                const Text('No'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}


