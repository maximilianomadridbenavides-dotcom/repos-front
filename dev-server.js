import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendPort = Number(process.env.FRONTEND_PORT || 8080);
const apiPort = Number(process.env.API_PORT || 3000);
const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const publicFiles = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/styles.css', 'styles.css'],
  ['/app.js', 'app.js'],
  ['/catalog.js', 'catalog.js'],
]);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function proxyToApi(request, response) {
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: apiPort,
    path: request.url,
    method: request.method,
    headers: { ...request.headers, host: `127.0.0.1:${apiPort}` },
  }, (apiResponse) => {
    response.writeHead(apiResponse.statusCode || 502, apiResponse.headers);
    apiResponse.pipe(response);
  });

  upstream.on('error', () => {
    if (response.headersSent) return response.destroy();
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ ok: false, error: `No se pudo conectar con la API. Comprueba que esté activa en el puerto ${apiPort}.` }));
  });

  request.pipe(upstream);
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (pathname.startsWith('/api/')) {
    return proxyToApi(request, response);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    return response.end();
  }

  const file = publicFiles.get(pathname);
  if (!file) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return response.end('No encontrado');
  }

  const filePath = path.join(frontendRoot, file);
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('No se pudo leer el archivo del frontend');
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  });
});

server.listen(frontendPort, '127.0.0.1', () => {
  process.stdout.write(`Frontend disponible en http://localhost:${frontendPort}\n`);
  process.stdout.write(`Las solicitudes /api/* se reenvían al puerto ${apiPort}\n`);
});
