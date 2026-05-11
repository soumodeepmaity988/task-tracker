import { readGoals, writeGoals } from '@/lib/fileStore';

export async function GET() {
  return Response.json(readGoals());
}

export async function POST(request) {
  const body = await request.json();
  const goals = readGoals();
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
  writeGoals(goals);
  return Response.json(newGoal, { status: 201 });
}
