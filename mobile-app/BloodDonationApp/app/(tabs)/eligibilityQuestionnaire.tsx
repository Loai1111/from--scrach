import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, SafeAreaView, ScrollView } from 'react-native';
import { CheckBox } from 'react-native-elements';

const questions = [
  { id: '1', text: 'Are you feeling well and healthy today?' },
  { id: '2', text: 'Are you at least 17 years old?' },
  { id: '3', text: 'Do you weigh at least 110 lbs (50 kg)?' },
  { id: '4', text: 'Have you donated blood in the last 56 days?' },
  { id: '5', text: 'Have you had any tattoos or piercings in the last 3 months?' },
];

const EligibilityQuestionnaireScreen = () => {
  const [answers, setAnswers] = useState({});

  const handleCheckboxChange = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const areAllYes = () => {
    return questions.every(q => answers[q.id] === true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Eligibility Questionnaire</Text>
        {questions.map(q => (
          <View key={q.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>{q.text}</Text>
            <View style={styles.checkboxContainer}>
              <CheckBox
                title="Yes"
                checked={answers[q.id] === true}
                onPress={() => handleCheckboxChange(q.id, true)}
                containerStyle={styles.checkbox}
              />
              <CheckBox
                title="No"
                checked={answers[q.id] === false}
                onPress={() => handleCheckboxChange(q.id, false)}
                containerStyle={styles.checkbox}
              />
            </View>
          </View>
        ))}
        <Button
          title="Check Eligibility"
          onPress={() => {
            if (areAllYes()) {
              alert('You are eligible to donate!');
            } else {
              alert('You are not eligible to donate based on your answers.');
            }
          }}
          color="#c0392b"
          disabled={Object.keys(answers).length !== questions.length}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  questionContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  questionText: {
    fontSize: 18,
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  checkbox: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});

export default EligibilityQuestionnaireScreen;