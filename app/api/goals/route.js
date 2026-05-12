import { readGoals, writeGoals } from '@/lib/fileStore';

export async function GET() {
  try { // [wrapped]
  return Response.json(await readGoals());
  } catch (e) {
    console.error("[GET /goals]", e);
    return Response.json({ error: String(e?.message || e), where: "GET /goals" }, { status: 500 });
  }
}

export async function POST(request) {
  try { // [wrapped]
  const body = await request.json();
  const goals = await readGoals();
  const newGoal = {
    id: `g-${Date.now()}`,
    name: body.name || 'Untitled Goal',
    description: body.description || '',
    icon: body.icon || '🎯',
    color: body.color || '#4f8ef7',
    dueDate: body.dueDate || null,
    status: body.status || 'active', // active | done | abandoned
    linkedTaskIds: body.linkedTaskIds || [],
    createdAt: Date.now(),
  };
  goals.push(newGoal);
  await writeGoals(goals);
  return Response.json(newGoal, { status: 201 });
  } catch (e) {
    console.error("[POST /goals]", e);
    return Response.json({ error: String(e?.message || e), where: "POST /goals" }, { status: 500 });
  }
}
