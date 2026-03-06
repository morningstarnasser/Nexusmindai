#!/bin/bash

# NexusMind Auto-Start Script für Synology Task Scheduler
# Dieses Script sorgt dafür, dass NexusMind automatisch startet

# Konfiguration
DOCKER_COMPOSE_PATH="/volume1/docker/nexusmind/docker-compose.synology.yml"
DOCKER_DIR="/volume1/docker/nexusmind"
LOG_FILE="/volume1/docker/nexusmind/logs/auto-start.log"

# Logfunktion
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Fehlerbehandlung
error_exit() {
    log_message "FEHLER: $1"
    exit 1
}

# Hauptfunktion
main() {
    log_message "=== NexusMind Auto-Start gestartet ==="
    
    # Überprüfe ob Docker Compose Datei existiert
    if [ ! -f "$DOCKER_COMPOSE_PATH" ]; then
        error_exit "docker-compose.synology.yml nicht gefunden: $DOCKER_COMPOSE_PATH"
    fi
    
    # Warte auf Docker Service
    for i in {1..30}; do
        if docker ps &>/dev/null; then
            log_message "Docker ist verfügbar"
            break
        fi
        log_message "Warte auf Docker (Versuch $i/30)..."
        sleep 2
    done
    
    # Warte 10 weitere Sekunden für Netzwerk-Stabilität
    sleep 10
    
    # Navigiere zum Verzeichnis
    cd "$DOCKER_DIR" || error_exit "Kann nicht zu $DOCKER_DIR navigieren"
    
    # Starte Docker Compose
    log_message "Starte NexusMind Services..."
    docker-compose -f "$DOCKER_COMPOSE_PATH" up -d >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log_message "Docker Compose erfolgreich gestartet"
    else
        error_exit "Docker Compose konnte nicht gestartet werden"
    fi
    
    # Warte bis Services healthy sind (max 120 Sekunden)
    log_message "Warte bis Services verfügbar sind..."
    for i in {1..60}; do
        if curl -sf "http://localhost:8000/health" &>/dev/null; then
            log_message "NexusMind ist verfügbar"
            break
        fi
        sleep 2
    done
    
    # Zusätzliche Überprüfungen
    log_message "Überprüfe Status der Services..."
    docker-compose -f "$DOCKER_COMPOSE_PATH" ps >> "$LOG_FILE" 2>&1
    
    log_message "=== Auto-Start abgeschlossen ==="
}

# Zusätzliche Funktionen

# Backup vor Start
backup_database() {
    log_message "Erstelle Datenbank Backup..."
    local backup_dir="/volume1/docker/nexusmind/backups"
    local backup_file="$backup_dir/postgres_$(date +%Y%m%d_%H%M%S).sql"
    
    mkdir -p "$backup_dir"
    
    docker exec nexusmind_postgres pg_dump -U nexusmind nexusmind > "$backup_file" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log_message "Backup erfolgreich: $backup_file"
    else
        log_message "Backup konnte nicht erstellt werden"
    fi
}

# Health Check
health_check() {
    log_message "Starte Health Check..."
    
    # Überprüfe Backend
    if curl -sf "http://localhost:8000/health" &>/dev/null; then
        log_message "Backend: OK"
    else
        log_message "Backend: FEHLER"
        return 1
    fi
    
    # Überprüfe Frontend
    if curl -sf "http://localhost:3000" &>/dev/null; then
        log_message "Frontend: OK"
    else
        log_message "Frontend: FEHLER"
        return 1
    fi
    
    # Überprüfe Datenbank
    if docker exec nexusmind_postgres pg_isready -U nexusmind &>/dev/null; then
        log_message "PostgreSQL: OK"
    else
        log_message "PostgreSQL: FEHLER"
        return 1
    fi
    
    # Überprüfe Cache
    if docker exec nexusmind_redis redis-cli ping &>/dev/null; then
        log_message "Redis: OK"
    else
        log_message "Redis: FEHLER"
        return 1
    fi
    
    log_message "Health Check abgeschlossen"
    return 0
}

# Cleanup
cleanup() {
    log_message "Cleanup: Entferne alte Logs..."
    # Halte nur die letzten 30 Tage von Logs
    find /volume1/docker/nexusmind/logs -type f -name "*.log" -mtime +30 -delete
    log_message "Cleanup abgeschlossen"
}

# Recovery bei Crash
auto_recovery() {
    log_message "Überprüfe ob Recovery nötig ist..."
    
    if [ -f "/tmp/nexusmind_crashed" ]; then
        log_message "Crash erkannt, starte Recovery..."
        docker-compose -f "$DOCKER_COMPOSE_PATH" down >> "$LOG_FILE" 2>&1
        sleep 5
        docker-compose -f "$DOCKER_COMPOSE_PATH" up -d >> "$LOG_FILE" 2>&1
        rm /tmp/nexusmind_crashed
        log_message "Recovery abgeschlossen"
    fi
}

# Script-Ausführung
main

# Führe optionale Funktionen aus
backup_database
health_check
cleanup
auto_recovery

exit 0
