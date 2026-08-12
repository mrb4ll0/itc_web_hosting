export type AppRole = "student" | "company" | "authority";

export interface AccountProfile {
  id: string;
  role: AppRole;
  name: string;
  email: string;
  username?: string;
  imageUrl?: string;
  state?: string;
  platformRegistrationId?: string;
  isActive: boolean;
  isApproved: boolean;
  isBlocked: boolean;
  isSuspended: boolean;
}

export interface Internship {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  title: string;
  description: string;
  industry: string;
  course: string;
  state: string;
  lga: string;
  address: string;
  duration: string;
  stipend?: number;
  paid: boolean;
  status: string;
  removed: boolean;
  postedAt: number;
}

export interface ApplicationRecord {
  id: string;
  internshipId: string;
  companyId: string;
  title: string;
  companyName: string;
  status: string;
  description: string;
  submittedAt: number;
  documents: Array<{ name: string; url: string; kind: string }>;
  location: string;
  startDate: string;
  endDate: string;
  selectedDuration: string;
  removed: boolean;
  cancelled: boolean;
  authorityStatus: string;
  authorityLetterUrl: string;
  paymentStatus: string;
  refundStatus: string;
  statusHistory: Array<{ status: string; date: number; note: string }>;
  trainingStatus: string;
  trainingProgress: number;
  certificateUrl: string;
  trainingUpdates: Array<{ title: string; date: number; note: string }>;
}

export interface WorkspaceAction {
  id: string;
  label: string;
  description: string;
  icon: string;
}
