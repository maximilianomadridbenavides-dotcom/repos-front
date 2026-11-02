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

## Controles de calidad obligatorios

Ejecuta `npm run test:coverage`. Se mide todo el JavaScript de la raíz con `c8 --all`, incluso los archivos que ninguna prueba importe. La pipeline exige como mínimo 90 % de líneas, sentencias y funciones, y 80 % de ramas en el conjunto del componente. No se excluye el servidor local ni el arranque de la API para mejorar artificialmente el porcentaje.

Las pruebas de frontend incluyen la página con DOM, filtros, actualización, respuestas inválidas, errores HTTP y de red, y el proxy del servidor local. Las pruebas de backend incluyen los endpoints y el arranque real en un puerto configurado. Los procesos de prueba se detienen de forma controlada para guardar cobertura también en Windows.

SonarCloud importa LCOV. `sonar.qualitygate.wait=true` obliga a esperar su Quality Gate y falla el análisis si el resultado es rechazado. El mínimo global de cobertura se impone con c8 antes del análisis; este control es independiente de las condiciones del Quality Gate de SonarCloud.
