import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

function hasPusherEnv() {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_KEY &&
      process.env.PUSHER_SECRET &&
      process.env.PUSHER_CLUSTER
  );
}

export function getPusherServer() {
  if (!hasPusherEnv()) return null;
  if (pusherInstance) return pusherInstance;

  pusherInstance = new Pusher({
    appId: process.env.PUSHER_APP_ID as string,
    key: process.env.PUSHER_KEY as string,
    secret: process.env.PUSHER_SECRET as string,
    cluster: process.env.PUSHER_CLUSTER as string,
    useTLS: true,
  });

  return pusherInstance;
}

