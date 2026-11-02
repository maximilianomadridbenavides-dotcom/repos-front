export function filterRepositories(repositories, query = '', language = 'all') {
  const normalizedQuery = query.trim().toLocaleLowerCase('es');

  return repositories.filter((repository) => {
    const searchableText = `${repository.nombre} ${repository.descripcion} ${repository.lenguaje}`
      .toLocaleLowerCase('es');
    const matchesQuery = searchableText.includes(normalizedQuery);
    const matchesLanguage = language === 'all' || repository.lenguaje === language;

    return matchesQuery && matchesLanguage;
  });
}

export function summarizeRepositories(repositories) {
  return {
    total: repositories.length,
    active: repositories.filter((repository) => repository.estado === 'Activo').length,
    languages: new Set(repositories.map((repository) => repository.lenguaje)).size,
  };
}

export function listRepositoryLanguages(repositories) {
  return [...new Set(repositories.map((repository) => repository.lenguaje))].sort((left, right) => left.localeCompare(right, 'es'));
}

export function readRepositoryPayload(payload) {
  if (!payload?.ok || !Array.isArray(payload.data)) {
    throw new Error('La respuesta de la API tiene un formato inesperado');
  }

  return payload.data;
}
