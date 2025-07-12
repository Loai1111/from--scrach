import 'package:lifeline/models/Questionnaire.dart';

class QuestionnaireService {
  static final List<Question> questions = [
    Question(id: '1', text: 'Have you ever had a positive test for HIV?'),
    Question(id: '2', text: 'Have you ever used a needle to take a drug that was not prescribed by a doctor?'),
    Question(id: '3', text: 'In the last 12 months, have you had sexual contact with a person who has HIV?'),
    Question(id: '4', text: 'In the last 12 months, have you had sexual contact with a person who has used a needle to take a drug that was not prescribed by a doctor?'),
    Question(id: '5', text: 'In the last 12 months, have you had sexual contact with a prostitute or anyone else who takes money or drugs for sex?'),
    Question(id: '6', text: 'In the last 12 months, have you had sexual contact with a person who has hepatitis?'),
    Question(id: '7', text: 'In the last 12 months, have you had a blood transfusion?'),
    Question(id: '8', text: 'In the last 12 months, have you had a tattoo or piercing?'),
    Question(id: '9', text: 'In the last 12 months, have you been in jail or prison?'),
    Question(id: '10', text: 'Are you feeling healthy and well today?'),
    Question(id: '11', text: 'Are you at least 17 years old?'),
    Question(id: '12', text: 'Do you weigh at least 110 pounds?'),
  ];
}