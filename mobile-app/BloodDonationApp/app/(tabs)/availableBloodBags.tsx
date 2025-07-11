import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';

interface BloodBag {
  BagID: string;
  BloodType: string;
  DonorName: string;
  ExpiryDate: string;
}

const AvailableBloodBagsScreen = () => {
  const [bloodBags, setBloodBags] = useState<BloodBag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBloodBags = async () => {
      try {
        const response = await fetch('http://localhost:3003/inventory');
        const data = await response.json();
        setBloodBags(data);
      } catch (error) {
        console.error('Failed to fetch blood bags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBloodBags();
  }, []);

  const renderItem = ({ item }: { item: BloodBag }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemBloodType}>{item.BloodType}</Text>
      <Text style={styles.itemLocation}>Donor: {item.DonorName}</Text>
      <Text style={styles.itemExpiry}>Expires: {new Date(item.ExpiryDate).toLocaleDateString()}</Text>
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
      <Text style={styles.title}>Available Blood Bags</Text>
      <FlatList
        data={bloodBags}
        renderItem={renderItem}
        keyExtractor={item => item.BagID}
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
  itemBloodType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c0392b',
  },
  itemLocation: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  itemExpiry: {
    fontSize: 14,
    color: '#777',
    marginTop: 10,
    textAlign: 'right',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AvailableBloodBagsScreen;