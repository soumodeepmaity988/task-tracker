import { readHabits, writeHabits } from '@/lib/fileStore';

export async function GET() {
  try { // [wrapped]
  return Response.json(await readHabits());
  } catch (e) {
    console.error("[GET /habits]", e);
    return Response.json({ error: String(e?.message || e), where: "GET /habits" }, { status: 500 });
  }
}

export async function POST(request) {
  try { // [wrapped]
  const body = await request.json();
  const habits = await readHabits();
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
  await writeHabits(habits);
  return Response.json(newHabit, { status: 201 });
  } catch (e) {
    console.error("[POST /habits]", e);
    return Response.json({ error: String(e?.message || e), where: "POST /habits" }, { status: 500 });
  }
}
