import { readHabits, writeHabits } from '@/lib/fileStore';

export async function GET() {
  return Response.json(readHabits());
}

export async function POST(request) {
  const body = await request.json();
  const habits = readHabits();
  const newHabit = {
    id: `h-${Date.now()}`,
    name: body.name || 'Untitled Habit',
    icon: body.icon || '🔥',
    color: body.color || '#22c55e',
    cadence: body.cadence || 'daily', // daily | weekdays | weekly
    target: body.target || 1, // per period (rarely changes)
    createdAt: Date.now(),
    completions: [], // array of ISO date strings 'YYYY-MM-DD'
  };
  habits.push(newHabit);
  writeHabits(habits);
  return Response.json(newHabit, { status: 201 });
}
