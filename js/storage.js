const STORAGE_KEY = 'pairiHuntGameV1';

export function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Sauvegarde illisible', error);
    return null;
  }
}

export function saveGame(game) {
  game.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  window.dispatchEvent(new CustomEvent('game-saved', { detail: game.updatedAt }));
}

export function clearGame() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportGame(game) {
  const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (game.player || 'joueur').toLowerCase().replace(/[^a-z0-9_-]+/gi, '-');
  a.href = url;
  a.download = `pairi-hunt-${safeName}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importGame(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.selection)) {
    throw new Error('Format de sauvegarde non reconnu.');
  }
  saveGame(parsed);
  return parsed;
}
