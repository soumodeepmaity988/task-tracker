import { readHabits, writeHabits } from '@/lib/fileStore';

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const habits = readHabits();
  const idx = habits.findIndex(h => h.id === id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  habits[idx] = { ...habits[idx], ...body };
  writeHabits(habits);
  return Response.json(habits[idx]);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  writeHabits(readHabits().filter(h => h.id !== id));
  return Response.json({ success: true });
}
