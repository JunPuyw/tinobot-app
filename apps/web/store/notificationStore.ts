import { create } from "zustand";

interface NotificationState {
  notifications: any[];
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  remove: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  success: (message) => {
    console.log("Success:", message);
  },
  warning: (message) => {
    console.warn("Warning:", message);
  },
  error: (message) => {
    console.error("Error:", message);
  },
  info: (message) => {
    console.log("Info:", message);
  },
  remove: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));
