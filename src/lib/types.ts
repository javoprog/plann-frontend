export type GoalStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type HabitFrequency = "DAILY" | "WEEKDAYS" | "WEEKENDS";
export type ThemePreference = "system" | "light" | "dark";
export type Language = "en" | "ru" | "uz";

export interface User {
  id: string;
  name: string;
  email: string;
  theme: ThemePreference;
  language: Language;
  xp: number;
  level: number;
  globalStreak: number;
  xpToNextLevel: number;
  telegramChatId: string | null;
  telegramNotifications: boolean;
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
  subtasks?: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  taskId: string;
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

export interface HabitLog {
  id?: string;
  habitId: string;
  date: string;
  completed: boolean;
  createdAt?: string;
}

export interface Habit {
  id: string;
  title: string;
  description?: string | null;
  frequency: HabitFrequency;
  goalId?: string | null;
  goal?: { id: string; title: string } | null;
  categoryId?: string | null;
  category?: Category | null;
  logs: HabitLog[];
  currentStreak: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResults {
  goals: Goal[];
  tasks: Task[];
  habits: Habit[];
}
