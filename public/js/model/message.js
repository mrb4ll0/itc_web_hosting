// Message model equivalent
class Message {
  constructor(data = {}) {
    this.id = data.id || '';
    this.senderId = data.senderId || '';
    this.receiverId = data.receiverId || '';
    this.content = data.content || '';
    this.timestamp = data.timestamp || null;
    this.isRead = data.isRead || false;
    this.replyTo = data.replyTo || null;
    this.imageUrl = data.imageUrl || null;
    this.type = data.type || 'text';
    this.extra = data.extra || {};
  }

  toMap() {
    return {
      senderId: this.senderId,
      receiverId: this.receiverId,
      content: this.content,
      timestamp: this.timestamp,
      isRead: this.isRead,
      replyTo: this.replyTo,
      imageUrl: this.imageUrl,
      type: this.type,
      ...this.extra
    };
  }

  static fromMap(data, id = '') {
    return new Message({
      id: id,
      senderId: data.senderId || '',
      receiverId: data.receiverId || '',
      content: data.content || '',
      timestamp: data.timestamp || null,
      isRead: data.isRead || false,
      replyTo: data.replyTo || null,
      imageUrl: data.imageUrl || null,
      type: data.type || 'text',
      extra: data.extra || {}
    });
  }
}