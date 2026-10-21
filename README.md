# Breakout Engine

A high-performance, strictly typed Breakout/Arkanoid clone built from scratch using TypeScript and the HTML5 Canvas 2D API. It features a custom engine with sub-stepped continuous collision detection (CCD), procedural audio, and a zero-allocation particle system, wrapped into a native Windows executable via Electron.

## Features

*   **Custom Physics Engine:** Fixed-timestep game loop (60 Hz) with sub-stepped continuous collision detection to prevent high-velocity tunneling.
*   **Game Feel & "Juice":** Includes 40ms "hit-stop" freezes on heavy impacts, dynamic screen shake, and velocity-based ghost trails for the ball.
*   **Procedural Audio:** Sound effects are synthesized at runtime using the Web Audio API (oscillators and gain nodes)—no external audio files required.
*   **Zero-Allocation Particles:** Object-pooled particle system ensures no garbage collection spikes during dense visual effects.
*   **Power-up System:** Timed mechanics including Wide Paddle, Multi-ball, Slow Ball, and Extra Life.
*   **Responsive Rendering:** Resolution-independent scaling that perfectly maps an 800x600 logical grid to high-DPI (Retina) displays.
*   **Cross-Platform Targets:** Runs natively in the browser via Vite, or as a standalone desktop application via Electron.

## Tech Stack

*   **Core:** TypeScript (Strict Mode), HTML5 Canvas 2D API
*   **Build Tooling:** Vite, ESBuild
*   **Desktop Wrapper:** Electron, Electron-Builder (Targeting Windows `.exe` / NSIS installer)
*   **Environment:** Node 20+

## Getting Started

### Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v20 or higher) installed.

### Installation
Clone the repository and install dependencies:
\`\`\`bash
npm install
\`\`\`

### Available Scripts

**Web Development**
Starts the Vite development server with Hot Module Replacement (HMR).
\`\`\`bash
npm run dev
\`\`\`

**Desktop Development (Electron)**
Compiles the TypeScript source and launches the standalone Electron window.
\`\`\`bash
npm run app:dev
\`\`\`

**Desktop Production Build**
Packages the game into a deployable Windows setup executable (`.exe`). The output is saved to the `/release` directory.
\`\`\`bash
npm run app:build
\`\`\`

## Controls

*   **Mouse / A & D / Left & Right Arrows:** Move Paddle
*   **Space / Click:** Launch Ball / Pause Game
*   **Esc:** Pause Game
*   **M:** Toggle Mute
*   **R:** Restart Game (from Game Over screen)
