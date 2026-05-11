import { readJournal, writeJournal } from '@/lib/fileStore';

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const list = readJournal();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  list[idx] = { ...list[idx], ...body };
  writeJournal(list);
  return Response.json(list[idx]);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  writeJournal(readJournal().filter(e => e.id !== id));
  return Response.json({ success: true });
}
