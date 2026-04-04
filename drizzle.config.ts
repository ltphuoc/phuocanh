const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54330/postgres";

interface DrizzleConfig {
  readonly dbCredentials: {
    readonly url: string;
  };
  readonly dialect: "postgresql";
  readonly out: string;
  readonly schema: string;
  readonly strict: boolean;
  readonly verbose: boolean;
}

const drizzleConfig: DrizzleConfig = {
  dbCredentials: {
    url: databaseUrl,
  },
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  strict: true,
  verbose: true,
};

export default drizzleConfig;
