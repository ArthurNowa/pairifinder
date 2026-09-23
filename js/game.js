import { getAnimal } from './animals.js';

export function createGame(player, opponentNames = []) {
  return {
    version: 1,
    player,
    status: 'selection',
    selection: [],
    joker: null,
    found: [],
    opponents: opponentNames.map((name, index) => ({
      id: `opponent-${index + 1}`,
      name: name || `Adversaire ${index + 1}`,
      guesses: [],
      jokerGuess: null,
      validatedGuesses: [],
      jokerCorrect: false
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function photoScore(game, animals) {
  return game.found.reduce((total, id) => {
    const animal = getAnimal(animals, id);
    if (!animal) return total;
    return total + animal.points * (game.joker === id ? 3 : 1);
  }, 0);
}

export function potentialScore(game, animals) {
  return game.selection.reduce((total, id) => {
    const animal = getAnimal(animals, id);
    if (!animal) return total;
    return total + animal.points * (game.joker === id ? 3 : 1);
  }, 0);
}

export function guessScore(game) {
  return game.opponents.reduce((total, opponent) => {
    const correct = (opponent.validatedGuesses || []).length;
    return total + correct + (opponent.jokerCorrect ? 2 : 0);
  }, 0);
}
