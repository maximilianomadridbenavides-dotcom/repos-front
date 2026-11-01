import {
  filterRepositories,
  listRepositoryLanguages,
  readRepositoryPayload,
  summarizeRepositories,
} from './catalog.js';

const state = {
  repositories: [],
  query: '',
  language: 'all',
};

const grid = document.querySelector('#repo-grid');
const notice = document.querySelector('#notice');
const noticeMessage = document.querySelector('#notice-message');
const resultCount = document.querySelector('#result-count');
const searchInput = document.querySelector('#search-input');
const languageFilter = document.querySelector('#language-filter');
const apiState = document.querySelector('#api-state');
const apiStateLabel = document.querySelector('#api-state-label');

function setNotice(message, kind = 'loading') {
  notice.hidden = false;
  notice.className = `notice notice-${kind}`;
  noticeMessage.textContent = message;
  grid.replaceChildren();
}

function setApiState(connected) {
  apiState.classList.toggle('is-error', !connected);
  apiStateLabel.textContent = connected ? 'API conectada' : 'API sin conexión';
}

function updateMetrics(repositories) {
  const metrics = summarizeRepositories(repositories);
  document.querySelector('#metric-total').textContent = metrics.total;
  document.querySelector('#metric-active').textContent = metrics.active;
  document.querySelector('#metric-languages').textContent = metrics.languages;
}

function fillLanguageFilter(repositories) {
  const languages = listRepositoryLanguages(repositories);
  languageFilter.replaceChildren(new Option('Todos', 'all'));
  for (const language of languages) {
    languageFilter.add(new Option(language, language));
  }
}

function createRepositoryCard(repo) {
  const card = document.createElement('article');
  card.className = 'repo-card';

  const top = document.createElement('div');
  top.className = 'repo-top';
  const titleWrap = document.createElement('div');
  titleWrap.className = 'repo-name-wrap';
  const kicker = document.createElement('p');
  kicker.className = 'repo-kicker';
  kicker.textContent = 'EASYSOFT / DEMO';
  const title = document.createElement('h3');
  title.className = 'repo-name';
  title.textContent = repo.nombre;
  title.title = repo.nombre;
  const id = document.createElement('span');
  id.className = 'repo-id';
  id.textContent = repo.id;
  titleWrap.append(kicker, title, id);

  const status = document.createElement('span');
  status.className = 'repo-status';
  if (repo.estado !== 'Activo') status.classList.add('is-progress');
  status.textContent = repo.estado;
  top.append(titleWrap, status);

  const description = document.createElement('p');
  description.className = 'repo-description';
  description.textContent = repo.descripcion;

  const footer = document.createElement('div');
  footer.className = 'repo-footer';
  const tags = document.createElement('div');
  tags.className = 'repo-tags';
  const language = document.createElement('span');
  const languageDot = document.createElement('i');
  languageDot.className = 'language-dot';
  languageDot.dataset.language = repo.lenguaje;
  language.append(languageDot, document.createTextNode(repo.lenguaje));
  const branch = document.createElement('span');
  branch.textContent = `⑂ ${repo.rama}`;
  const stars = document.createElement('span');
  stars.textContent = `☆ ${repo.estrellas}`;
  tags.append(language, branch, stars);

  const updated = document.createElement('span');
  updated.className = 'repo-updated';
  updated.textContent = `ACT. ${repo.actualizado}`;
  footer.append(tags, updated);
  card.append(top, description, footer);
  return card;
}

function renderRepositories() {
  const visible = filterRepositories(state.repositories, state.query, state.language);

  notice.hidden = true;
  grid.replaceChildren(...visible.map(createRepositoryCard));
  resultCount.textContent = `Mostrando ${visible.length} de ${state.repositories.length} repositorios`;
  if (visible.length === 0) {
    setNotice('No encontramos repositorios con esos filtros.', 'empty');
  }
}

async function loadRepositories() {
  setNotice('Consultando repositorios...', 'loading');
  setApiState(false);
  try {
    const response = await fetch('/api/repositorios', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`La API respondió ${response.status}`);
    const payload = await response.json();
    state.repositories = readRepositoryPayload(payload);
    setApiState(true);
    updateMetrics(state.repositories);
    fillLanguageFilter(state.repositories);
    renderRepositories();
  } catch (error) {
    setApiState(false);
    updateMetrics([]);
    resultCount.textContent = '';
    setNotice(`No se pudieron cargar los repositorios. ${error.message}. Revisa que la API esté desplegada y que el Service se llame repos-api.`, 'error');
  }
}

searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  renderRepositories();
});
languageFilter.addEventListener('change', (event) => {
  state.language = event.target.value;
  renderRepositories();
});
document.querySelector('#refresh-button').addEventListener('click', loadRepositories);

loadRepositories();
