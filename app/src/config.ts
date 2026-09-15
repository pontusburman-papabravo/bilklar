function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  get port() {
    return Number(env("PORT", "3000"));
  },
  get databaseUrl() {
    return env(
      "DATABASE_URL",
      "postgresql://bilklar:bilklar@localhost:54329/bilklar_test",
    );
  },
  get sessionSecret() {
    return env("SESSION_SECRET", "dev-session-secret-change-in-production");
  },
  sessionCookieName: "bilklar_session",
  invitationExpiryDays: 7,
  get appBaseUrl() {
    return env("APP_BASE_URL", "http://localhost:3000");
  },
};
