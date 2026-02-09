import webpush, { type PushSubscription } from "web-push";

const vapidSubject = process.env.WEB_PUSH_SUBJECT;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

let configured = false;

const ensureVapid = () => {
  if (configured) return true;

  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    return false;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  configured = true;
  return true;
};

export const sendPushNotification = async (subscription: PushSubscription, message: string) => {
  if (!ensureVapid()) {
    return { sent: false, reason: "vapid_not_configured" as const };
  }

  await webpush.sendNotification(
    subscription,
    JSON.stringify({
      title: "SOU Task",
      body: message,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      data: { url: "/tasks" },
    }),
  );

  return { sent: true as const };
};
