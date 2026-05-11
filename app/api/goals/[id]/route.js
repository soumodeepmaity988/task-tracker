import { readGoals, writeGoals } from '@/lib/fileStore';

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const goals = readGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  goals[idx] = { ...goals[idx], ...body };
  writeGoals(goals);
  return Response.json(goals[idx]);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  writeGoals(readGoals().filter(g => g.id !== id));
  return Response.json({ success: true });
}
