import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        SLACK_TOKEN: process.env.SLACK_TOKEN,
    },
    server: {
        DATABASE_URL: z.string().url(),
        SLACK_TOKEN: z.string()
    }
})


export default env;