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
    secret: (process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length >= 32)
        ? process.env.BETTER_AUTH_SECRET
        : "4s9d8f7g6h5j4k3l2m1n0b9v8c7x6z5a4s3d2f1g0h9j8k7l6m5n4b3v2c1x0z",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

console.log("BETTER_AUTH_SECRET length:", auth.options.secret?.length);
console.log("BETTER_AUTH_URL:", auth.options.baseURL);
