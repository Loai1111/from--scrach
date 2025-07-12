import { useEffect, useState } from 'react';
import { collection, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../../../firebase-config';

const Verification = () => {
  const [timestamps, setTimestamps] = useState<DocumentData[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'verification'), (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map((doc: DocumentData) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTimestamps(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div>
      <h2>Verification Timestamps</h2>
      <ul>
        {timestamps.map((ts) => (
          <li key={ts.id}>{new Date(ts.timestamp?.toDate()).toLocaleString()}</li>
        ))}
      </ul>
    </div>
  );
};

export default Verification;