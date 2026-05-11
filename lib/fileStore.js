import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filename, fallback) {
  ensureDir();
  const file = path.join(DATA_DIR, filename);
  if (!existsSync(file)) { writeFileSync(file, JSON.stringify(fallback)); return fallback; }
  return JSON.parse(readFileSync(file, 'utf-8'));
}
function writeJson(filename, data) {
  ensureDir();
  const file = path.join(DATA_DIR, filename);
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export const readBoards    = () => readJson('boards.json', []);
export const writeBoards   = (d) => writeJson('boards.json', d);
export const readSubjects  = () => readJson('subjects.json', []);
export const writeSubjects = (d) => writeJson('subjects.json', d);
export const readHabits    = () => readJson('habits.json', []);
export const writeHabits   = (d) => writeJson('habits.json', d);
export const readGoals     = () => readJson('goals.json', []);
export const writeGoals    = (d) => writeJson('goals.json', d);
export const readJournal   = () => readJson('journal.json', []);
export const writeJournal  = (d) => writeJson('journal.json', d);
