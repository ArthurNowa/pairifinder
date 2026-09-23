import { loadAnimals, filterAnimals, zonesFrom, getAnimal } from './animals.js';
import { loadGame, saveGame, clearGame, exportGame, importGame } from './storage.js';
import { createGame, photoScore, potentialScore } from './game.js';
import { computeResults } from './results.js';

const app = document.querySelector('#app');
const backBtn = document.querySelector('#backBtn');
const menuBtn = document.querySelector('#menuBtn');
const menuDialog = document.querySelector('#menuDialog');
const animalDialog = document.querySelector('#animalDialog');
const animalDialogContent = document.querySelector('#animalDialogContent');
const bottomNav = document.querySelector('#bottomNav');
const toast = document.querySelector('#toast');
let animals = [];
let game = loadGame();
let route = game ? routeForStatus(game.status) : 'home';
let filters = { query: '', zone: '', points: '' };

applySavedTheme();
init();

async function init() {
  try {
    animals = await loadAnimals();
    bindGlobalEvents();
    render();
  } catch (error) {
    app.innerHTML = `<div class="card"><h2>Erreur</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function applySavedTheme() {
  const saved = localStorage.getItem('pairiTheme');
  const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  updateThemeColor(theme);
}

function updateThemeColor(theme) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111713' : '#f3f5f2');
}

function updateThemeButton() {
  const btn = document.querySelector('#themeBtn');
  if (!btn) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  btn.textContent = dark ? '☀️ Activer le mode clair' : '🌙 Activer le mode sombre';
}

function bindGlobalEvents() {
  menuBtn.addEventListener('click', () => { updateThemeButton(); menuDialog.showModal(); });
  document.querySelector('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('pairiTheme', next);
    updateThemeColor(next);
    updateThemeButton();
  });
  document.querySelectorAll('[data-close-dialog]').forEach(btn => btn.addEventListener('click', () => menuDialog.close()));
  document.querySelector('#exportBtn').addEventListener('click', () => {
    if (!game) return showToast('Aucune partie à exporter.');
    exportGame(game); menuDialog.close();
  });
  document.querySelector('#importInput').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { game = await importGame(file); route = routeForStatus(game.status); menuDialog.close(); render(); showToast('Sauvegarde importée.'); }
    catch (e) { showToast(e.message); }
    event.target.value = '';
  });
  document.querySelector('#resetBtn').addEventListener('click', () => {
    if (!confirm('Réinitialiser complètement la partie sur cet appareil ?')) return;
    clearGame(); game = null; route = 'home'; menuDialog.close(); render();
  });
  bottomNav.addEventListener('click', event => {
    const button = event.target.closest('[data-route]'); if (!button) return;
    route = button.dataset.route; render();
  });
  backBtn.addEventListener('click', () => { route = game ? routeForStatus(game.status) : 'home'; render(); });
  window.addEventListener('game-saved', () => showToast('✓ Sauvegardé'));
}

function render() {
  backBtn.classList.toggle('hidden', ['home','hunt','guesses','results'].includes(route));
  bottomNav.classList.toggle('hidden', !game || !['playing','guesses','finished'].includes(game.status));
  [...bottomNav.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b.dataset.route === route));
  const screens = { home: renderHome, setup: renderSetup, selection: renderSelection, joker: renderJoker, hunt: renderHunt, guesses: renderGuesses, results: renderResults };
  (screens[route] || renderHome)();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderHome() {
  app.innerHTML = `
    <section class="hero"><p class="eyebrow">Pairi Daiza</p><h2>Une chasse photo, chacun avec ses secrets.</h2><p>Choisis 10 animaux, mise sur un Joker et tente de deviner les listes adverses.</p></section>
    <div class="stack">
      <button id="newGame" class="primary full">Nouvelle partie</button>
      ${game ? '<button id="continueGame" class="secondary full">Continuer la partie</button>' : ''}
      <p class="empty">Les données sont sauvegardées automatiquement sur cet appareil.</p>
    </div>`;
  document.querySelector('#newGame').onclick = () => { route = 'setup'; render(); };
  document.querySelector('#continueGame')?.addEventListener('click', () => { route = routeForStatus(game.status); render(); });
}

function renderSetup() {
  app.innerHTML = `
    <div class="section-title"><div><h2>Nouvelle partie</h2><p>Les noms servent uniquement à organiser tes prédictions.</p></div></div>
    <form id="setupForm" class="card stack">
      <div class="field"><label for="player">Ton prénom / pseudo</label><input id="player" maxlength="30" required placeholder="Arthur"></div>
      <div class="field"><label for="opponents">Nombre d'adversaires</label><select id="opponents"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>
      <div id="opponentFields" class="stack"></div>
      <button class="primary full" type="submit">Choisir mes animaux</button>
    </form>`;
  const count = document.querySelector('#opponents');
  const fields = document.querySelector('#opponentFields');
  const drawFields = () => { fields.innerHTML = Array.from({length:Number(count.value)},(_,i)=>`<div class="field"><label>Adversaire ${i+1}</label><input name="opponent" maxlength="30" placeholder="Prénom facultatif"></div>`).join(''); };
  count.onchange = drawFields; drawFields();
  document.querySelector('#setupForm').onsubmit = e => {
    e.preventDefault();
    const names = [...document.querySelectorAll('[name="opponent"]')].map(i=>i.value.trim());
    game = createGame(document.querySelector('#player').value.trim(), names);
    saveGame(game); route = 'selection'; render();
  };
}

function renderSelection() {
  game.status = 'selection'; saveGame(game);
  const list = filterAnimals(animals, filters);
  app.innerHTML = `
    <div class="section-title"><div><h2>Choisis tes animaux</h2><p>Construis ta liste secrète de 10 cibles.</p></div><span class="counter">${game.selection.length}/10</span></div>
    <div class="progress"><span style="width:${game.selection.length*10}%"></span></div>
    <div class="filters">${filterMarkup()}</div>
    <div class="summary-strip"><div class="stat"><strong>${basePotential()}</strong><span>points potentiels*</span></div><div class="stat"><strong>${list.length}</strong><span>animaux affichés</span></div></div>
    <p class="animal-meta">* avant multiplicateur du Joker</p>
    <section class="selected-panel">
      <div class="selected-panel-head"><strong>Ma sélection</strong><span>${game.selection.length}/10</span></div>
      ${game.selection.length
        ? `<div class="selected-chips">${game.selection.map(id => { const a = getAnimal(animals,id); return a ? `<button class="selected-chip" data-remove-selected="${a.id}" title="Retirer ${escapeHtml(a.name)}"><span>${escapeHtml(a.name)}</span><b>${a.points} pt${a.points>1?'s':''}</b><i>×</i></button>` : ''; }).join('')}</div>`
        : '<p class="selected-empty">Aucun animal sélectionné pour le moment.</p>'}
    </section>
    <div class="animal-list">${list.map(animal => animalCard(animal, game.selection.includes(animal.id))).join('')}</div>
    <div class="stack"><button id="toJoker" class="primary full" ${game.selection.length !== 10 ? 'disabled' : ''}>Choisir mon Joker</button></div>`;
  bindFilters(renderSelection);
  document.querySelectorAll('[data-remove-selected]').forEach(btn => btn.onclick = () => {
    game.selection = game.selection.filter(id => id !== btn.dataset.removeSelected);
    saveGame(game); renderSelection();
  });
  bindAnimalCards(id => {
    const selected = game.selection.includes(id);
    if (!selected && game.selection.length >= 10) return showToast('Ta liste contient déjà 10 animaux.');
    game.selection = selected ? game.selection.filter(x=>x!==id) : [...game.selection,id];
    saveGame(game); renderSelection();
  });
  document.querySelector('#toJoker').onclick = () => { route = 'joker'; render(); };
}

function renderJoker() {
  app.innerHTML = `<div class="section-title"><div><h2>Choisis ton Joker 🃏</h2><p>Sa valeur sera multipliée par 3 s'il est photographié.</p></div></div>
    <div class="animal-list">${game.selection.map(id => { const a=getAnimal(animals,id); return `<button class="animal-card ${game.joker===id?'selected':''}" data-joker="${id}"><div><div class="animal-name">${escapeHtml(a.name)} ${game.joker===id?'<span class="joker">🃏</span>':''}</div><div class="animal-meta">${a.points} pt → <strong>${a.points*3} pts</strong></div></div><span class="points p${a.points}">${a.points*3}</span></button>`; }).join('')}</div>
    <div class="card"><div class="score-line"><span>Potentiel avec Joker</span><strong>${game.joker ? potentialScore(game,animals) : '—'}</strong></div></div>
    <div class="stack"><button id="lockList" class="primary full" ${!game.joker?'disabled':''}>🔒 Valider ma liste</button><button id="editList" class="ghost full">Modifier ma sélection</button></div>`;
  document.querySelectorAll('[data-joker]').forEach(btn => btn.onclick=()=>{game.joker=btn.dataset.joker;saveGame(game);renderJoker();});
  document.querySelector('#editList').onclick=()=>{route='selection';render();};
  document.querySelector('#lockList').onclick=()=>{ if(!confirm('Valider définitivement cette liste et ce Joker ?')) return; game.status='playing';saveGame(game);route='hunt';render(); };
}

function renderHunt() {
  if (!game) return renderHome();
  const selected = game.selection.map(id=>getAnimal(animals,id)).filter(Boolean);
  app.innerHTML = `<div class="section-title"><div><h2>Ma chasse</h2><p>${game.player} · touche une cible pour la valider.</p></div><span class="counter">${game.found.length}/10</span></div>
    <div class="summary-strip"><div class="stat"><strong>${photoScore(game,animals)}</strong><span>score actuel</span></div><div class="stat"><strong>${potentialScore(game,animals)}</strong><span>score maximum</span></div></div>
    <div class="animal-list">${selected.map(a=>huntCard(a)).join('')}</div>
    <div class="stack"><button id="finishHunt" class="primary full">Terminer la chasse</button></div>`;
  document.querySelectorAll('[data-found]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.found;game.found=game.found.includes(id)?game.found.filter(x=>x!==id):[...game.found,id];saveGame(game);renderHunt();});
  document.querySelector('#finishHunt').onclick=()=>{if(!confirm('Passer aux prédictions ? Tu pourras toujours consulter ta chasse.'))return;game.status='guesses';saveGame(game);route='guesses';render();};
}

function renderGuesses() {
  if (!game) return renderHome();
  if (!game.opponents.length) { app.innerHTML='<div class="empty">Aucun adversaire configuré.</div>'; return; }
  const opponentIndex = Number(sessionStorage.getItem('guessOpponent') || 0);
  const opponent = game.opponents[Math.min(opponentIndex, game.opponents.length-1)];
  const list = filterAnimals(animals, filters);
  app.innerHTML = `<div class="section-title"><div><h2>Prédictions</h2><p>Liste supposée de ${escapeHtml(opponent.name)}</p></div><span class="counter">${opponent.guesses.length}/5</span></div>
    <div class="filter-row">${game.opponents.map((o,i)=>`<button class="${i===opponentIndex?'primary':'ghost'}" data-opponent="${i}">${escapeHtml(o.name)}</button>`).join('')}</div>
    <div class="filters">${filterMarkup()}</div>
    <div class="animal-list">${list.map(a=>animalCard(a,opponent.guesses.includes(a.id),opponent.jokerGuess===a.id)).join('')}</div>
    <div class="card"><h3>Joker supposé</h3><p class="animal-meta">Choisis d'abord 5 animaux, puis désigne le Joker parmi eux.</p><select id="jokerGuess" class="search"><option value="">— Joker inconnu —</option>${opponent.guesses.map(id=>{const a=getAnimal(animals,id);return `<option value="${id}" ${opponent.jokerGuess===id?'selected':''}>${escapeHtml(a.name)}</option>`}).join('')}</select></div>
    <div class="stack"><button id="finishGame" class="primary full" ${!allGuessesReady()?'disabled':''}>Voir le récapitulatif</button></div>`;
  document.querySelectorAll('[data-opponent]').forEach(btn=>btn.onclick=()=>{sessionStorage.setItem('guessOpponent',btn.dataset.opponent);renderGuesses();});
  bindFilters(renderGuesses);
  bindAnimalCards(id=>{const has=opponent.guesses.includes(id);if(!has&&opponent.guesses.length>=5)return showToast('5 prédictions maximum.');opponent.guesses=has?opponent.guesses.filter(x=>x!==id):[...opponent.guesses,id];if(!opponent.guesses.includes(opponent.jokerGuess))opponent.jokerGuess=null;saveGame(game);renderGuesses();});
  document.querySelector('#jokerGuess').onchange=e=>{opponent.jokerGuess=e.target.value||null;saveGame(game);renderGuesses();};
  document.querySelector('#finishGame').onclick=()=>{game.status='finished';saveGame(game);route='results';render();};
}

function renderResults() {
  if (!game) return renderHome();
  const result = computeResults(game,animals);
  app.innerHTML = `<div class="section-title"><div><h2>Résultats</h2><p>Valide manuellement les prédictions après révélation des listes.</p></div></div>
    <div class="card"><div class="big-score">${result.total}</div><div class="score-line"><span>Photos</span><strong>${result.photos} pts</strong></div><div class="score-line"><span>Prédictions</span><strong>${result.guesses} pts</strong></div></div>
    <div class="stack">${game.opponents.map((o,i)=>resultOpponent(o,i)).join('')}</div>
    <div class="stack"><button id="exportResult" class="secondary full">💾 Exporter ma partie</button></div>`;
  document.querySelectorAll('[data-correct]').forEach(input=>input.onchange=()=>{const o=game.opponents[Number(input.dataset.oi)];const id=input.dataset.correct;o.validatedGuesses=input.checked?[...new Set([...o.validatedGuesses,id])]:o.validatedGuesses.filter(x=>x!==id);saveGame(game);renderResults();});
  document.querySelectorAll('[data-joker-correct]').forEach(input=>input.onchange=()=>{game.opponents[Number(input.dataset.jokerCorrect)].jokerCorrect=input.checked;saveGame(game);renderResults();});
  document.querySelector('#exportResult').onclick=()=>exportGame(game);
}

function resultOpponent(o,i){return `<div class="card"><h3>${escapeHtml(o.name)}</h3>${o.guesses.map(id=>{const a=getAnimal(animals,id);const checked=o.validatedGuesses.includes(id);return `<label class="score-line"><span>${escapeHtml(a?.name||id)} ${o.jokerGuess===id?'🃏':''}</span><input type="checkbox" data-correct="${id}" data-oi="${i}" ${checked?'checked':''}></label>`}).join('')}<label class="score-line"><span>Joker correctement identifié (+2 bonus)</span><input type="checkbox" data-joker-correct="${i}" ${o.jokerCorrect?'checked':''}></label></div>`;}

function filterMarkup(){return `<input id="search" class="search" type="search" placeholder="🔎 Rechercher..." value="${escapeHtml(filters.query)}"><div class="filter-row"><select id="zoneFilter" class="search"><option value="">Toutes les zones</option>${zonesFrom(animals).map(z=>`<option ${filters.zone===z?'selected':''}>${escapeHtml(z)}</option>`).join('')}</select><select id="pointsFilter" class="search"><option value="">Tous les points</option><option value="1" ${filters.points==='1'?'selected':''}>1 point</option><option value="2" ${filters.points==='2'?'selected':''}>2 points</option><option value="3" ${filters.points==='3'?'selected':''}>3 points</option></select></div>`;}
function bindFilters(callback){const q=document.querySelector('#search'),z=document.querySelector('#zoneFilter'),p=document.querySelector('#pointsFilter');q.oninput=()=>{filters.query=q.value;callback();};z.onchange=()=>{filters.zone=z.value;callback();};p.onchange=()=>{filters.points=p.value;callback();};}
function animalCard(a,selected=false,joker=false){return `<button class="animal-card ${selected?'selected':''}" data-animal="${a.id}"><div><div class="animal-name">${selected?'✓ ':''}${escapeHtml(a.name)} ${joker?'<span class="joker">🃏</span>':''}</div><div class="animal-meta">${escapeHtml(a.zone)} · ${escapeHtml(a.location)}</div></div><span class="points p${a.points}">${a.points} pt${a.points>1?'s':''}</span></button>`;}
function huntCard(a){const found=game.found.includes(a.id);const score=a.points*(game.joker===a.id?3:1);return `<button class="animal-card ${found?'selected found':''}" data-found="${a.id}"><div><div class="animal-name">${found?'✓ ':''}${escapeHtml(a.name)} ${game.joker===a.id?'<span class="joker">🃏</span>':''}</div><div class="animal-meta">${escapeHtml(a.zone)} · ${escapeHtml(a.location)}</div></div><span class="points p${a.points}">${found?'+':''}${score}</span></button>`;}
function bindAnimalCards(onClick){document.querySelectorAll('[data-animal]').forEach(card=>{card.onclick=e=>{if(e.detail===2){showAnimal(card.dataset.animal);return;}onClick(card.dataset.animal);};card.oncontextmenu=e=>{e.preventDefault();showAnimal(card.dataset.animal);};});}
function showAnimal(id){const a=getAnimal(animals,id);if(!a)return;animalDialogContent.innerHTML=`<div class="sheet-head"><h2>${escapeHtml(a.name)}</h2><button class="icon-btn" id="closeAnimal">×</button></div><div class="detail-grid"><div class="detail-row"><small>Zone</small>${escapeHtml(a.zone)}</div><div class="detail-row"><small>Emplacement</small>${escapeHtml(a.location)}</div><div class="detail-row"><small>Barème</small>${a.points} point${a.points>1?'s':''}</div><div class="detail-row"><small>Observation</small>${escapeHtml(a.observation||'Aucune indication particulière.')}</div></div>`;animalDialog.showModal();document.querySelector('#closeAnimal').onclick=()=>animalDialog.close();}
function basePotential(){return game.selection.reduce((s,id)=>s+(getAnimal(animals,id)?.points||0),0);}
function allGuessesReady(){return game.opponents.every(o=>o.guesses.length===5&&o.jokerGuess);}
function routeForStatus(status){return ({selection:'selection',playing:'hunt',guesses:'guesses',finished:'results'})[status]||'home';}
function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1300);}
function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
