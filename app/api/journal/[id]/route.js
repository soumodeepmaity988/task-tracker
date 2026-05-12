import { readJournal, writeJournal } from '@/lib/fileStore';

export async function PUT(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  const body = await request.json();
  const list = await readJournal();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  list[idx] = { ...list[idx], ...body };
  await writeJournal(list);
  return Response.json(list[idx]);
  } catch (e) {
    console.error("[PUT /journal/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "PUT /journal/[id]" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  await writeJournal((await readJournal()).filter(e => e.id !== id));
  return Response.json({ success: true });
  } catch (e) {
    console.error("[DELETE /journal/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "DELETE /journal/[id]" }, { status: 500 });
  }
}
