import { Timestamp } from "firebase/firestore";

export const ApprovalType = {
  STUDENT: "student",
  COMPANY: "company",
  AGENT: "agent",
};

export class Approval {
  constructor({ id, type, name, submittedAt, rawData }) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.submittedAt = submittedAt;
    this.rawData = rawData;
  }

  // ✅ Factory method: Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    const typeString = data?.type ?? "student";

    let type;
    switch (typeString) {
      case "company":
        type = ApprovalType.COMPANY;
        break;
      case "agent":
        type = ApprovalType.AGENT;
        break;
      case "student":
      default:
        type = ApprovalType.STUDENT;
    }

    return new Approval({
      id: doc.id,
      type: type,
      name: data?.name ?? "Unknown",
      submittedAt: data?.submittedAt instanceof Timestamp
        ? data.submittedAt.toDate()
        : new Date(),
      rawData: data,
    });
  }

  // ✅ Convert instance to plain object for Firestore
  toMap() {
    return {
      type: this.type,
      name: this.name,
      submittedAt: Timestamp.fromDate(this.submittedAt),
      ...this.rawData,
    };
  }
}
