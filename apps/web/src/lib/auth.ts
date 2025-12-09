import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
    },
    secret: process.env.BETTER_AUTH_SECRET || "DO_NOT_USE_THIS_SECRET_IN_PRODUCTION_12345",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
