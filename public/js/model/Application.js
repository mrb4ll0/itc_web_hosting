class Application {
  constructor({
    id,
    studentId,
    internshipId,
    status,
    message,
    IT_letter,
    studentIDCard,
  }) {
    this.id = id;
    this.studentId = studentId;
    this.internshipId = internshipId;
    this.status = status;
    this.message = message;
    this.IT_letter = IT_letter;
    this.studentIDCard = studentIDCard;
  }

  // Factory-like method for creating an instance from a Firestore document
  static fromMap(map, id) {
    return new Application({
      id,
      studentId: map.student_id ?? "",
      internshipId: map.internship_id ?? "",
      status: map.status ?? "pending",
      message: map.message ?? "",
      IT_letter: map.IT_letter ?? "",
      studentIDCard: map.studentIDCard ?? "",
    });
  }

  // Convert to plain object for Firestore .set() or .update()
  toMap() {
    return {
      student_id: this.studentId,
      internship_id: this.internshipId,
      status: this.status,
      message: this.message,
      IT_letter: this.IT_letter,
      studentIDCard: this.studentIDCard,
    };
  }

  toString() {
    return `Application(id: ${this.id}, studentId: ${this.studentId}, internshipId: ${this.internshipId}, status: ${this.status})`;
  }
}

export default Application;
