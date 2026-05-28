"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "enabled-integrations";

export const INTEGRATION_META: Record<string, { name: string; logo: string }> = {
  calendly:        { name: "Calendly",        logo: "https://cdn.simpleicons.org/calendly/006BFF"        },
  clickup:         { name: "ClickUp",         logo: "https://cdn.simpleicons.org/clickup/7B68EE"         },
  discord:         { name: "Discord",         logo: "https://cdn.simpleicons.org/discord/5865F2"         },
  github:          { name: "GitHub",          logo: "https://cdn.simpleicons.org/github/181717"          },
  gmail:           { name: "Gmail",           logo: "https://cdn.simpleicons.org/gmail/EA4335"           },
  "google-calendar":{ name: "Google Calendar",logo: "https://cdn.simpleicons.org/googlecalendar/4285F4" },
  "google-drive":  { name: "Google Drive",   logo: "https://cdn.simpleicons.org/googledrive/4285F4"     },
  "google-tasks":  { name: "Google Tasks",   logo: "https://cdn.simpleicons.org/googletasks/0B8043"     },
  notion:          { name: "Notion",          logo: "https://cdn.simpleicons.org/notion/000000"          },
  outlook:         { name: "Outlook",         logo: "https://cdn.simpleicons.org/microsoftoutlook/0078D4"},
  perplexity:      { name: "Perplexity AI",   logo: "https://cdn.simpleicons.org/perplexity/1FB8CD"      },
  slack:           { name: "Slack",           logo: "https://cdn.simpleicons.org/slack/4A154B"           },
  spotify:         { name: "Spotify",         logo: "https://cdn.simpleicons.org/spotify/1DB954"         },
  twitter:         { name: "Twitter (X)",     logo: "https://cdn.simpleicons.org/x/000000"               },
  youtube:         { name: "YouTube",         logo: "https://cdn.simpleicons.org/youtube/FF0000"         },
};

export function useEnabledIntegrations() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      setEnabled(new Set(saved));
    } catch {
      setEnabled(new Set());
    }
    setHydrated(true);
  }, []);

  const toggle = useCallback((id: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isEnabled = useCallback((id: string) => enabled.has(id), [enabled]);

  /** Enabled tools with their metadata, in insertion order */
  const enabledList = [...enabled]
    .map(id => INTEGRATION_META[id] ? { id, ...INTEGRATION_META[id] } : null)
    .filter(Boolean) as { id: string; name: string; logo: string }[];

  return { enabled, enabledList, toggle, isEnabled, hydrated };
}
