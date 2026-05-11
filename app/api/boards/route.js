import { readBoards, writeBoards } from '@/lib/fileStore';

export async function GET() {
  const boards = readBoards();
  return Response.json(boards);
}

export async function POST(request) {
  const body = await request.json();
  const boards = readBoards();
  const newBoard = {
    id: `board-${Date.now()}`,
    name: body.name || 'Untitled Board',
    createdAt: Date.now(),
    tasks: [],
    sprints: [],
  };
  boards.push(newBoard);
  writeBoards(boards);
  return Response.json(newBoard, { status: 201 });
}
