import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';

interface Donor {
  DonorID: string;
  DonorName: string;
  BloodType: string;
}

const ManageProfileScreen = () => {
  const [donor, setDonor] = useState<Donor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonor = async () => {
      try {
        const response = await fetch('http://localhost:3003/donors');
        const data = await response.json();
        if (data.length > 0) {
          setDonor(data[0]); // Assuming the first donor is the user
        }
      } catch (error) {
        console.error('Failed to fetch donor profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonor();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  if (!donor) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>No donor profile found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Manage Profile</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={donor.DonorName}
            placeholder="Full Name"
          />
          <Text style={styles.label}>Blood Type</Text>
          <TextInput
            style={styles.input}
            value={donor.BloodType}
            placeholder="Blood Type"
            editable={false}
          />
          <Button title="Save Changes" onPress={() => { /* Handle save */ }} color="#c0392b" />
        </View>
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
  form: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  input: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ManageProfileScreen;