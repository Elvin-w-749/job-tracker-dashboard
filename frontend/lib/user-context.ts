const USER_ID_KEY = "job_dashboard_user_id";
const USER_NAME_KEY = "job_dashboard_user_name";
const USER_LIST_KEY = "job_dashboard_user_list";

export interface UserInfo {
  id: string;
  name: string;
}

export function getCurrentUserId(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(USER_ID_KEY) || "default";
}

export function getCurrentUserName(): string {
  if (typeof window === "undefined") return "默认用户";
  return localStorage.getItem(USER_NAME_KEY) || "默认用户";
}

export function setCurrentUser(userId: string, userName: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(USER_NAME_KEY, userName);

  const users = getAllUsers();
  const exists = users.find((u) => u.id === userId);
  if (!exists) {
    users.push({ id: userId, name: userName });
    localStorage.setItem(USER_LIST_KEY, JSON.stringify(users));
  }
}

export function generateUserId(): string {
  return "user_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
}

export function getAllUsers(): UserInfo[] {
  if (typeof window === "undefined") return [{ id: "default", name: "默认用户" }];

  const raw = localStorage.getItem(USER_LIST_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as UserInfo[];
      const hasDefault = parsed.some((u) => u.id === "default");
      if (!hasDefault) {
        parsed.unshift({ id: "default", name: "默认用户" });
      }
      return parsed;
    } catch {
      // ignore
    }
  }

  return [{ id: "default", name: "默认用户" }];
}

export function addUser(name: string): UserInfo {
  const id = generateUserId();
  const user: UserInfo = { id, name: name || "新用户" };

  const users = getAllUsers();
  users.push(user);
  localStorage.setItem(USER_LIST_KEY, JSON.stringify(users));

  return user;
}

export function deleteUser(userId: string): void {
  if (userId === "default") return;

  const users = getAllUsers().filter((u) => u.id !== userId);
  localStorage.setItem(USER_LIST_KEY, JSON.stringify(users));

  const currentId = getCurrentUserId();
  if (currentId === userId) {
    localStorage.setItem(USER_ID_KEY, "default");
    localStorage.setItem(USER_NAME_KEY, "默认用户");
  }
}

export function switchUser(userId: string): void {
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (user) {
    localStorage.setItem(USER_ID_KEY, user.id);
    localStorage.setItem(USER_NAME_KEY, user.name);
  }
}

export function getUserHeaders(): Record<string, string> {
  return {
    "X-User-ID": getCurrentUserId(),
  };
}
