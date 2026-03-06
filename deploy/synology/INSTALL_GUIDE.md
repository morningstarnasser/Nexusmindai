# NexusMind auf Synology NAS installieren

Dieses Handbuch führt Sie Schritt für Schritt durch die Installation von NexusMind auf einem Synology NAS-Gerät mit Docker.

## Voraussetzungen

- Synology NAS mit DSM 7.0 oder höher
- Docker aktiviert (über Synology Package Center installiert)
- Mindestens 4GB RAM verfügbar
- 10GB freier Speicherplatz auf /volume1/docker/nexusmind

## Schritt 1: Docker Installation

1. Öffnen Sie das **Synology Diskstation Manager (DSM)**
2. Klicken Sie auf **Hauptmenü** → **Paketcenter**
3. Suchen Sie nach **Docker**
4. Klicken Sie auf **Installieren**
5. Warten Sie bis die Installation abgeschlossen ist
6. Starten Sie den Docker-Dienst neu

## Schritt 2: Verzeichnisstruktur vorbereiten

1. Öffnen Sie **File Station**
2. Navigieren Sie zu **/volume1**
3. Erstellen Sie einen neuen Ordner: **docker**
4. Öffnen Sie den **docker** Ordner
5. Erstellen Sie einen neuen Ordner: **nexusmind**
6. Erstellen Sie folgende Unterordner:
   - `postgres` (für Datenbankdaten)
   - `redis` (für Cache)
   - `data` (für Anwendungsdaten)
   - `logs` (für Protokolldateien)
   - `skills` (für Fähigkeiten/Skills)

## Schritt 3: Umgebungsvariablen konfigurieren

1. Öffnen Sie **Text Editor** in DSM
2. Erstellen Sie eine neue Datei: `.env`
3. Fügen Sie folgende Variablen ein und passen Sie diese an:

```bash
# Datenbankpasswort (Sicher wählen!)
DB_PASSWORD=VerySecurePassword123!

# Telegram Bot Token (von @BotFather auf Telegram erhalten)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# OpenAI API Key (von https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_openai_api_key_here

# Port Konfiguration
BACKEND_PORT=8000
FRONTEND_PORT=3000
```

4. Speichern Sie die Datei unter `/volume1/docker/nexusmind/.env`

## Schritt 4: Docker Image bauen

1. Öffnen Sie **SSH** Zugang:
   - DSM Einstellungen → Terminal & SNMP
   - SSH aktivieren
   
2. Verbinden Sie sich via SSH:
```bash
ssh admin@your-nas-ip
```

3. Navigieren Sie zum NexusMind Verzeichnis:
```bash
cd /volume1/docker/nexusmind
```

4. Laden Sie die docker-compose.synology.yml Datei herunter:
```bash
wget https://raw.githubusercontent.com/your-repo/NexusMind/main/deploy/synology/docker-compose.synology.yml
```

5. Starten Sie Docker Compose:
```bash
docker-compose -f docker-compose.synology.yml up -d
```

## Schritt 5: Erste Verwendung

Nach erfolgreichem Start:

1. Öffnen Sie einen Webbrowser
2. Navigieren Sie zu: `http://your-nas-ip:3000`
3. Standard-Login:
   - Benutzername: `admin`
   - Passwort: `admin` (bitte ändern!)

## Schritt 6: Telegram Bot konfigurieren

1. Öffnen Sie Telegram
2. Suchen Sie nach **@BotFather**
3. Senden Sie `/newbot`
4. Folgen Sie den Anweisungen zur Bot-Erstellung
5. Kopieren Sie den Bot Token
6. Fügen Sie ihn in die `.env` Datei ein
7. Starten Sie Docker Container neu:
```bash
docker-compose -f docker-compose.synology.yml restart backend
```

## Schritt 7: Auto-Start konfigurieren

Damit NexusMind automatisch startet, wenn das NAS hochfährt:

1. Öffnen Sie **Systemsteuerung** → **Planung**
2. Klicken Sie auf **Erstellen** → **Benutzerdefiniertes Script**
3. Name: `NexusMind Auto-Start`
4. Zeitplan: **Beim Hochfahren des Systems**
5. Script Benutzer: **root**
6. Script:
```bash
/usr/bin/docker-compose -f /volume1/docker/nexusmind/docker-compose.synology.yml up -d
```
7. Speichern und aktivieren

## Schritt 8: Dashboard zugänglich machen

### Optionen für Remote-Zugriff:

**Option A: Synology QuickConnect (einfach)**
1. DSM Einstellungen → QuickConnect
2. QuickConnect aktivieren
3. Zugriff über `quickconnect.to/your-id`

**Option B: Reverse Proxy (sicherer)**
1. Control Panel → Network → HTTP Reverse Proxy
2. Erstellen Sie einen neuen Reverse Proxy:
   - Name: `nexusmind`
   - Quelle: `http://your-nas-ip:3000`
   - Ziel: `your-domain.com:80`

## Wartung und Updates

### Logs überprüfen:
```bash
docker-compose -f /volume1/docker/nexusmind/docker-compose.synology.yml logs -f backend
```

### Container neustarten:
```bash
docker-compose -f /volume1/docker/nexusmind/docker-compose.synology.yml restart
```

### System aktualisieren:
Watchtower wird automatisch neue Images herunterladen und deployen (täglich um Mitternacht).

### Manuell aktualisieren:
```bash
docker-compose -f /volume1/docker/nexusmind/docker-compose.synology.yml pull
docker-compose -f /volume1/docker/nexusmind/docker-compose.synology.yml up -d
```

## Fehlerbehebung

### Container startet nicht:
```bash
# Log überprüfen
docker logs nexusmind_backend

# Neustart versuchen
docker-compose -f /volume1/docker/nexusmind/docker-compose.synology.yml restart backend
```

### Speicher wird schnell voll:
```bash
# Docker bereinigen
docker system prune -a

# Nur alte Images entfernen
docker image prune -a --filter "until=168h"
```

### Datenbankverbindungsfehler:
```bash
# PostgreSQL neustarten
docker-compose -f /volume1/docker/nexusmind/docker-compose.synology.yml restart postgres

# Warten Sie 30 Sekunden
sleep 30

# Alle Services neustarten
docker-compose -f /volume1/docker/nexusmind/docker-compose.synology.yml restart
```

## Sicherheitsempfehlungen

1. **Standard-Passwort ändern**
   - Sofort nach Installation
   - Starkes Passwort verwenden

2. **API Keys schützen**
   - Nicht in öffentlichen Repositories veröffentlichen
   - Regelmäßig rotieren

3. **Firewall konfigurieren**
   - Nur notwendige Ports öffnen
   - SSH nur für lokales Netzwerk

4. **Backups durchführen**
   - Regelmäßig `/volume1/docker/nexusmind` sichern
   - Automatische Backups einrichten

## Zusätzliche Ressourcen

- **NexusMind Dokumentation**: https://github.com/nexusmind/nexusmind
- **Docker Dokumentation**: https://docs.docker.com
- **Synology Support**: https://www.synology.com/support

## Support

Bei Fragen oder Problemen:
1. Überprüfen Sie die Log-Dateien
2. Konsultieren Sie die offizielle Dokumentation
3. Erstellen Sie ein GitHub Issue mit Logs und Details
