export class AppNotification {
  constructor({ title, body, timestamp }) {
    this.title = title;
    this.body = body;
    this.timestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);
  }

  
  static fromMap(map) {
    return new AppNotification({
      title: map.title ?? "",
      body: map.body ?? "",
      timestamp: map.timestamp ? new Date(map.timestamp) : new Date(),
    });
  }

  // Convert to plain object (useful for Firestore or API)
  toMap() {
    return {
      title: this.title,
      body: this.body,
      timestamp: this.timestamp.toISOString(),
    };
  }

  toString() {
    return `Notification(title: ${this.title}, body: ${this.body}, timestamp: ${this.timestamp})`;
  }
}

export default AppNotification;
