let cache = null;

export async function loadAnimals() {
  if (cache) return cache;
  const response = await fetch('data/animals.json');
  if (!response.ok) throw new Error('Impossible de charger animals.json');
  cache = await response.json();
  return cache;
}

export function getAnimal(animals, id) {
  return animals.find(animal => animal.id === id);
}

export function filterAnimals(animals, { query = '', zone = '', points = '' } = {}) {
  const q = query.trim().toLocaleLowerCase('fr');
  return animals.filter(animal => {
    const haystack = `${animal.name} ${animal.zone} ${animal.location}`.toLocaleLowerCase('fr');
    return (!q || haystack.includes(q)) &&
      (!zone || animal.zone === zone) &&
      (!points || animal.points === Number(points));
  });
}

export function zonesFrom(animals) {
  return [...new Set(animals.map(a => a.zone))].sort((a, b) => a.localeCompare(b, 'fr'));
}
