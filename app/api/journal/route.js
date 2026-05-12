import { readJournal, writeJournal } from '@/lib/fileStore';

export async function GET() {
  try { // [wrapped]
  return Response.json(await readJournal());
  } catch (e) {
    console.error("[GET /journal]", e);
    return Response.json({ error: String(e?.message || e), where: "GET /journal" }, { status: 500 });
  }
}

export async function POST(request) {
  try { // [wrapped]
  const body = await request.json();
  const entries = await readJournal();
  const entry = {
    id: `j-${Date.now()}`,
    weekOf: body.weekOf || new Date().toISOString().slice(0, 10),
    didWell: body.didWell || '',
    slipped: body.slipped || '',
    nextWeek: body.nextWeek || '',
    notes: body.notes || '',
    createdAt: Date.now(),
  };
  entries.push(entry);
  await writeJournal(entries);
  return Response.json(entry, { status: 201 });
  } catch (e) {
    console.error("[POST /journal]", e);
    return Response.json({ error: String(e?.message || e), where: "POST /journal" }, { status: 500 });
  }
}
