import { Engine } from "babylonjs";

interface GameWindow extends Window {
  canvas: HTMLCanvasElement,
  engine: Engine
}

export default GameWindow;