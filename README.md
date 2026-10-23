[project_readme.md](https://github.com/user-attachments/files/33871809/project_readme.md)
# Breakout

A modern, Windows-friendly desktop reimagining of the classic arcade game Breakout, built with HTML5 Canvas, TypeScript, and Electron.

## Overview

This project elevates the traditional brick-breaking formula with an escalating 15-level campaign, intense multi-phase FSM boss encounters, and a physics-driven combo system. Packaged as a native Windows desktop application via `electron-builder`, it features a locked 800x600 arcade-style resolution, custom iconography, and persistent state saving for a seamless standalone experience.

## Key Features

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
* **Persistent Progress:** Automatic save states via `localStorage` on level transitions and player death. The save data cleanly wipes upon a Game Over or campaign victory.
* **Native Windows Installer:** Fully packaged `.exe` installer generated via NSIS, completely decoupled from the browser environment.

## Tech Stack

* **Core Engine:** TypeScript, HTML5 Canvas API (No external game engines)
* **Build Tooling:** Vite
* **Desktop Environment:** Electron, electron-builder

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
   *The compiled `Breakout Setup 1.0.0.exe` installer will be generated inside the `/release` directory.*
