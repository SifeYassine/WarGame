import { GameEventType } from "./game-event.js";
import { Notifier } from "./notifier.js";

const AUDIO_PATH = "/assets/sounds.mp3";
const AudioCtx =
  window.AudioContext || ((window as any).webkitAudioContext as AudioContext);

type AudioNodes = {
  audioBuffer: AudioBuffer;
  gainGame: GainNode;
  gainGlobal: GainNode;
  ambient: AudioBufferSourceNode;
};

export class AudioDriver {
  notifier: Notifier;
  audioCtx: AudioContext = new AudioCtx();
  nodes: AudioNodes | null = null;

  cachedGainLevels = {
    global: 0,
    game: 0,
  };

  constructor(notifier: Notifier) {
    fetch(AUDIO_PATH)
      .then((r) => r.arrayBuffer())
      .then((b) => this.audioCtx.decodeAudioData(b))
      .then((a) => this.handleLoaded(a))
      .catch(this.handleFail);
    this.notifier = notifier;
  }

  private handleLoaded = (audio: AudioBuffer) => {
    this.nodes = this.getNodes(audio);
    this.notifier.notify({ type: GameEventType.AudioLoadSuccess });
  };

  private handleFail = () => {
    this.notifier.notify({ type: GameEventType.AudioLoadFail });
  };

  private getNodes(audioBuffer: AudioBuffer): AudioNodes {
    const masterSilencer = this.audioCtx.createGain();
    masterSilencer.gain.value = 0.4;
    const gainGlobal = this.audioCtx.createGain();
    gainGlobal.gain.value = this.cachedGainLevels.global;
    const gainGame = this.audioCtx.createGain();
    gainGame.gain.value = this.cachedGainLevels.game;
    const ambient = this.audioCtx.createBufferSource();
    ambient.buffer = audioBuffer;
    ambient.loopStart = 34.1;
    ambient.loopEnd = 37.2;
    ambient.loop = true;
    ambient.playbackRate.value = 0.85;
    ambient.start(0, 34.1);
    const silencerNode = this.audioCtx.createGain();
    silencerNode.gain.value = 0.2;

    masterSilencer.connect(this.audioCtx.destination);
    gainGlobal.connect(masterSilencer);
    gainGame.connect(gainGlobal);
    silencerNode.connect(gainGame);
    ambient.connect(silencerNode);

    return {
      audioBuffer: audioBuffer,
      gainGame: gainGame,
      gainGlobal: gainGlobal,
      ambient: ambient,
    };
  }

  public setSoundInGame(play: boolean) {
    if (this.nodes === null) {
      this.cachedGainLevels.game = play ? 1 : 0;
      return;
    }
    this.nodes.gainGame.gain.value = play ? 1 : 0;
    if (play && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  public setSoundGlobal(play: boolean) {
    if (this.nodes === null) {
      this.cachedGainLevels.global = play ? 1 : 0;
      return;
    }
    this.nodes.gainGlobal.gain.value = play ? 1 : 0;
    if (play && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }
}
