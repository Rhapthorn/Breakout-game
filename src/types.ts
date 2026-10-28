// src/types.ts
export enum GameState {
    Menu,
    Playing,
    Paused,
    GameOver,
    GameCompleted,
    LevelComplete,
    Leaderboard,
    Options,
    EnterInitials
}

export enum PowerupType {
    Wide,
    Multi,
    Slow,
    ExtraLife,
    Magnetic,
    Laser
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

