// utils/notificationUtils.js

/**
 * Normalizes user role string to standard uppercase format.
 */
export const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const map = {
    head_office: "ADMIN",
    admin_panel: "ADMIN",
    admin: "ADMIN",
    super_admin: "ADMIN",
    zsm: "PROJECT_HEAD",
    project_head: "PROJECT_HEAD",
    manager: "MANAGER",
    incharge: "SUPERVISOR",
    supervisor: "SUPERVISOR",
    team: "INSTALLER",
    installer: "INSTALLER",
  };
  return map[value] || role;
};

/**
 * Checks if the user or role represents an Admin / Head Office account.
 */
export const isAdminUser = (userOrRole) => {
  let role = "";
  if (typeof userOrRole === "string") {
    role = userOrRole;
  } else if (userOrRole && typeof userOrRole === "object") {
    role = userOrRole.role || "";
  }

  // Fallback to localStorage if no role was passed
  if (!role && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        role = parsed?.role || "";
      }
    } catch {
      // ignore JSON parse error
    }
  }

  const normalized = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (
    normalized === "admin" ||
    normalized === "admin_panel" ||
    normalized === "head_office" ||
    normalized === "super_admin" ||
    normalized.includes("admin")
  );
};

/**
 * Checks whether a notification is an automated punch-in reminder or personal absent notice
 * intended for employees, which should not be shown to Administrators.
 */
export const isSelfPunchInOrAbsentNotification = (notification) => {
  if (!notification) return false;

  const title = String(notification.title || "").toLowerCase();
  const message = String(notification.message || "").toLowerCase();
  const type = String(notification.type || "").toLowerCase();
  const text = `${title} ${message} ${type}`;

  // 1. Direct Punch-In Reminders (e.g. "Punch-In Required!", "Final Punch-In Reminder!")
  const isPunchInReminder =
    text.includes("punch-in required") ||
    text.includes("punch in required") ||
    text.includes("punch-in reminder") ||
    text.includes("punch in reminder") ||
    text.includes("final punch-in") ||
    text.includes("final punch in") ||
    text.includes("please punch in immediately") ||
    text.includes("please punch in") ||
    (text.includes("standard punch-in") && (text.includes("detected") || text.includes("absent") || text.includes("immediately"))) ||
    (text.includes("standard punch in") && (text.includes("detected") || text.includes("absent") || text.includes("immediately")));

  // 2. Automated "Marked as Absent" for not punching in
  const isAutoAbsentNotice =
    (text.includes("marked as absent") || text.includes("marked absent")) &&
    (text.includes("no punch-in was detected") ||
      text.includes("no punch in was detected") ||
      text.includes("no punch-in detected") ||
      text.includes("no punch in detected") ||
      text.includes("3 reminders") ||
      text.includes("reminders") ||
      text.includes("you have been marked absent") ||
      text.includes("you will be marked absent"));

  // 3. Second-person absence warnings directed at current user
  const isPersonalAbsence =
    text.includes("you have been marked absent") ||
    text.includes("you will be marked absent") ||
    text.includes("you are marked absent");

  return isPunchInReminder || isAutoAbsentNotice || isPersonalAbsence;
};

/**
 * Returns true if this notification should be hidden for the given user.
 * Administrators do not punch in and should never receive punch-in/absent reminders.
 * However, Admins CAN and SHOULD see notifications about other employees (e.g. location turned off,
 * project assignments, employee check-ins, user logouts, lead assignments).
 */
export const shouldHideNotificationForUser = (notification, userOrRole) => {
  if (!notification) return false;

  // If user is Admin, hide any personal punch-in or automated absent reminders
  if (isAdminUser(userOrRole)) {
    return isSelfPunchInOrAbsentNotification(notification);
  }

  return false;
};

/**
 * Filters out unwanted notifications for the current user.
 */
export const filterNotificationsForUser = (notificationsList, userOrRole) => {
  if (!Array.isArray(notificationsList)) return [];
  return notificationsList.filter((item) => !shouldHideNotificationForUser(item, userOrRole));
};

/**
 * Silently marks hidden punch-in notifications as read on the backend
 * so they don't linger as unread in database counters or cause ghost unread badges.
 */
export const silentlyMarkHiddenNotificationsAsRead = (
  rawNotificationsList,
  userOrRole,
  apiBaseUrl,
  token
) => {
  if (!Array.isArray(rawNotificationsList) || !token || !isAdminUser(userOrRole)) {
    return;
  }

  const hiddenUnreadItems = rawNotificationsList.filter(
    (item) => !item.read && isSelfPunchInOrAbsentNotification(item)
  );

  if (hiddenUnreadItems.length === 0) return;

  hiddenUnreadItems.forEach((item) => {
    const id = item._id || item.id;
    if (!id) return;
    fetch(`${apiBaseUrl}/notifications/${id}/read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {
      // Silent failure, no interruption to UI
    });
  });
};

