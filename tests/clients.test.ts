import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testDb, closeDb, seedWorld, ctxFor, type World } from "./helpers/db";
import type { Db } from "@/server/db/connection";
import { createClient, updateClientSettings } from "@/server/services/clients";
import { slugify } from "@/lib/format";
import { ConflictError } from "@/server/shared/errors";

let db: Db;
let world: World;

beforeAll(async () => {
  db = await testDb();
  world = await seedWorld(db);
});
afterAll(async () => closeDb(db));

const base = { industry: "", locale: "he" as const, surveyContact: "", primaryColor: "", logoText: "" };

describe("client creation", () => {
  it("normalises identifiers instead of rejecting them", () => {
    expect(slugify("Gamma Industries ")).toBe("gamma-industries");
    expect(slugify("גמא תעשיות")).toBe("gma-tashyvt");
    expect(slugify("  ACME_ltd!! ")).toBe("acme-ltd");
    expect(slugify("!!!")).toBe("");
  });

  it("accepts a Hebrew name with an empty, Hebrew or mixed-case identifier", async () => {
    const ctx = ctxFor(db, world.superAdmin);
    const derived = await createClient(ctx, { ...base, name: "דלתא שירותים", slug: "" });
    expect(derived.slug).toBe("dlta-shyrvtym");
    const typedHebrew = await createClient(ctx, { ...base, name: "אפסילון", slug: "אפסילון" });
    expect(typedHebrew.slug).toBe("apsylvn");
    const mixed = await createClient(ctx, { ...base, name: "Zeta Bank", slug: "Zeta Bank" });
    expect(mixed.slug).toBe("zeta-bank");
    // a derived identifier that already exists receives a suffix
    const again = await createClient(ctx, { ...base, name: "דלתא שירותים", slug: "" });
    expect(again.slug).toBe("dlta-shyrvtym-2");
    // a name with no usable letters still gets an identifier
    const symbols = await createClient(ctx, { ...base, name: "!!", slug: "" });
    expect(symbols.slug).toMatch(/^client-\d+$/);
  });

  it("reports an explicitly chosen identifier that is already in use", async () => {
    const ctx = ctxFor(db, world.superAdmin);
    await expect(createClient(ctx, { ...base, name: "Other Zeta", slug: "zeta-bank" })).rejects.toBeInstanceOf(ConflictError);
    const other = await createClient(ctx, { ...base, name: "Eta", slug: "eta" });
    await expect(
      updateClientSettings(ctx, other.id, { ...base, name: "Eta", slug: "zeta-bank", departments: [], roleFamilies: [], seniorityGroups: [], locations: [], allowClientInvites: false }),
    ).rejects.toBeInstanceOf(ConflictError);
    const renamed = await updateClientSettings(ctx, other.id, { ...base, name: "Eta", slug: "Eta Group", departments: [], roleFamilies: [], seniorityGroups: [], locations: [], allowClientInvites: false });
    expect(renamed.slug).toBe("eta-group");
  });
});
