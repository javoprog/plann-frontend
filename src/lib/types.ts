export type GoalStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  userId: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  isCompleted: boolean;
  priority: Priority;
  dueDate?: string | null;
  goalId?: string | null;
  goal?: {
    id: string;
    title: string;
    category?: Category | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  status: GoalStatus;
  categoryId?: string | null;
  category?: Category | null;
  tasks?: Task[];
  totalTasks: number;
  completedTasks: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
