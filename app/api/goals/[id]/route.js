import { readGoals, writeGoals } from '@/lib/fileStore';

export async function PUT(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  const body = await request.json();
  const goals = await readGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  goals[idx] = { ...goals[idx], ...body };
  await writeGoals(goals);
  return Response.json(goals[idx]);
  } catch (e) {
    console.error("[PUT /goals/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "PUT /goals/[id]" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  await writeGoals((await readGoals()).filter(g => g.id !== id));
  return Response.json({ success: true });
  } catch (e) {
    console.error("[DELETE /goals/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "DELETE /goals/[id]" }, { status: 500 });
  }
}
