import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    supabaseUrl: string;
    publishableKey: string;
    secretKey: string;
  }
}

/** A helyi Supabase címét és kulcsait a CLI-ből olvassa ki, és átadja a teszteknek. */
export default function setup(project: TestProject) {
  let raw: string;
  try {
    raw = execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    throw new Error("A helyi Supabase nem fut. Indítsd el: npm run db:start");
  }

  const status = JSON.parse(raw.slice(raw.indexOf("{"))) as Record<string, string>;
  const pick = (...keys: string[]) => {
    const value = keys.map((k) => status[k]).find(Boolean);
    if (!value) throw new Error(`Hiányzik a supabase status kimenetéből: ${keys.join(" / ")}`);
    return value;
  };

  project.provide("supabaseUrl", pick("API_URL"));
  project.provide("publishableKey", pick("PUBLISHABLE_KEY", "ANON_KEY"));
  project.provide("secretKey", pick("SECRET_KEY", "SERVICE_ROLE_KEY"));
}
