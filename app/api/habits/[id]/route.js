import { readHabits, writeHabits } from '@/lib/fileStore';

export async function PUT(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  const body = await request.json();
  const habits = await readHabits();
  const idx = habits.findIndex(h => h.id === id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  habits[idx] = { ...habits[idx], ...body };
  await writeHabits(habits);
  return Response.json(habits[idx]);
  } catch (e) {
    console.error("[PUT /habits/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "PUT /habits/[id]" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  await writeHabits((await readHabits()).filter(h => h.id !== id));
  return Response.json({ success: true });
  } catch (e) {
    console.error("[DELETE /habits/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "DELETE /habits/[id]" }, { status: 500 });
  }
}
