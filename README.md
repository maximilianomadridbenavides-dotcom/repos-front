# repos-front

Frontend del catálogo de repositorios. Nginx sirve los archivos estáticos y reenvía `/api/` al Service `repos-api:3000`.

El proceso de Nginx ejecuta con el usuario `nginx` y escucha en el puerto interno 8080. El Service de Kubernetes expone el puerto 80. `/healthz` comprueba la disponibilidad del frontend.

## Desarrollo local

Inicia la API en el puerto 3001 y ejecuta:

```powershell
$env:API_PORT = '3001'
node dev-server.js
```

El servidor local escucha en `http://localhost:8080`. Su proxy está limitado al endpoint `GET /api/repositorios`; no reenvía cabeceras del cliente ni redirecciones de la API.

## Requisitos

- Node.js >=22.12 y npm.
- Docker Desktop con contenedores Linux.
- Minikube, Helm y kubectl.

## Pruebas y cobertura

```powershell
npm ci --ignore-scripts
npm run test:coverage
```

El reporte LCOV se genera en `coverage/lcov.info`. Se incluyen todos los archivos JavaScript de la raíz. Los mínimos globales son 90 % para líneas, sentencias y funciones, y 80 % para ramas.

## Integración continua

El workflow `.github/workflows/ci.yml` se ejecuta en push y pull request. Instala dependencias desde `package-lock.json`, ejecuta las pruebas, genera cobertura, analiza el proyecto en SonarCloud y comprueba la construcción de la imagen Docker. Las acciones están fijadas por SHA.

Configura `SONAR_TOKEN` como secreto del repositorio. Las claves del proyecto se encuentran en `sonar-project.properties`. El escáner espera el resultado del Quality Gate; un rechazo hace fallar la ejecución. El script PowerShell de despliegue mantiene análisis estático y se valida mediante ejecución en Kubernetes; la cobertura LCOV corresponde a JavaScript.

## Despliegue en Minikube

Inicia Docker Desktop y el clúster:

```powershell
minikube start --driver=docker --cpus=2 --memory=3072 --profile=devops-reto
```

Ejecuta primero `./deploy-minikube.ps1` en el repositorio de la API y después en el del frontend. El script construye la imagen con Docker Desktop, la carga en Minikube, comprueba su disponibilidad e instala el chart con Helm. La etiqueta predeterminada es `1.1`; se puede cambiar con `-ImageTag`.

Los charts utilizan `imagePullPolicy: Never`, recursos de CPU, memoria y almacenamiento efímero, comprobaciones de salud y tokens de ServiceAccount sin montaje automático.

```powershell
kubectl --context devops-reto -n reto get pods,svc
helm list --kube-context devops-reto -n reto
kubectl --context devops-reto -n reto port-forward svc/repos-front 8080:80
```

Abre `http://localhost:8080` mientras el port-forward permanezca activo.

## Diagnóstico

- `ErrImageNeverPull`: comprobar que la etiqueta esté cargada en el perfil `devops-reto`.
- Error de conexión a la API: comprobar el Service `repos-api:3000`, el namespace y la disponibilidad del pod.
- Error de certificados al construir dentro de Minikube: construir con Docker Desktop y cargar con `minikube image load --daemon`, manteniendo la validación TLS.
- Error de permisos en archivos temporales: el script utiliza una carpeta de trabajo bajo `LOCALAPPDATA/DevOpsTools/minikube-temp` y restaura las variables temporales al terminar.
- Pod sin disponibilidad: revisar `kubectl describe pod`, eventos y logs del deployment.

## Dependencias de pruebas

Las versiones transitivas de `glob` y `minimatch` utilizadas por `test-exclude` se fijan mediante `overrides`. Revisar esos ajustes cuando se actualicen las herramientas de cobertura.
