// src/engine/FSM.ts
export interface IState<T> {
    enter(entity: T): void;

    update(entity: T, dt: number): void;

    exit(entity: T): void;
}

export class StateMachine<T> {
    private currentState: IState<T> | null = null;
    private entity: T;

    constructor(entity: T) {
        this.entity = entity;
    }

    public changeState(newState: IState<T>): void {
        if (this.currentState) {
            this.currentState.exit(this.entity);
        }
        this.currentState = newState;
        this.currentState.enter(this.entity);
    }

    public update(dt: number): void {
        if (this.currentState) {
            this.currentState.update(this.entity, dt);
        }
    }
}