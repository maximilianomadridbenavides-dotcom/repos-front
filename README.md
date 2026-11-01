# repos-front

Frontend estático del catálogo DevOps. Se despliega con Nginx y consulta la API en `/api/repositorios` mediante el Service `repos-api`.

## Requisitos

- Node.js 22 o posterior y npm para pruebas.
- Docker para construir la imagen.
- Helm y Minikube para desplegar en Kubernetes.

## Pruebas y cobertura

```bash
npm ci
npm test
```

Genera cobertura de consola y `coverage/lcov.info`.

## Desarrollo local

Inicia la API desde su proyecto en el puerto 3001 y luego ejecuta:

```bash
API_PORT=3001 node dev-server.js
```

Abre `http://localhost:8080`.

## Docker y Helm

```bash
docker build -t repos-front:1.0 .
helm lint ./helm
minikube image build -t repos-front:1.0 .
helm upgrade --install repos-front ./helm -n reto
```

El Service del frontend escucha en el puerto 80. Para abrirlo localmente:

```bash
kubectl port-forward -n reto svc/repos-front 8080:80
```

## CI y SonarQube Cloud

GitHub Actions ejecuta pruebas, cobertura, análisis y construcción Docker. Configura el secreto `SONAR_TOKEN` en el repositorio. La clave de proyecto se define en `sonar-project.properties`.
