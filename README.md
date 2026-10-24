[project_readme_v2_5_0.md](https://github.com/user-attachments/files/33901856/project_readme_v2_5_0.md)
# Galactic Breakout (v2.5.0)

A modern, Windows-friendly desktop reimagining of the classic arcade game Breakout, built with HTML5 Canvas, TypeScript, and Electron.

## Overview

This project elevates the traditional brick-breaking formula with an escalating 15-level campaign, intense multi-phase FSM boss encounters, and a physics-driven combo system. Packaged as a native Windows desktop application via `electron-builder`, it features a locked 800x600 arcade-style resolution, custom iconography, and robust local file-based data persistence for a seamless standalone experience.

## Key Features in v2.5.0

* **Persistent High Scores & Boss Progression:** Implemented a lightweight, zero-dependency Node.js file storage system (`game_data.json`) via Electron IPC. The app now tracks top pilot high scores and records lifetime boss kill counts securely without requiring native C++ database bindings.
* **15-Level Campaign & FSM Boss Fights:** Progressive difficulty scaling, culminating in challenging Finite State Machine (FSM) boss encounters featuring 4 distinct attack patterns (Radial Bursts, Shield Minions, Orbital Strikes, and Gravity Orbs) across dual phases.
* **Dynamic Visuals:** A continuous parallax starfield with background colors that shift and intensify as the player advances through the galaxy, complete with dynamic particle effects and invulnerability flashing.
* **Physics & Combo System:** Angle-based ball deflection, hit-stop mechanics on impact, and score multipliers for consecutive brick destructions.
* **Power-Up Arsenal:** 
  * 🟦 **Wide:** Expands paddle width.
  * 🟩 **Multi:** Spawns additional active balls.
  * 🟪 **Slow:** Temporarily reduces ball velocity.
  * 🟥 **Laser:** Equips the paddle with dual-firing lasers to melt through bricks and bosses.
  * 🟨 **Magnetic:** Catches and holds the ball on the paddle for tactical relaunching.
  * 💗 **Extra Life:** Grants a 1-Up.
* **Native Windows Integration:** Built-in IPC communication bridge between the Electron main process and the game engine, packaged cleanly for standalone execution.

## Tech Stack

* **Core Engine:** TypeScript, HTML5 Canvas API (No external game engines)
* **Build Tooling:** Vite
* **Desktop Environment:** Electron, Node.js `fs` IPC storage module

## Controls

* **A / D** or **Left / Right Arrows:** Move Paddle
* **Mouse:** Move Paddle (Alternative)
* **Space / Left Click:** Launch Ball / Start Game / Next Level
* **Escape:** Pause Game
* **M:** Toggle Audio Mute

## Installation & Development

To run this project locally, modify the source code, or compile your own Windows installer, you will need Node.js installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/breakout-game.git
   cd breakout-game
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run Web Version (Vite):**
   ```bash
   npm run dev
   ```

4. **Run Desktop App (Electron):**
   ```bash
   npm run app:dev
   ```

5. **Compile Windows Installer (.exe):**
   ```bash
   npm run app:build
   ```
   *The compiled installer will be generated inside the `/release` directory.*
