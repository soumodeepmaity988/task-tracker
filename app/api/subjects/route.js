import { readSubjects, writeSubjects } from '@/lib/fileStore';

export async function GET() {
  const subjects = readSubjects();
  return Response.json(subjects);
}

export async function POST(request) {
  const body = await request.json();
  const subjects = readSubjects();
  const newSubject = {
    id: `s-${Date.now()}`,
    name: body.name || 'Untitled Subject',
    icon: body.icon || '📚',
    color: body.color || '#4f8ef7',
    description: body.description || '',
    createdAt: Date.now(),
    topics: body.topics || [],
  };
  subjects.push(newSubject);
  writeSubjects(subjects);
  return Response.json(newSubject, { status: 201 });
}
