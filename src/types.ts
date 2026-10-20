// src/types.ts
export enum GameState {
    Menu,
    Playing,
    Paused,
    LevelComplete,
    GameOver
}

export enum PowerupType {
    Wide,
    Multi,
    Slow,
    ExtraLife
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}