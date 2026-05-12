import { readBoards, writeBoards } from '@/lib/fileStore';

export async function GET() {
  try { // [wrapped]
  const boards = await readBoards();
  return Response.json(boards);
  } catch (e) {
    console.error("[GET /boards]", e);
    return Response.json({ error: String(e?.message || e), where: "GET /boards" }, { status: 500 });
  }
}

export async function POST(request) {
  try { // [wrapped]
  const body = await request.json();
  const boards = await readBoards();
  const newBoard = {
    id: `board-${Date.now()}`,
    name: body.name || 'Untitled Board',
    createdAt: Date.now(),
    tasks: [],
    sprints: [],
  };
  boards.push(newBoard);
  await writeBoards(boards);
  return Response.json(newBoard, { status: 201 });
  } catch (e) {
    console.error("[POST /boards]", e);
    return Response.json({ error: String(e?.message || e), where: "POST /boards" }, { status: 500 });
  }
}
