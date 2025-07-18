import 'package:lifeline/models/Questionnaire.dart';

class QuestionnaireService {
  static List<Question> getQuestions() {
    return [
      Question(id: 'allergies', text: 'Do you have severe or chronic allergic diseases?', type: 'Permanent'),
      Question(id: 'chronicDisease', text: 'Do you have chronic diseases (diabetes, heart, kidney, lung)?', type: 'Permanent'),
      Question(id: 'cancer', text: 'Have you ever had cancer?', type: 'Permanent'),
      Question(id: 'adverseReaction', text: 'Have you experienced adverse reactions to blood donation more than twice?', type: 'Permanent'),
      Question(id: 'jaundice', text: 'Do you have jaundice or any liver diseases?', type: 'Permanent'),
      Question(id: 'addiction', text: 'Are you addicted to any medications or illicit drugs?', type: 'Permanent'),
      Question(id: 'aidsOrStd', text: 'Do you have AIDS or any other sexually transmitted diseases (STDs)?', type: 'Permanent'),
      Question(id: 'epilepsy', text: 'Do you have epilepsy?', type: 'Permanent'),
      Question(id: 'bloodDisease', text: 'Do you have any blood diseases or hereditary bleeding disorders?', type: 'Permanent'),
      Question(id: 'hepatitis', text: 'Have you ever been infected with viral Hepatitis B or C?', type: 'Permanent'),
      Question(id: 'leprosy', text: 'Do you have leprosy?', type: 'Permanent'),
      Question(id: 'schizophrenia', text: 'Do you have schizophrenia?', type: 'Permanent'),
      Question(id: 'vitiligo', text: 'Do you have vitiligo?', type: 'Permanent'),
      Question(id: 'weightLoss', text: 'Have you experienced unexplained weight loss recently?', type: 'Temporary'),
      Question(id: 'endocrine', text: 'Do you have any endocrine disorders?', type: 'Permanent'),
      Question(id: 'polycythemia', text: 'Do you have Polycythemia Vera?', type: 'Permanent'),
      Question(id: 'brucellosis', text: 'Have you ever had a Brucellosis infection?', type: 'Permanent'),
      Question(id: 'surgery', text: 'Have you undergone neurosurgery, organ, or cell transplantation?', type: 'Permanent'),
    ];
  }
}