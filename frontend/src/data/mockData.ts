/**
 * mockData.ts
 *
 * Shared TypeScript interfaces used across the app.
 * Static mock data has been removed — all data now comes from the backend API.
 *
 * Static chart fallback data (weeklyTrends, monthlyPredictions) is kept
 * for the Dashboard and Predictions chart visuals until real time-series
 * endpoints are added to the backend.
 */

export interface Patient {
  id: string;
  fullName: string;
  age: number;
  gender: "M" | "F";
  attendanceScore: number;
}

export interface Doctor {
  id: string;
  fullName: string;
  email: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  smsReceived: boolean;
  status: "pending" | "done" | "canceled";
  showedUp?: boolean | null;
  wasLate?: boolean | null;
  prediction: {
    label: "Show" | "No-show";
    probability: number; // 0–100 integer
  };
}

// ── Static chart data (visual decoration, not from backend) ───────────────────
// Used in Dashboard weekly bar chart and line chart
export const weeklyTrends = [
  { day: "Mon", showRate: 78, noShowRate: 22, appointments: 12 },
  { day: "Tue", showRate: 82, noShowRate: 18, appointments: 15 },
  { day: "Wed", showRate: 75, noShowRate: 25, appointments: 10 },
  { day: "Thu", showRate: 88, noShowRate: 12, appointments: 14 },
  { day: "Fri", showRate: 70, noShowRate: 30, appointments: 18 },
];

// Used in Predictions monthly bar chart and accuracy trend line
export const monthlyPredictions = [
  { month: "Sep", accurate: 42, inaccurate: 8 },
  { month: "Oct", accurate: 48, inaccurate: 7 },
  { month: "Nov", accurate: 51, inaccurate: 9 },
  { month: "Dec", accurate: 45, inaccurate: 5 },
  { month: "Jan", accurate: 55, inaccurate: 6 },
  { month: "Feb", accurate: 38, inaccurate: 4 },
];
