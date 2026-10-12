import {
  aggregateIngredients,
  formatShoppingItemLabel,
  groupShoppingItems,
  shoppingCategoryNames
} from "@/lib/shopping-list";
import { sendSmtpMail } from "@/lib/smtp";
import type { MealPlan } from "@/lib/types";

export function getAppBaseUrl(): string {
  const fromEnv = process.env.APP_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3002";
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      process.env.EMAIL_FROM?.trim()
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildScheduleEmail(params: {
  mealPlan: MealPlan;
  planUrl: string;
}): { subject: string; html: string; text: string } {
  const { mealPlan, planUrl } = params;
  const shopping = aggregateIngredients(mealPlan, mealPlan.people);
  const grouped = groupShoppingItems(shopping);
  const mealLines = (mealPlan.meals ?? []).map(
    (meal) => `Day ${meal.dayNumber}: ${meal.recipe?.title ?? "Untitled"}`
  );
  const shoppingLines = shopping.map((item) => formatShoppingItemLabel(item));

  const shoppingHtml = shoppingCategoryNames(grouped)
    .map((category) => {
      const heading =
        category === "Condiments" ? "Condiments (check the cupboard)" : category;
      const items = grouped[category]
        .map((item) => `<li>${escapeHtml(formatShoppingItemLabel(item))}</li>`)
        .join("");
      return `<h3 style="margin:16px 0 8px;">${escapeHtml(heading)}</h3><ul style="margin:0;padding-left:20px;">${items}</ul>`;
    })
    .join("");

  const mealsHtml = (mealPlan.meals ?? [])
    .map(
      (meal) =>
        `<li><strong>Day ${meal.dayNumber}:</strong> ${escapeHtml(meal.recipe?.title ?? "Untitled")}</li>`
    )
    .join("");

  const subject = `Your ${mealPlan.days}-day ${mealPlan.type} meal plan`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;max-width:640px;">
      <h1 style="font-size:22px;">Your meal plan is ready</h1>
      <p>${escapeHtml(String(mealPlan.days))} days · ${escapeHtml(String(mealPlan.people))} people · ${escapeHtml(mealPlan.type)}</p>
      <p><a href="${escapeHtml(planUrl)}" style="display:inline-block;background:#22c55e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Open meal plan</a></p>
      <h2 style="font-size:18px;">Meals</h2>
      <ol style="padding-left:20px;">${mealsHtml}</ol>
      <h2 style="font-size:18px;">Shopping list</h2>
      ${shoppingHtml || "<p>No ingredients found.</p>"}
      <p style="margin-top:24px;color:#666;font-size:12px;">Open the link above in Meal Planner to save this as your current plan.</p>
    </div>
  `.trim();

  const text = [
    "Your meal plan is ready",
    `${mealPlan.days} days · ${mealPlan.people} people · ${mealPlan.type}`,
    `Open: ${planUrl}`,
    "",
    "Meals",
    ...mealLines,
    "",
    "Shopping list",
    ...shoppingLines
  ].join("\n");

  return { subject, html, text };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const port = Number(process.env.SMTP_PORT || 465);

  if (!host || !user || !pass || !from) {
    throw new Error("Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM.");
  }

  try {
    await sendSmtpMail({
      config: {
        host,
        port: Number.isFinite(port) && port > 0 ? port : 465,
        user,
        pass
      },
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP error";
    throw new Error(`Email send failed: ${message}`);
  }
}
