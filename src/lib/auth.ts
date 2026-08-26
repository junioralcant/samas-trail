import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "corrida_admin_session";

const getSecret = () => process.env.ADMIN_PASSWORD ?? "";

export const buildSessionToken = () =>
  createHmac("sha256", getSecret()).update("corrida-admin").digest("hex");

export const isAdminAuthenticated = async (): Promise<boolean> => {
  const secret = getSecret();
  if (!secret) {
    return false;
  }
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value === buildSessionToken();
};
