export enum GameEventType {
  // type only
  NoneEvent,
  ButtonZoomIn,
  ButtonZoomOut,
  ButtonJoinRoom,
  ButtonSendTurn,
  ButtonQuitGame,
}

export type TypeOnlyEvent =
  | GameEventType.NoneEvent
  | GameEventType.ButtonZoomIn
  | GameEventType.ButtonZoomOut
  | GameEventType.ButtonJoinRoom
  | GameEventType.ButtonSendTurn
  | GameEventType.ButtonQuitGame

export type GameEvent =
  | {
      type: TypeOnlyEvent;
    }
