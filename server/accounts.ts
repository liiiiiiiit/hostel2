import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import type { Transaction } from "@libsql/client";
import type { AppStoreState } from "./domain.js";
import { createPasswordCredential, verifyPassword } from "./passwords.js";
const email = z.string().trim().toLowerCase().email().max(254),
  password = z.string().min(8).max(128),
  token = z.string().regex(/^[a-f0-9]{64}$/),
  lang = z.enum(["fa", "en", "ru", "hy"]);
export const accountSchemas = {
  requestPasswordRecovery: z.tuple([email, lang]),
  resetPassword: z.tuple([token, password]),
  requestEmailVerification: z.tuple([]),
  verifyEmail: z.tuple([token]),
  changePassword: z.tuple([password, password]),
  logoutAll: z.tuple([]),
  updateProfile: z.tuple([
    z.object({
      name: z.string().trim().min(1).max(200),
      phone: z.string().max(100),
      language: lang,
      emailNotifications: z.boolean(),
    }),
  ]),
};
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
async function queueToken(
  state: AppStoreState,
  tx: Transaction,
  userId: string,
  purpose: "password" | "email",
  language: string,
) {
  const user = state.users.find((u) => u.id === userId)!;
  const raw = randomBytes(32).toString("hex");
  const expires = Date.now() + (purpose === "password" ? 30 : 1440) * 60000;
  await tx.execute({
    sql: "UPDATE auth_tokens SET used_at=? WHERE user_id=? AND purpose=? AND used_at IS NULL",
    args: [Date.now(), userId, purpose],
  });
  await tx.execute({
    sql: "INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,?,?)",
    args: [digest(raw), userId, purpose, expires],
  });
  const base =
    process.env.APP_URL && /^https:\/\//.test(process.env.APP_URL)
      ? process.env.APP_URL.replace(/\/$/, "")
      : "";
  // No raw token is returned to browsers or written to application logs; only the email outbox holds the link.
  const subject =
    purpose === "password"
      ? {
          fa: "بازیابی رمز YEREVANHUB",
          en: "Reset your YEREVANHUB password",
          ru: "Сброс пароля YEREVANHUB",
          hy: "YEREVANHUB գաղտնաբառի վերականգնում",
        }
      : {
          fa: "تأیید ایمیل YEREVANHUB",
          en: "Verify your YEREVANHUB email",
          ru: "Подтвердите почту YEREVANHUB",
          hy: "Հաստատեք YEREVANHUB էլ. հասցեն",
        };
  // A missing public URL leaves the message unqueued rather than email an unusable link.
  if (base)
    await tx.execute({
      sql: "INSERT INTO outbox(id,channel,recipient,subject,text,created_at) VALUES(?,?,?,?,?,?)",
      args: [
        crypto.randomUUID(),
        "email",
        user.email,
        subject[language as "fa"],
        `${base}/#/account-action/${purpose}/${raw}\n${new Date(expires).toISOString()}`,
        Date.now(),
      ],
    });
}
export async function accountAction(
  state: AppStoreState,
  tx: Transaction,
  action: keyof typeof accountSchemas,
  args: unknown[],
) {
  if (action === "requestPasswordRecovery") {
    const user = state.users.find((u) => u.email === args[0] && u.isActive);
    if (user) await queueToken(state, tx, user.id, "password", String(args[1]));
    return { success: true };
  }
  if (action === "resetPassword" || action === "verifyEmail") {
    const purpose = action === "resetPassword" ? "password" : "email";
    const row = (
      await tx.execute({
        sql: "SELECT * FROM auth_tokens WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>?",
        args: [digest(String(args[0])), purpose, Date.now()],
      })
    ).rows[0];
    const user = state.users.find((u) => u.id === row?.user_id && u.isActive);
    if (!row || !user) throw new Error("پیوند نامعتبر است یا منقضی شده است.");
    if (action === "resetPassword") {
      state.credentials[user.id] = await createPasswordCredential(
        String(args[1]),
      );
      await tx.execute({
        sql: "DELETE FROM sessions WHERE user_id=?",
        args: [user.id],
      });
      await tx.execute({
        sql: "UPDATE auth_tokens SET used_at=? WHERE user_id=?",
        args: [Date.now(), user.id],
      });
      if (state.currentUser?.id === user.id) state.currentUser = null;
    } else {
      user.emailVerifiedAt = new Date().toISOString();
      await tx.execute({
        sql: "UPDATE auth_tokens SET used_at=? WHERE token_hash=?",
        args: [Date.now(), digest(String(args[0]))],
      });
      if (state.currentUser?.id === user.id) state.currentUser = user;
    }
    return { success: true };
  }
  const user = state.users.find(
    (u) => u.id === state.currentUser?.id && u.isActive,
  );
  if (!user) throw new Error("دسترسی مجاز نیست.");
  if (action === "requestEmailVerification") {
    if (!user.emailVerifiedAt)
      await queueToken(state, tx, user.id, "email", user.language ?? "fa");
    return { success: true };
  }
  if (action === "changePassword") {
    const credential = state.credentials[user.id];
    if (!credential || !(await verifyPassword(String(args[0]), credential)))
      throw new Error("رمز فعلی درست نیست.");
    state.credentials[user.id] = await createPasswordCredential(
      String(args[1]),
    );
    await tx.execute({
      sql: "DELETE FROM sessions WHERE user_id=?",
      args: [user.id],
    });
    await tx.execute({
      sql: "UPDATE auth_tokens SET used_at=? WHERE user_id=?",
      args: [Date.now(), user.id],
    });
    state.currentUser = null;
    return { success: true };
  }
  if (action === "logoutAll") {
    await tx.execute({
      sql: "DELETE FROM sessions WHERE user_id=?",
      args: [user.id],
    });
    state.currentUser = null;
    return { success: true };
  }
  if (action === "updateProfile") {
    Object.assign(user, args[0]);
    state.currentUser = user;
    return { success: true };
  }
  return { success: false };
}
