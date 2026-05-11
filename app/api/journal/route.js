import { readJournal, writeJournal } from '@/lib/fileStore';

export async function GET() {
  return Response.json(readJournal());
}

export async function POST(request) {
  const body = await request.json();
  const entries = readJournal();
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
  writeJournal(entries);
  return Response.json(entry, { status: 201 });
}
