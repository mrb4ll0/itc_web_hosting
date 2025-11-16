// models/CurrentStudent.js
export class CurrentStudent {
  constructor(applicationData) {
    // Basic student info
    this.id = applicationData.application.id;
    this.studentUid = applicationData.application.student.uid;
    this.studentInfo = {
      ...applicationData.application.student,
      applicationDate: applicationData.application.applicationDate
    };
    
    // Training info
    this.trainingInfo = {
      opportunityId: applicationData.opportunityId,
      trainingId: applicationData.training.id,
      title: applicationData.training.title,
      department: applicationData.training.department,
      companyId: applicationData.training.company.id,
      companyName: applicationData.training.company.name,
      supervisor: applicationData.training.supervisor || null
    };
    
    // Duration
    this.duration = {
      startDate: applicationData.application.duration.startDate,
      endDate: applicationData.application.duration.endDate,
      originalStartDate: applicationData.application.duration.startDate,
      extended: false
    };
    
    // Progress tracking
    this.progress = {
      overall: applicationData.application.progress || 0,
      lastUpdated: new Date().toISOString(),
      milestones: this.initializeMilestones(),
      notes: []
    };
    
    // Attendance
    this.attendance = {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      attendanceRate: 0,
      records: []
    };
    
    // Bench system
    this.benchInfo = {
      currentBench: this.determineInitialBench(applicationData.application.progress),
      nextBench: this.determineNextBench(applicationData.application.progress),
      benchHistory: [],
      skills: []
    };
    
    // Performance
    this.performance = {
      rating: 0,
      tasksCompleted: 0,
      totalTasks: 0,
      supervisorFeedback: [],
      achievements: []
    };
    
    // Metadata
    this.metadata = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      migratedFrom: applicationData.application.id
    };
  }
  
  initializeMilestones() {
    return [
      {
        id: 'orientation',
        name: 'Orientation Completed',
        completed: true,
        completedDate: new Date().toISOString(),
        required: true
      },
      {
        id: 'technical_training',
        name: 'Technical Training',
        completed: false,
        completedDate: null,
        required: true
      },
      {
        id: 'project_phase',
        name: 'Project Phase',
        completed: false,
        completedDate: null,
        required: true
      },
      {
        id: 'final_evaluation',
        name: 'Final Evaluation',
        completed: false,
        completedDate: null,
        required: true
      }
    ];
  }
  
  determineInitialBench(progress) {
    if (progress < 25) return 'beginner';
    if (progress < 50) return 'intermediate';
    if (progress < 75) return 'advanced';
    return 'expert';
  }
  
  determineNextBench(progress) {
    if (progress < 25) return 'intermediate';
    if (progress < 50) return 'advanced';
    if (progress < 75) return 'expert';
    return 'graduation';
  }
  
  // Update progress and automatically adjust bench
  updateProgress(newProgress, notes = '') {
    this.progress.overall = Math.max(0, Math.min(100, newProgress));
    this.progress.lastUpdated = new Date().toISOString();
    
    if (notes) {
      this.progress.notes.push({
        date: new Date().toISOString(),
        progress: newProgress,
        note: notes
      });
    }
    
    // Update benches based on progress
    this.benchInfo.currentBench = this.determineInitialBench(newProgress);
    this.benchInfo.nextBench = this.determineNextBench(newProgress);
    
    this.metadata.updatedAt = new Date().toISOString();
  }
  
  // Add attendance record
  addAttendanceRecord(date, status, notes = '') {
    const record = {
      date: date,
      status: status, // 'present', 'absent', 'late'
      notes: notes,
      recordedAt: new Date().toISOString()
    };
    
    this.attendance.records.push(record);
    
    // Update attendance stats
    this.attendance.totalDays++;
    if (status === 'present') {
      this.attendance.presentDays++;
    } else if (status === 'absent') {
      this.attendance.absentDays++;
    }
    
    this.attendance.attendanceRate = this.attendance.presentDays / this.attendance.totalDays * 100;
    this.metadata.updatedAt = new Date().toISOString();
  }
  
  // Add supervisor feedback
  addFeedback(feedback, rating, supervisorName) {
    this.performance.supervisorFeedback.push({
      date: new Date().toISOString(),
      feedback: feedback,
      rating: rating,
      supervisor: supervisorName
    });
    
    // Update overall rating (average of all feedback)
    const totalRating = this.performance.supervisorFeedback.reduce((sum, item) => sum + item.rating, 0);
    this.performance.rating = totalRating / this.performance.supervisorFeedback.length;
    
    this.metadata.updatedAt = new Date().toISOString();
  }
  
  // Complete a milestone
  completeMilestone(milestoneId) {
    const milestone = this.progress.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      milestone.completed = true;
      milestone.completedDate = new Date().toISOString();
      this.metadata.updatedAt = new Date().toISOString();
    }
  }
  
  // Extend training duration
  extendTraining(newEndDate, reason) {
    this.duration.endDate = newEndDate;
    this.duration.extended = true;
    this.duration.extensionReason = reason;
    this.metadata.updatedAt = new Date().toISOString();
  }
  
  // Mark as completed
  completeTraining() {
    this.metadata.status = 'completed';
    this.metadata.completedAt = new Date().toISOString();
    this.updateProgress(100, 'Training completed');
  }
}