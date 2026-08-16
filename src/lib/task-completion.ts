import type { Subtask, Task } from "@/lib/types";

export function withTaskCompletion(task: Task, isCompleted: boolean): Task {
  return {
    ...task,
    isCompleted,
    subtasks: task.subtasks?.map((subtask) => ({
      ...subtask,
      isCompleted,
    })),
  };
}

export function withSubtaskCompletion(
  task: Task,
  subtaskId: string,
  isCompleted: boolean,
): Task {
  const subtasks = (task.subtasks ?? []).map((subtask) =>
    subtask.id === subtaskId ? { ...subtask, isCompleted } : subtask,
  );
  return {
    ...task,
    subtasks,
  };
}

export function withSubtaskTitle(
  task: Task,
  subtaskId: string,
  title: string,
): Task {
  return {
    ...task,
    subtasks: (task.subtasks ?? []).map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, title } : subtask,
    ),
  };
}

export function withAddedSubtask(task: Task, subtask: Subtask): Task {
  return {
    ...task,
    subtasks: [...(task.subtasks ?? []), subtask],
  };
}

export function withoutSubtask(task: Task, subtaskId: string): Task {
  const subtasks = (task.subtasks ?? []).filter(
    (subtask) => subtask.id !== subtaskId,
  );
  return {
    ...task,
    subtasks,
  };
}
