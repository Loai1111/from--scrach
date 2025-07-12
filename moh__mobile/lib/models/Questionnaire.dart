class Question {
  final String id;
  final String text;

  Question({required this.id, required this.text});

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'],
      text: json['text'],
    );
  }
}

class Answer {
  final String questionId;
  final bool value;

  Answer({required this.questionId, required this.value});

  Map<String, dynamic> toJson() {
    return {
      'questionId': questionId,
      'value': value,
    };
  }
}