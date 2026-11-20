'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { studentOnlineClassKeys } from './api';

/**
 * Hook to subscribe to the real-time online classroom feed via WebSocket.
 * Automatically invalidates queries when classes are created, started, ended, or modified,
 * displaying newly created or started classes to students instantly with zero page reloads.
 */
export function useOnlineClassroomFeed() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (typeof window === 'undefined') return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const clientId = `student-dashboard-feed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const wsUrl = `${protocol}//${window.location.hostname}:8000/api/v1/online-classes/feed/ws?client_id=${clientId}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          // Send periodic ping to keep connection healthy
          const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            } else {
              clearInterval(pingInterval);
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (
              data.type === 'CLASS_CREATED' ||
              data.type === 'CLASS_STARTED' ||
              data.type === 'CLASS_ENDED' ||
              data.type === 'CLASS_UPDATED' ||
              data.type === 'PERMISSIONS_UPDATED'
            ) {
              // Instantly refresh student classroom list and pre-join status
              queryClient.invalidateQueries({ queryKey: studentOnlineClassKeys.all });
            }
          } catch {
            // Ignore non-json messages like pong
          }
        };

        ws.onerror = () => {
          ws.close();
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
          }
        };
      } catch {
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [queryClient]);
}
