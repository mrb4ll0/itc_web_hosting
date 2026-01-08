import { auth, db} from "../js/config/firebaseInit";
import {Message} from "../js/model/message.js";
import { ITCFirebaseLogic } from "../js/fireabase/ITCFirebaseLogic";
import { sendWebNotification } from "../notification.js";
import { UserConverter } from "../company/general/userConverter.js";
import { UserService } from "../company/general/userService.js";
/** @type {ITCFirebaseLogic} */
const firebaseLogic = ITCFirebaseLogic();
/** @type {UserService} */
const userService = UserService();

class ChatService {
  constructor() {
    // Firebase instances
    this._firebaseAuth = auth;
    this._firebaseFirestore = db;
    
    // Collections
    this.groupsCollection = firebase.firestore().collection('groups');
    this.usersCollection = firebase.firestore().collection('users');
    this.studentsCollection = firebase.firestore()
      .collection('users')
      .doc('students')
      .collection('students');
    
    // Note: NotificationSender and ITCFirebaseLogic are imported from another file
  }

  // GROUP CHAT METHODS

  async createGroup({ name, createdBy, members, admins, description, avatarUrl }) {
    try {
      const groupDoc = await this.groupsCollection.add({
        name: name,
        createdBy: createdBy,
        admins: admins || [createdBy],
        members: [createdBy, ...members],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        avatarUrl: avatarUrl || '',
        description: description || ''
      });
      return groupDoc.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async addGroupMember(groupId, userId) {
    try {
      await this.groupsCollection.doc(groupId).update({
        members: firebase.firestore.FieldValue.arrayUnion([userId])
      });
    } catch (error) {
      console.error('Error adding group member:', error);
      throw error;
    }
  }

  async removeGroupMember(groupId, userId) {
    try {
      await this.groupsCollection.doc(groupId).update({
        members: firebase.firestore.FieldValue.arrayRemove([userId]),
        admins: firebase.firestore.FieldValue.arrayRemove([userId])
      });
    } catch (error) {
      console.error('Error removing group member:', error);
      throw error;
    }
  }

  async promoteToAdmin(groupId, userId) {
    try {
      await this.groupsCollection.doc(groupId).update({
        admins: firebase.firestore.FieldValue.arrayUnion([userId])
      });
    } catch (error) {
      console.error('Error promoting to admin:', error);
      throw error;
    }
  }

  async demoteFromAdmin(groupId, userId) {
    try {
      await this.groupsCollection.doc(groupId).update({
        admins: firebase.firestore.FieldValue.arrayRemove([userId])
      });
    } catch (error) {
      console.error('Error demoting from admin:', error);
      throw error;
    }
  }

  // Returns a subscription function for user groups
  subscribeToUserGroups(userId, callback) {
    return this.groupsCollection
      .where('members', 'array-contains', userId)
      .onSnapshot((snapshot) => {
        const groups = [];
        snapshot.forEach((doc) => {
          groups.push({
            id: doc.id,
            ...doc.data()
          });
        });
        if (callback) callback(groups);
      });
  }

  // Returns a subscription function for group messages
  subscribeToGroupMessages(groupId, callback) {
    return this.groupsCollection
      .doc(groupId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Convert Firestore timestamps
          if (data.timestamp && data.timestamp.toDate) {
            data.timestamp = data.timestamp.toDate();
          }
          messages.push({
            id: doc.id,
            ...data
          });
        });
        if (callback) callback(messages);
      });
  }

  async sendGroupMessage({ groupId, senderId, content, type = 'text', extra }) {
    try {
      // Add message to group's messages subcollection
      await this.groupsCollection.doc(groupId).collection('messages').add({
        senderId: senderId,
        content: content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        type: type,
        ...extra
      });

      // Note: Push notification logic would be handled by external NotificationSender
      // You can call it here if available
      if (typeof window.NotificationSender !== 'undefined') {
        // Fetch group data for notification
        const groupDoc = await this.groupsCollection.doc(groupId).get();
        const groupData = groupDoc.data();
        
        if (groupData) {
          const groupName = groupData.name || 'Group';
          // Implementation would depend on your NotificationSender setup
        }
      }

    } catch (error) {
      console.error('Error sending group message:', error);
      throw error;
    }
  }

  // ONE-ON-ONE CHAT METHODS

  async sendMessage(receiverID, content, options = {}) {
    try {
      const currentUser = this._firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const currentUserId = currentUser.uid;
      const chatID = [currentUserId, receiverID].sort();
      const chatRoomID = chatID.join('_');

      // Check if Message class is available
      let message;
      if (typeof Message !== 'undefined') {
        message = new Message({
          senderId: currentUserId,
          receiverId: receiverID,
          content: content,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          isRead: false,
          replyTo: options.replyTo || null,
          type: options.type || 'text'
        });
      } else {
        // Fallback if Message class is not available
        message = {
          senderId: currentUserId,
          receiverId: receiverID,
          content: content,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          isRead: false,
          replyTo: options.replyTo || null,
          type: options.type || 'text'
        };
      }

      const messageMap = typeof message.toMap === 'function' ? message.toMap() : message;

      // Save the message
      const messageRef = await this._firebaseFirestore
        .collection('chat_rooms')
        .doc(chatRoomID)
        .collection('messages')
        .add(messageMap);

      // Save/update the latest message and participants
      await this._firebaseFirestore.collection('chat_rooms').doc(chatRoomID).set({
        participants: [currentUserId, receiverID],
        latest_message: messageMap,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

          let user = userService.getUser(receiverID);
          
          console.log("user service user is "+JSON.stringify(user));
      if (options.body && options.type && options.title) {
        
          sendWebNotification(user.fmcToken,options.title,options.body);
        
      }

      return { id: messageRef.id, ...messageMap };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Returns a subscription function for messages
  subscribeToMessages(userId, otherUserId, callback) {
    const chatRoomID = this.getChatId(userId, otherUserId);
    
    return this._firebaseFirestore
      .collection('chat_rooms')
      .doc(chatRoomID)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
        const messages = [];
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // Convert Firestore timestamps
            if (data.timestamp && data.timestamp.toDate) {
              data.timestamp = data.timestamp.toDate();
            }
            messages.push({
              id: change.doc.id,
              ...data
            });
          }
        });
        if (callback) callback(messages);
      });
  }

  // Returns all messages (not real-time)
  async getMessages(userId, otherUserId) {
    const chatRoomID = this.getChatId(userId, otherUserId);
    
    const snapshot = await this._firebaseFirestore
      .collection('chat_rooms')
      .doc(chatRoomID)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Convert Firestore timestamps
      if (data.timestamp && data.timestamp.toDate) {
        data.timestamp = data.timestamp.toDate();
      }
      messages.push({
        id: doc.id,
        ...data
      });
    });
    return messages;
  }

  // Returns a subscription function for filtered messages
  subscribeToFilteredMessages(userId, otherUserId, callback) {
    const chatRoomID = this.getChatId(userId, otherUserId);
    
    return this._firebaseFirestore
      .collection('chat_rooms')
      .doc(chatRoomID)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Filter messages
          if (
            data.senderId &&
            data.receiverId &&
            data.content !== null &&
            data.timestamp !== null &&
            (!data.replyTo || typeof data.replyTo === 'object') &&
            (!data.deletedFor || 
             !Array.isArray(data.deletedFor) || 
             !data.deletedFor.includes(userId))
          ) {
            // Convert Firestore timestamps
            if (data.timestamp && data.timestamp.toDate) {
              data.timestamp = data.timestamp.toDate();
            }
            messages.push({
              id: doc.id,
              ...data
            });
          }
        });
        if (callback) callback(messages);
      });
  }

  // Returns a subscription function for all messages for current user
  subscribeToAllMessagesForCurrentUser(callback) {
    const currentUser = this._firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('User not logged in.');
    }

    const currentUserId = currentUser.uid;
    
    return this._firebaseFirestore
      .collection('chat_rooms')
      .where('participants', 'array-contains', currentUserId)
      .orderBy('lastUpdated', 'desc')
      .onSnapshot((snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const latestMessage = data.latest_message;
          
          if (!latestMessage) return;
          
          const deletedFor = latestMessage.deletedFor;
          if (deletedFor && Array.isArray(deletedFor) && deletedFor.includes(currentUserId)) {
            return;
          }
          
          // Convert Firestore timestamps
          if (latestMessage.timestamp && latestMessage.timestamp.toDate) {
            latestMessage.timestamp = latestMessage.timestamp.toDate();
          }
          
          messages.push({
            id: doc.id,
            ...latestMessage
          });
        });
        if (callback) callback(messages);
      });
  }

  // Get all chat conversations for current user
  async getAllChatsForCurrentUser() {
    const currentUser = this._firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('User not logged in.');
    }

    const currentUserId = currentUser.uid;
    
    const snapshot = await this._firebaseFirestore
      .collection('chat_rooms')
      .where('participants', 'array-contains', currentUserId)
      .orderBy('lastUpdated', 'desc')
      .get();

    const chats = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const latestMessage = data.latest_message;
      
      if (!latestMessage) continue;
      
      const deletedFor = latestMessage.deletedFor;
      if (deletedFor && Array.isArray(deletedFor) && deletedFor.includes(currentUserId)) {
        continue;
      }
      
      // Get the other participant
      const otherParticipantId = data.participants.find(id => id !== currentUserId);
      
      chats.push({
        id: doc.id,
        otherParticipantId: otherParticipantId,
        latestMessage: latestMessage,
        lastUpdated: data.lastUpdated
      });
    }
    
    return chats;
  }

  async deleteMessage(contactId, currentUserId, messageId) {
    try {
      const chatId = this.getChatId(currentUserId, contactId);
      console.log('Chat ID:', chatId);

      const messageRef = this._firebaseFirestore
        .collection('chat_rooms')
        .doc(chatId)
        .collection('messages')
        .doc(messageId);

      const messageDoc = await messageRef.get();

      if (!messageDoc.exists) {
        console.log('Message not found');
        return;
      }

      const messageData = messageDoc.data();
      const messageTimestamp = messageData?.timestamp;

      // Delete the message
      await messageRef.delete();
      console.log('Message deleted');

      // Check if it's the latest message
      const chatRoomRef = this._firebaseFirestore.collection('chat_rooms').doc(chatId);
      const chatRoomDoc = await chatRoomRef.get();

      if (chatRoomDoc.exists) {
        const chatRoomData = chatRoomDoc.data();
        const latestMessage = chatRoomData?.latest_message;
        const latestTimestamp = latestMessage?.timestamp;
        
        console.log('Latest message:', latestMessage, 'Latest timestamp:', latestTimestamp);

        // Compare timestamps
        if (latestTimestamp && messageTimestamp) {
          const isEqual = latestTimestamp.seconds === messageTimestamp.seconds &&
                         latestTimestamp.nanoseconds === messageTimestamp.nanoseconds;
          
          if (isEqual) {
            console.log('Deleted message was the latest');

            // Fetch new latest message (next most recent)
            const newLatest = await this._firebaseFirestore
              .collection('chat_rooms')
              .doc(chatId)
              .collection('messages')
              .orderBy('timestamp', 'desc')
              .limit(1)
              .get();

            if (!newLatest.empty) {
              const newLatestData = newLatest.docs[0].data();
              await chatRoomRef.update({
                'latest_message': newLatestData,
                'lastUpdated': newLatestData.timestamp
              });
            } else {
              // No messages left
              await chatRoomRef.update({
                'latest_message': firebase.firestore.FieldValue.delete(),
                'lastUpdated': firebase.firestore.FieldValue.delete()
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  getChatId(userId, contactId) {
    const sorted = [userId, contactId].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  async sendImageMessage(imageUrl, receiverID, caption = '') {
    try {
      if (!imageUrl) {
        console.error('sendImageMessage was called with null imageUrl');
        return;
      }

      const currentUser = this._firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const currentUserId = currentUser.uid;

      // Use sendMessage with image type
      return await this.sendMessage(receiverID, caption || 'Sent an image', {
        type: 'image',
        imageUrl: imageUrl
      });
    } catch (error) {
      console.error('Error sending image message:', error);
      throw error;
    }
  }

  async getLatestMessageData(userId, contactId) {
    try {
      const chatId = this.getChatId(userId, contactId);
      const chatDoc = await this._firebaseFirestore
        .collection('chat_rooms')
        .doc(chatId)
        .get();

      if (!chatDoc.exists) {
        return null;
      }

      const data = chatDoc.data();
      if (!data || !data.latest_message) {
        return null;
      }

      const latestMessage = data.latest_message;

      // Convert timestamp
      let timestamp = latestMessage.timestamp;
      if (timestamp && timestamp.toDate) {
        timestamp = timestamp.toDate();
      }

      return {
        content: latestMessage.content || null,
        receiver_id: latestMessage.receiverId || null,
        sender_id: latestMessage.senderId || null,
        timestamp: timestamp,
        is_read: latestMessage.isRead || false
      };
    } catch (error) {
      console.error('Error getting latest message data:', error);
      return null;
    }
  }

  // Returns a subscription function for latest message data
  subscribeToLatestMessageData(userId, contactId, callback) {
    const chatId = this.getChatId(userId, contactId);

    return this._firebaseFirestore
      .collection('chat_rooms')
      .doc(chatId)
      .onSnapshot((snapshot) => {
        if (!snapshot.exists) {
          if (callback) callback(null);
          return;
        }

        const data = snapshot.data();
        if (!data || !data.latest_message) {
          if (callback) callback(null);
          return;
        }

        const latestMessage = data.latest_message;
        
        // Convert timestamp
        let timestamp = latestMessage.timestamp;
        if (timestamp && timestamp.toDate) {
          timestamp = timestamp.toDate();
        }

        const result = {
          contactId: contactId,
          content: latestMessage.content || null,
          receiver_id: latestMessage.receiverId || null,
          sender_id: latestMessage.senderId || null,
          timestamp: timestamp,
          is_read: latestMessage.isRead || false
        };
        
        if (callback) callback(result);
      });
  }

  async getLatestMessageWithReceiver(userId, contactId) {
    try {
      const data = await this.getLatestMessageData(userId, contactId);

      if (!data) {
        return {
          content: 'Tap to start conversation',
          receiver_id: contactId,
          type: 'default'
        };
      }

      return {
        content: data.content || 'Tap to start conversation',
        receiver_id: data.receiver_id || contactId,
        sender_id: data.sender_id || '',
        type: data.content ? 'actual' : 'default'
      };
    } catch (error) {
      console.error('Error getting message with receiver:', error);
      return {
        content: 'Start a conversation',
        receiver_id: contactId,
        type: 'error'
      };
    }
  }

  async wasMessageSentToMe(userId, contactId) {
    try {
      const data = await this.getLatestMessageData(userId, contactId);

      if (!data) return false;

      const receiverId = data.receiver_id;
      return receiverId === userId;
    } catch (error) {
      console.error('Error checking message direction:', error);
      return false;
    }
  }

  async getFormattedLastMessageWithDirection(userId, contactId) {
    try {
      const data = await this.getLatestMessageData(userId, contactId);

      if (!data) {
        return 'Tap to start conversation';
      }

      const content = data.content;
      if (!content) {
        return 'Tap to start conversation';
      }

      const senderId = data.sender_id;
      const receiverId = data.receiver_id;

      // Check if I sent this message
      if (senderId === userId) {
        return `You: ${this._truncateMessage(content)}`;
      }
      // Check if message was sent to me
      else if (receiverId === userId) {
        return this._truncateMessage(content);
      }
      // Message between other users
      else {
        return this._truncateMessage(content);
      }
    } catch (error) {
      return 'Start a conversation';
    }
  }

  _truncateMessage(message) {
    if (!message) return '';
    if (message.length <= 30) return message;
    return `${message.substring(0, 30)}...`;
  }

  async updateLatestMessageAsRead(currentUserId, contactId) {
    try {
      const chatId = this.getChatId(currentUserId, contactId);
      const chatDoc = await this._firebaseFirestore
        .collection('chat_rooms')
        .doc(chatId)
        .get();

      if (!chatDoc.exists) return;

      const data = chatDoc.data();
      if (!data || !data.latest_message) return;

      const latestMessage = data.latest_message;

      console.log(`senderId ${contactId} lms sender_id is ${latestMessage.senderId}`);

      if (
        latestMessage.senderId === contactId &&
        (!latestMessage.isRead || latestMessage.isRead === false)
      ) {
        // Update the is_read field in latest_message
        await this._firebaseFirestore.collection('chat_rooms').doc(chatId).update({
          'latest_message.isRead': true,
          'latest_message.read_at': firebase.firestore.FieldValue.serverTimestamp(),
          'lastUpdated': firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      console.log('Message marked as read');
    } catch (error) {
      console.error('Error updating latest message as read:', error, error.stack);
    }
  }

  // Helper method to convert Firestore timestamp to Date
  static convertTimestamp(timestamp) {
    if (!timestamp) return null;
    
    if (timestamp.toDate) {
      return timestamp.toDate();
    } else if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return null;
  }

  // Helper method to format date for display
  static formatMessageTime(timestamp) {
    const date = ChatService.convertTimestamp(timestamp);
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  // Helper method to format date for chat list
  static formatChatTime(timestamp) {
    const date = ChatService.convertTimestamp(timestamp);
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChatService };
}