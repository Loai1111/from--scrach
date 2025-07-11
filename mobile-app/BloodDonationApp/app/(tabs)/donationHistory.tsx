import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';

interface DonationRequest {
  RequestID: string;
  PatientName: string;
  RequiredAt: string;
  Quantity: number;
  Status: string;
}

const DonationHistoryScreen = () => {
  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch('http://localhost:3003/requests');
        const data = await response.json();
        setRequests(data);
      } catch (error) {
        console.error('Failed to fetch donation requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const renderItem = ({ item }: { item: DonationRequest }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemDate}>Required: {new Date(item.RequiredAt).toLocaleDateString()}</Text>
      <Text style={styles.itemLocation}>Patient: {item.PatientName}</Text>
      <Text style={styles.itemAmount}>Quantity: {item.Quantity}</Text>
      <Text style={styles.itemStatus}>Status: {item.Status}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Donation History</Text>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={item => item.RequestID}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  list: {
    paddingHorizontal: 20,
  },
  itemContainer: {
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
  itemDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c0392b',
  },
  itemLocation: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  itemAmount: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
    textAlign: 'right',
  },
  itemStatus: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DonationHistoryScreen;