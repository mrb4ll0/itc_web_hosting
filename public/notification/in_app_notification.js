import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  getFirestore 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export function unifiedNotificationsStream(studentUid, callback) {
  const db = getFirestore();
  
  const privateQuery = query(
    collection(db, 'users', 'students', 'students', studentUid, 'notifications'),
    orderBy('timestamp', 'desc')
  );

  const generalQuery = query(
    collection(db, 'notifications'),
    orderBy('createdAt', 'desc')
  );

  let privateNotifications = [];
  let generalNotifications = [];

  const updateAndNotify = () => {
    const all = [...privateNotifications, ...generalNotifications];
    all.sort((a, b) => b.timestamp - a.timestamp);
    callback(all);
  };

  const privateUnsubscribe = onSnapshot(privateQuery, (snapshot) => {
    privateNotifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        title: data.status || 'No Title',
        body: data.message || 'No Message',
        timestamp: (data.timestamp?.toDate() || new Date()).getTime(),
        type: 'private'
      };
    });
    updateAndNotify();
  });

  const generalUnsubscribe = onSnapshot(generalQuery, (snapshot) => {
    generalNotifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        title: data.title || 'No Title',
        body: data.body || 'No Message',
        timestamp: (data.createdAt?.toDate() || new Date()).getTime(),
        type: 'general'
      };
    });
    updateAndNotify();
  });

  // Return cleanup function
  return () => {
    privateUnsubscribe();
    generalUnsubscribe();
  };
}

