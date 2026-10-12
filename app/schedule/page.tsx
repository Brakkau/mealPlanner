"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Mail,
  Calendar,
  Users,
  Utensils,
  Sparkles,
  Star,
  Activity,
  Loader2,
  Trash2,
  Send
} from "lucide-react";
import {
  DEFAULT_AI_TYPE,
  MEAL_TYPE_OPTIONS,
  getAllowedFocuses,
  isFavouritesType
} from "@/lib/meal-types";
import {
  DEFAULT_TIME_ZONE,
  WEEKDAY_LABELS,
  formatWeekdayTime
} from "@/lib/schedule-time";

type ScheduleRecord = {
  id: string;
  email: string;
  weekday: number;
  timeLocal: string;
  timeZone: string;
  enabled: boolean;
  people: number;
  days: number;
  type: string;
  focus: string | null;
  useFavourites: boolean;
  fillRemainingWithAi: boolean;
  cholesterolFriendly: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  lastError: string | null;
};

const TIME_ZONES = ["Europe/London", "Europe/Dublin", "UTC"];

export default function SchedulePage() {
  const [email, setEmail] = useState("");
  const [weekday, setWeekday] = useState(0);
  const [timeLocal, setTimeLocal] = useState("18:00");
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
  const [people, setPeople] = useState(4);
  const [days, setDays] = useState(7);
  const [mealType, setMealType] = useState(DEFAULT_AI_TYPE);
  const [weeklyFocus, setWeeklyFocus] = useState("");
  const [useFavourites, setUseFavourites] = useState(false);
  const [cholesterolFriendly, setCholesterolFriendly] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const favouritesOnly = isFavouritesType(mealType);
  const focusPrimary = favouritesOnly ? DEFAULT_AI_TYPE : mealType;
  const allowedFocuses = getAllowedFocuses(focusPrimary);

  const loadSchedules = useCallback(async () => {
    try {
      const response = await fetch("/api/schedules");
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to load schedules"
        );
      }
      if (data && typeof data === "object" && "schedules" in data && Array.isArray(data.schedules)) {
        setSchedules(data.schedules as ScheduleRecord[]);
      }
      if (data && typeof data === "object" && "emailConfigured" in data) {
        setEmailConfigured(Boolean(data.emailConfigured));
      }
      setError(null);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load schedules");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          weekday,
          timeLocal,
          timeZone,
          people,
          days,
          type: mealType,
          focus: weeklyFocus || null,
          useFavourites: favouritesOnly ? false : useFavourites,
          fillRemainingWithAi: true,
          cholesterolFriendly
        })
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to create schedule"
        );
      }
      await loadSchedules();
    } catch (err) {
      console.error("Error:", err);
      alert(err instanceof Error ? err.message : "Failed to create schedule");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (schedule: ScheduleRecord) => {
    try {
      const response = await fetch(`/api/schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !schedule.enabled })
      });
      if (!response.ok) throw new Error("Failed to update schedule");
      await loadSchedules();
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to update schedule");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete schedule");
      await loadSchedules();
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to delete schedule");
    }
  };

  const handleSendNow = async (id: string) => {
    setSendingId(id);
    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-now" })
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to send"
        );
      }
      alert("Email sent. Check your inbox for the meal plan and shopping list.");
      await loadSchedules();
    } catch (err) {
      console.error("Error:", err);
      alert(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
          <Clock className="text-green-600" size={32} />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Weekly schedule</h1>
        <p className="text-gray-500">
          Email a meal plan link and shopping list at the time you choose.
        </p>
      </div>

      {!emailConfigured && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3 mb-6">
          Email is not configured yet. Set <code>SMTP_HOST</code>, <code>SMTP_USER</code>,
          <code>SMTP_PASS</code>, <code>EMAIL_FROM</code>, and <code>APP_BASE_URL</code> so
          scheduled sends can go out.
        </p>
      )}

      <div className="card space-y-6 mb-8">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Mail size={18} className="text-green-600" />
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="select-field"
            placeholder="you@example.com"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar size={18} className="text-green-600" />
              Day
            </label>
            <select
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              className="select-field"
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Time</label>
            <input
              type="time"
              value={timeLocal}
              onChange={(e) => setTimeLocal(e.target.value)}
              className="select-field"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Time zone</label>
          <select
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            className="select-field"
          >
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Users size={18} className="text-green-600" />
            Number of People
          </label>
          <select
            value={people}
            onChange={(e) => setPeople(Number(e.target.value))}
            className="select-field"
          >
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i === 0 ? "person" : "people"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar size={18} className="text-green-600" />
            Number of Days
          </label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="select-field"
          >
            {[...Array(14)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i === 0 ? "day" : "days"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Utensils size={18} className="text-green-600" />
            Type of Meals
          </label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="select-field"
          >
            {MEAL_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Sparkles size={18} className="text-green-600" />
            This week&apos;s focus
          </label>
          <select
            value={weeklyFocus}
            onChange={(e) => setWeeklyFocus(e.target.value)}
            className="select-field"
          >
            <option value="">None</option>
            {allowedFocuses.map((focus) => (
              <option key={focus} value={focus}>
                {focus}
              </option>
            ))}
          </select>
        </div>

        {!favouritesOnly && (
          <label className="flex items-center gap-3 p-4 bg-green-50 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={useFavourites}
              onChange={(e) => setUseFavourites(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div className="flex items-center gap-2">
              <Star size={18} className="text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                Use favourited meals when possible
              </span>
            </div>
          </label>
        )}

        <label className="flex items-start gap-3 p-4 bg-green-50 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={cholesterolFriendly}
            onChange={(e) => setCholesterolFriendly(e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <div>
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-green-600" />
              <span className="text-sm font-medium text-gray-700">Cholesterol meals</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Generated meals favour foods that help lower cholesterol and avoid those that raise it.
            </p>
          </div>
        </label>

        <button
          onClick={handleCreate}
          disabled={isSaving}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-70"
        >
          {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Clock size={20} />}
          Save schedule
        </button>
      </div>

      {isLoading && <p className="text-sm text-center text-gray-500">Loading schedules...</p>}
      {error && <p className="text-sm text-center text-red-600">{error}</p>}

      <div className="space-y-4">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{schedule.email}</p>
                <p className="text-sm text-gray-500">
                  {formatWeekdayTime(schedule.weekday, schedule.timeLocal, schedule.timeZone)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {schedule.days} days · {schedule.people} people · {schedule.type}
                  {schedule.focus ? ` · ${schedule.focus}` : ""}
                  {schedule.cholesterolFriendly ? " · Cholesterol" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(schedule.id)}
                className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500"
                aria-label="Delete schedule"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Next send: {new Date(schedule.nextRunAt).toLocaleString("en-GB")}
              {schedule.lastError ? ` · Last error: ${schedule.lastError}` : ""}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleToggle(schedule)}
                className="btn-secondary flex-1"
              >
                {schedule.enabled ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => handleSendNow(schedule.id)}
                disabled={sendingId === schedule.id}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {sendingId === schedule.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                Send now
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-green-700 font-medium">
          Back to generator
        </Link>
      </div>
    </div>
  );
}
