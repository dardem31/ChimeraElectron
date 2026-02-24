# ChimeraFrontend

ChimeraFrontend is a desktop sandbox application built with Electron that allows capturing, replaying, and AI-modifying user web sessions in a controlled environment.

The application embeds a browser (webview), routes traffic through a local MITM proxy, records user interactions, and enables offline replay with AI-assisted modifications.

---

## 🚀 Core Features

- Embedded Electron webview browser
- Local MITM proxy integration
- Automatic certificate installation (sandboxed environment)
- User session recording (network + interaction level)
- Offline replay engine
- Element selection & AI-based session modification
- Cross-platform builds (macOS, Windows, Linux)

---

## 🧠 Concept

The goal of Chimera is to provide a programmable browser sandbox where:

1. A user interacts with a website inside a controlled environment
2. All interactions and network traffic are recorded
3. The session can be replayed offline
4. Specific UI elements can be selected
5. AI prompts can modify the recorded behavior

This makes it possible to experiment with:
- UX automation
- Prompt-driven test modifications
- Behavioral replay simulations
- AI-assisted workflow adjustments

---

## 🏗 Architecture Overview

Frontend responsibilities:

- Electron app lifecycle management
- Webview isolation
- Certificate management via `node-forge`
- Local SQLite storage via `better-sqlite3`
- Communication with ChimeraBackend
- Replay visualization layer

The frontend acts as a sandbox shell, while the backend handles AI processing and persistent state management.

---

## 🛠 Tech Stack

- Electron 34
- better-sqlite3
- node-forge
- electron-builder
- electron-packager

---
