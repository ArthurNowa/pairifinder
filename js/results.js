import { photoScore, guessScore } from './game.js';

export function computeResults(game, animals) {
  const photos = photoScore(game, animals);
  const guesses = guessScore(game);
  return { photos, guesses, total: photos + guesses };
}
