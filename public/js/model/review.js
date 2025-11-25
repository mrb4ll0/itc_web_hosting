import {
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export class CompanyReview {
  constructor({
    id,
    companyId,
    studentId,
    studentName,
    comment,
    rating,
    createdAt,
  }) {
    this.id = id;
    this.companyId = companyId;
    this.studentId = studentId;
    this.studentName = studentName;
    this.comment = comment;
    this.rating = rating;
    // Only use Date if it’s already a valid timestamp from Firestore
    this.createdAt = createdAt;
  }

  toMap() {
    return {
      id: this.id,
      companyId: this.companyId,
      studentId: this.studentId,
      studentName: this.studentName,
      comment: this.comment,
      rating: this.rating,
      createdAt: serverTimestamp(), 
    };
  }

  static fromMap(map) {
    const review = new CompanyReview({
      id: map.id,
      companyId: map.companyId,
      studentId: map.studentId,
      studentName: map.studentName,
      comment: map.comment,
      rating: map.rating,
      createdAt: map.createdAt,
    });
  return review;
   
  }
}
