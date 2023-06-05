import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    runtimeEnv: process.env,
    server: {
        DATABASE_URL: z.string().url(),
        SLACK_BOT_TOKEN: z.string(),
        SLACK_SIGNING_SECRET: z.string(),
        SLACK_CHANNEL: z.string(),
    }
});
