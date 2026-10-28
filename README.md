# Sage Paper Studio Manager · Frontend

Interfaccia React (Vite + TypeScript + Tailwind) del gestionale di Sage Paper Design.

Il frontend **non contiene più alcun backend**. Dati, autenticazione e portale clienti passano tutti dalle API Laravel del repository [`SPDmanagerbackend`](https://github.com/giuliawebandgraphic-design/SPDmanagerbackend), con database MySQL.

## Come funziona

| Parte | File |
|---|---|
| Client HTTP (URL backend, token, errori) | `src/lib/api.ts` |
| Login dello staff | `src/context/AuthContext.tsx` |
| Dati dello studio (caricamento e salvataggi) | `src/context/StudioContext.tsx` |
| Portale clienti (anteprima staff e link condiviso) | `src/context/PortalContext.tsx` |

- **Login staff:** email e password su `POST /api/auth/login`. Il token resta nel browser finché non si esce o scade.
- **Dati:** all'avvio arrivano da `GET /api/studio/data`. Ogni modifica aggiorna subito l'interfaccia e viene salvata sul server. Se il server la rifiuta compare un avviso e i dati vengono ricaricati, così ciò che si vede è sempre ciò che è salvato. Non esistono copie locali (localStorage, Firestore, Supabase).
- **Portale clienti:** il link `/#portal?token=…` non richiede il login dello staff. Il cliente inserisce la password, che viene verificata dal server, e vede solo i propri progetti, bozze e preventivi tramite le API `/api/portal/*`.

## Sviluppo

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

Con `VITE_API_URL` vuoto, Vite inoltra le chiamate `/api` al backend Laravel locale (`php artisan serve` su `http://127.0.0.1:8000`, modificabile con `VITE_DEV_API_PROXY`). In alternativa imposta `VITE_API_URL` con l'indirizzo di un backend remoto.

Controllo dei tipi: `npm run lint`.

## Produzione

```bash
# .env
VITE_API_URL=https://api.tuodominio.it

npm run build        # genera dist/
```

`VITE_API_URL` viene inserito nel codice in fase di build: dopo averlo cambiato bisogna rifare la build. Sul backend, `FRONTEND_URL` deve contenere l'indirizzo di questo frontend (CORS).

Hai due modi per pubblicarlo su SiteGround:

1. **Sito statico (consigliato).** Carica il contenuto di `dist/` nella `public_html` del dominio, con questo `.htaccess` per le rotte della SPA:
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^ index.html [L]
   ```
2. **Progetto Node.js.** `npm run build` e poi `npm start`: un piccolo server senza dipendenze (`scripts/serve.mjs`) serve `dist/` sulla porta `$PORT`. Non espone API.
