const AUTH_CHANNEL_NAME = 'auth_channel';

export type AuthMessage = {
  type: 'LOGOUT';
};

let channel: BroadcastChannel | null = null;

export function getAuthChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!channel && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  }
  return channel;
}

export function broadcastLogout() {
  const ch = getAuthChannel();
  if (ch) {
    ch.postMessage({ type: 'LOGOUT' });
  }
}

