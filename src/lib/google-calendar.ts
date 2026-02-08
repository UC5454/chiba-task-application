import { google } from "googleapis";

import type { CalendarEvent } from "@/types";

const getCalendarClient = (accessToken: string) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.calendar({ version: "v3", auth });
};

export const getTodayEvents = async (accessToken: string): Promise<CalendarEvent[]> => {
  const calendar = getCalendarClient(accessToken);

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const response = await calendar.events.list({
    calendarId: "primary",
    singleEvents: true,
    orderBy: "startTime",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    maxResults: 50,
  });

  return (response.data.items ?? []).map((event) => {
    const startValue = event.start?.dateTime ?? event.start?.date;
    const endValue = event.end?.dateTime ?? event.end?.date;

    return {
      id: event.id ?? "",
      title: event.summary ?? "（タイトルなし）",
      startTime: startValue ?? "",
      endTime: endValue ?? "",
      location: event.location ?? undefined,
      isAllDay: Boolean(event.start?.date && !event.start?.dateTime),
    };
  });
};
