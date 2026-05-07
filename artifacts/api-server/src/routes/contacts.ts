import { Router } from "express";
import { db } from "@workspace/db";
import {
  contactsTable,
} from "@workspace/db";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

router.get("/contacts", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const { stage, industry, city, search, page = "1", limit = "25" } = req.query as Record<string, string>;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const offset = (pageNum - 1) * limitNum;

  let whereClause = eq(contactsTable.orgId, orgId);

  const contacts = await db
    .select()
    .from(contactsTable)
    .where(whereClause)
    .limit(limitNum)
    .offset(offset)
    .orderBy(contactsTable.createdAt);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contactsTable)
    .where(whereClause);

  res.json({ contacts, total: Number(count), page: pageNum, limit: limitNum });
});

router.post("/contacts", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const { email, firstName, lastName, jobTitle, companyName, companySize, industry, city, website, phone, linkedinUrl, notes, tags, optedIn } = req.body;

  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const [contact] = await db
    .insert(contactsTable)
    .values({
      orgId,
      email,
      firstName,
      lastName,
      jobTitle,
      companyName,
      companySize,
      industry,
      city,
      website,
      phone,
      linkedinUrl,
      notes,
      tags: tags ?? [],
      optedIn: optedIn ?? false,
    })
    .returning();

  res.status(201).json(contact);
});

router.post("/contacts/import", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const { rows, fieldMap, duplicateAction = "skip" } = req.body as {
    rows: Record<string, string>[];
    fieldMap: Record<string, string>;
    duplicateAction?: string;
  };

  if (!rows || !fieldMap) {
    res.status(400).json({ error: "rows and fieldMap are required" });
    return;
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const errorRows: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const mapped: Record<string, string> = {};
    for (const [csvCol, dbField] of Object.entries(fieldMap)) {
      if (raw[csvCol] !== undefined) mapped[dbField] = raw[csvCol];
    }

    if (!mapped.email) {
      errors++;
      errorRows.push({ row: i + 1, reason: "missing email" });
      continue;
    }

    try {
      await db
        .insert(contactsTable)
        .values({
          orgId,
          email: mapped.email,
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          jobTitle: mapped.jobTitle,
          companyName: mapped.companyName,
          industry: mapped.industry,
          city: mapped.city,
          tags: [],
        })
        .onConflictDoNothing();
      imported++;
    } catch {
      errors++;
      errorRows.push({ row: i + 1, reason: "database error" });
    }
  }

  res.json({ imported, skipped, errors, errorRows });
});

router.get("/contacts/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [contact] = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.orgId, orgId)));

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.json(contact);
});

router.patch("/contacts/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const { email, firstName, lastName, jobTitle, companyName, companySize, industry, city, website, phone, linkedinUrl, stage, leadScore, notes, tags, optedIn, optedOut } = req.body;

  const updates: Record<string, unknown> = {};
  if (email !== undefined) updates.email = email;
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (jobTitle !== undefined) updates.jobTitle = jobTitle;
  if (companyName !== undefined) updates.companyName = companyName;
  if (companySize !== undefined) updates.companySize = companySize;
  if (industry !== undefined) updates.industry = industry;
  if (city !== undefined) updates.city = city;
  if (website !== undefined) updates.website = website;
  if (phone !== undefined) updates.phone = phone;
  if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl;
  if (stage !== undefined) updates.stage = stage;
  if (leadScore !== undefined) updates.leadScore = leadScore;
  if (notes !== undefined) updates.notes = notes;
  if (tags !== undefined) updates.tags = tags;
  if (optedIn !== undefined) updates.optedIn = optedIn;
  if (optedOut !== undefined) updates.optedOut = optedOut;

  const [contact] = await db
    .update(contactsTable)
    .set(updates)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.orgId, orgId)))
    .returning();

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.json(contact);
});

router.delete("/contacts/:id", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [contact] = await db
    .delete(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.orgId, orgId)))
    .returning();

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/contacts/:id/enrich", ...authMiddleware, async (req, res): Promise<void> => {
  const orgId = (req as any).orgId as number;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [contact] = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.orgId, orgId)));

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  try {
    const prompt = `You are a B2B data enrichment expert focused on Tanzanian businesses. Given this contact, infer enrichment data.
Contact: ${contact.firstName ?? ""} ${contact.lastName ?? ""}, ${contact.jobTitle ?? ""} at ${contact.companyName ?? "unknown company"}, ${contact.city ?? "Tanzania"}.
Email: ${contact.email}

Return ONLY a JSON object with these fields (use null for unknown):
{
  "industry": "string or null",
  "companySize": "1-10|11-50|51-200|201-500|500+ or null",
  "city": "string or null",
  "leadScore": number 0-100,
  "stage": "prospect|qualified|hot|customer",
  "notes": "1-2 sentence outreach insight"
}`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const enriched = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const [updated] = await db
      .update(contactsTable)
      .set({
        industry: enriched.industry ?? contact.industry,
        companySize: enriched.companySize ?? contact.companySize,
        city: enriched.city ?? contact.city,
        leadScore: enriched.leadScore ?? contact.leadScore,
        stage: enriched.stage ?? contact.stage,
        notes: enriched.notes ?? contact.notes,
        enriched: true,
      })
      .where(eq(contactsTable.id, id))
      .returning();

    res.json(updated);
  } catch {
    req.log.error("Enrichment failed");
    res.status(500).json({ error: "Enrichment failed" });
  }
});

export default router;
