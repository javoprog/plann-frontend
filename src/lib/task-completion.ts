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
    isCompleted:
      subtasks.length > 0 && subtasks.every((subtask) => subtask.isCompleted),
  };
}

export function withAddedSubtask(task: Task, subtask: Subtask): Task {
  return {
    ...task,
    isCompleted: false,
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
    isCompleted:
      subtasks.length > 0
        ? subtasks.every((subtask) => subtask.isCompleted)
        : task.isCompleted,
  };
}
