#!/bin/bash
# ============================================================
# NexusMind — GitHub Repository Setup Script
# ============================================================
# Dieses Script erstellt ein GitHub Repository und pushed
# den gesamten NexusMind Code.
#
# Verwendung:
#   chmod +x GITHUB_SETUP.sh
#   ./GITHUB_SETUP.sh
#
# Voraussetzungen:
#   - git installiert
#   - GitHub CLI (gh) installiert ODER ein GitHub Token
# ============================================================

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════╗"
echo "║     🧠 NexusMind — GitHub Setup                 ║"
echo "║     The Ultimate Autonomous AI Agent Platform    ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check git
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git ist nicht installiert!${NC}"
    echo "Installiere git: https://git-scm.com/downloads"
    exit 1
fi

# GitHub Username abfragen
echo -e "${YELLOW}GitHub Username eingeben:${NC}"
read -r GITHUB_USER

# Repo Name
REPO_NAME="NexusMind"

echo ""
echo -e "${BLUE}Methode zum Erstellen des Repos wählen:${NC}"
echo "  1) GitHub CLI (gh) — empfohlen"
echo "  2) GitHub Token (manuell)"
echo "  3) Repo bereits erstellt — nur pushen"
echo ""
read -rp "Wahl (1/2/3): " METHOD

case $METHOD in
    1)
        if ! command -v gh &> /dev/null; then
            echo -e "${RED}GitHub CLI nicht gefunden!${NC}"
            echo "Installiere: https://cli.github.com/"
            exit 1
        fi
        echo -e "${GREEN}Erstelle Repository mit GitHub CLI...${NC}"
        gh repo create "$REPO_NAME" \
            --public \
            --description "NexusMind — The Ultimate Autonomous AI Agent Platform. 1000x beyond OpenClaw." \
            --source . \
            --remote origin \
            --push
        echo -e "${GREEN}✅ Repository erstellt und Code gepusht!${NC}"
        ;;
    2)
        echo -e "${YELLOW}GitHub Personal Access Token eingeben:${NC}"
        read -rs GITHUB_TOKEN
        echo ""

        echo -e "${GREEN}Erstelle Repository via GitHub API...${NC}"
        RESPONSE=$(curl -s -X POST https://api.github.com/user/repos \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            -d "{
                \"name\": \"$REPO_NAME\",
                \"description\": \"NexusMind — The Ultimate Autonomous AI Agent Platform. 1000x beyond OpenClaw.\",
                \"private\": false,
                \"has_issues\": true,
                \"has_wiki\": true
            }")

        REPO_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('html_url',''))" 2>/dev/null || echo "")

        if [ -z "$REPO_URL" ]; then
            echo -e "${RED}Fehler beim Erstellen des Repos. Antwort:${NC}"
            echo "$RESPONSE"
            exit 1
        fi

        echo -e "${GREEN}Repository erstellt: $REPO_URL${NC}"

        # Git remote hinzufügen und pushen
        git remote remove origin 2>/dev/null || true
        git remote add origin "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
        git push -u origin main

        # Token aus remote URL entfernen (Sicherheit)
        git remote set-url origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

        echo -e "${GREEN}✅ Code gepusht!${NC}"
        ;;
    3)
        echo -e "${GREEN}Füge Remote hinzu und pushe...${NC}"
        git remote remove origin 2>/dev/null || true
        git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
        git push -u origin main
        echo -e "${GREEN}✅ Code gepusht!${NC}"
        ;;
    *)
        echo -e "${RED}Ungültige Wahl!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 NexusMind Repository ist bereit!             ║${NC}"
echo -e "${GREEN}║                                                  ║${NC}"
echo -e "${GREEN}║  URL: https://github.com/${GITHUB_USER}/${REPO_NAME}${NC}"
echo -e "${GREEN}║                                                  ║${NC}"
echo -e "${GREEN}║  Nächste Schritte:                               ║${NC}"
echo -e "${GREEN}║  1. cp .env.example .env                        ║${NC}"
echo -e "${GREEN}║  2. API Keys in .env eintragen                  ║${NC}"
echo -e "${GREEN}║  3. npm install                                 ║${NC}"
echo -e "${GREEN}║  4. npm run dev                                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  WICHTIG: Wenn du einen GitHub Token verwendet hast,${NC}"
echo -e "${YELLOW}   rotiere ihn jetzt unter:${NC}"
echo -e "${YELLOW}   https://github.com/settings/tokens${NC}"
