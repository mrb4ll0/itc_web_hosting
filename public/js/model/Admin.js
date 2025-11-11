export class Admin {
  constructor({ uid, fullName, email, photoUrl = null, createdAt = null, role = "admin" }) {
    this.uid = uid;
    this.fullName = fullName;
    this.email = email;
    this.photoUrl = photoUrl;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.role = role;
  }

  // ✅ Create instance from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Admin({
      uid: doc.id,
      fullName: data.fullName || "",
      email: data.email || "",
      photoUrl: data.photoUrl || null,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      role: data.role || "admin",
    });
  }

  // ✅ Create instance from plain JS object
  static fromMap(map, uid) {
    return new Admin({
      uid,
      fullName: map.fullName || "",
      email: map.email || "",
      photoUrl: map.photoUrl || null,
      createdAt: map.createdAt ? new Date(map.createdAt) : new Date(),
      role: map.role || "admin",
    });
  }

  // ✅ Convert to Firestore-compatible plain object
  toMap() {
    return {
      fullName: this.fullName,
      email: this.email,
      ...(this.photoUrl && { photoUrl: this.photoUrl }),
      createdAt: this.createdAt,
      role: this.role,
    };
  }

  // ✅ String representation (for debugging)
  toString() {
    return `Admin(uid: ${this.uid}, fullName: ${this.fullName}, email: ${this.email}, createdAt: ${this.createdAt})`;
  }
}
