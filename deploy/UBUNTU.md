# Deploy en un servidor Ubuntu

Pasos para correr `insieme-demo` en un Ubuntu Server (22.04 / 24.04). Los comandos `sudo` van en el servidor.

## 1. Instalar Docker (una sola vez)

```bash
curl -fsSL https://get.docker.com | sudo sh
```

```bash
sudo usermod -aG docker $USER && newgrp docker
```

Verifica la arquitectura (`x86_64` → amd64, `aarch64` → arm64; la imagen publicada trae ambas):

```bash
uname -m
```

## 2. Obtener la imagen

**Opción A — desde Docker Hub** (`devteamtwelve/insieme-demo`, repo privado: pide la contraseña o un access token):

```bash
docker login -u devteamtwelve
```

```bash
docker pull devteamtwelve/insieme-demo:latest
```

**Opción B — construirla en el servidor** (necesita acceso SSH a GitHub para el repo privado):

```bash
mkdir -p ~/insieme && cd ~/insieme && git clone git@github.com:insieme-openpayments/hackathon-mde.git && git clone git@github.com:insieme-openpayments/integration-backend.git
```

```bash
cd ~/insieme/hackathon-mde && docker build -f deploy/Dockerfile --build-context integration=../integration-backend -t insieme-demo .
```

## 3. Variables

```bash
mkdir -p ~/insieme && nano ~/insieme/.env && chmod 600 ~/insieme/.env
```

Contenido (mismo formato que `deploy/.env.example`):

```
PUBLIC_URL=https://demo.tu-dominio.com
PAYMENT_POINTER=https://ilp.interledger-test.dev/tu-wallet
KEY_ID=...
PRIVATE_KEY=...
API_KEY=una-clave-larga-aleatoria
CATALOG_SOURCE=dummy
THEME=dark
CURRENCY=COP
```

`PUBLIC_URL` debe ser la dirección con la que el navegador abre la demo: Open Payments redirige ahí al aprobar el pago.
Sin dominio, usa la IP: `PUBLIC_URL=http://IP_DEL_SERVIDOR:8080`.

## 4. Correr

Con dominio + HTTPS (paso 5) publica solo en localhost; sin dominio cambia `127.0.0.1:8080:8080` por `8080:8080`.

```bash
docker run -d --name insieme-demo --restart unless-stopped -p 127.0.0.1:8080:8080 --env-file ~/insieme/.env -v insieme-pg:/var/lib/postgresql/data devteamtwelve/insieme-demo:latest
```

(Con la opción B la imagen se llama solo `insieme-demo`.)

```bash
docker logs -f insieme-demo
```

Debe mostrar `[insieme] listo` e `Insieme server started on port 3004`. Comprueba:

```bash
curl -s localhost:8080/healthz
```

## 5. HTTPS con Caddy (recomendado)

Requiere un registro DNS `A` del dominio apuntando a la IP del servidor y los puertos 80/443 abiertos.

```bash
sudo apt install -y caddy
```

(Ubuntu 24.04 lo trae; en 22.04 agrega primero el repo oficial: https://caddyserver.com/docs/install#debian-ubuntu-raspbian.)

```bash
echo 'demo.tu-dominio.com {
  reverse_proxy 127.0.0.1:8080
}' | sudo tee /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

Caddy obtiene el certificado solo. Abre https://demo.tu-dominio.com/pay/.

## Firewall (si UFW está activo)

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
```

Sin Caddy, abre el puerto de la app: `sudo ufw allow 8080/tcp`.
Ojo: Docker publica puertos saltándose UFW; por eso con Caddy se publica en `127.0.0.1:8080`.

## Actualizar a una nueva versión

```bash
docker pull devteamtwelve/insieme-demo:latest && docker rm -f insieme-demo
```

Y repite el `docker run` del paso 4. Los datos de Postgres siguen en el volumen `insieme-pg`.
