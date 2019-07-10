interface AdsrOptions extends GainOptions {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export class FMSynth {
  private gainAdsr: AdsrNode;
  private modulationAdsr: AdsrNode;

  constructor(context: AudioContext, output: AudioNode) {
    const osc = new OscillatorNode(context, { type: "sine", frequency: 391 });

    const adsrOptions = {
      attack: 0.1,
      decay: 1,
      sustain: 0.3,
      release: 2
    };

    this.gainAdsr = new AdsrNode(context, adsrOptions);

    const mod = new OscillatorNode(context, { type: "sine", frequency: 387 });
    this.modulationAdsr = new AdsrNode(context, adsrOptions);
    const modWidth = new GainNode(context, { gain: 391 * 3 });

    mod.connect(modWidth).connect(osc.frequency);
    mod.start();

    osc.connect(this.gainAdsr).connect(output);
    osc.start();
  }

  trigger() {
    this.gainAdsr.trigger();
    this.modulationAdsr.trigger();
  }

  release() {
    this.gainAdsr.release();
    this.modulationAdsr.release();
  }
}

export class AdsrNode extends GainNode {
  private attackTime: number;
  private decayTime: number;
  private sustainLevel: number;
  private releaseTime: number;

  constructor(ctx: AudioContext, options: AdsrOptions) {
    super(ctx, { ...options, gain: 0 });
    this.attackTime = options.attack * 0.25;
    this.decayTime = options.decay * 0.25;
    this.sustainLevel = options.sustain;
    this.releaseTime = options.release * 0.25;
  }

  trigger() {
    const now = this.context.currentTime;
    this.gain
      .cancelScheduledValues(now)
      .setTargetAtTime(1, now, this.attackTime)
      .setTargetAtTime(
        this.sustainLevel,
        now + this.attackTime,
        this.decayTime
      );
  }

  release() {
    const now = this.context.currentTime;
    this.gain.setTargetAtTime(0, now, this.releaseTime);
  }
}
