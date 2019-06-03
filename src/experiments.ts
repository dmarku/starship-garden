function audio_v1(ctx: AudioContext) {
  const carrier = new OscillatorNode(ctx, {
    type: "sine"
  });
  carrier.connect(master);
  carrier.start();

  const baseFrequency = new ConstantSourceNode(ctx, {
    offset: 0
  });

  baseFrequency.start();
  baseFrequency.connect(carrier.frequency);

  const modRatio = new GainNode(ctx, {
    gain: 4 / 5
  });

  const modulator = new OscillatorNode(ctx, {
    frequency: 205,
    type: "sine"
  });
  modulator.start();

  baseFrequency.connect(modRatio).connect(modulator.frequency);

  const modWidth = new GainNode(ctx, {
    gain: 880
  });

  modulator.connect(modWidth).connect(carrier.frequency);

  const longTermModulator = new OscillatorNode(ctx, {
    type: "sine",
    frequency: 1 / 6
  });
  longTermModulator.start();

  const longTermModWidth = new GainNode(ctx, {
    gain: 220 / 0.5
  });

  longTermModulator.connect(longTermModWidth).connect(carrier.frequency);

  const filter = new BiquadFilterNode(ctx, {
    type: "bandpass",
    frequency: 1320
  });

  const carrierGain = new GainNode(ctx, { gain: 0.5 });

  carrier
    .connect(filter)
    .connect(carrierGain)
    .connect(master);
}

function audio_v2(ctx: AudioContext) {
  const f = 391.65;
  const type = "sine";

  const noiseGen = noise(ctx);
  noiseGen.connect(master);
  //noiseGen.start();

  const base = new OscillatorNode(ctx, {
    type,
    frequency: 850
  });

  const terz = new OscillatorNode(ctx, {
    type,
    frequency: f
  });

  const quinte = new OscillatorNode(ctx, {
    type,
    frequency: (3 / 2) * f
  });

  const baseEnv = new GainNode(ctx, {
    gain: 0.5
  });

  const baseEnvOsc = new OscillatorNode(ctx, {
    type: "sine",
    frequency: 1 / (5 * 10)
  });

  const baseEnvOscWidth = new GainNode(ctx, {
    gain: 0.3
  });

  baseEnvOsc.start();
  baseEnvOsc.connect(baseEnvOscWidth).connect(baseEnv.gain);

  /*
  const terzEnv = new GainNode(ctx, {
    gain: 0.3
  });

  const terzEnvOsc = new OscillatorNode(ctx, {
    type: "sine",
    frequency: 1 / (7 * 10)
  });

  const terzEnvOscWidth = new GainNode(ctx, {
    gain: 0.3
  });

  terzEnvOsc.start();
  terzEnvOsc.connect(terzEnvOscWidth).connect(terzEnv.gain);

  const quinteEnv = new GainNode(ctx, {
    gain: 0.2
  });

  const quinteEnvOsc = new OscillatorNode(ctx, {
    type: "sine",
    frequency: 1 / (11 * 10)
  });

  const quinteEnvOscWidth = new GainNode(ctx, {
    gain: 0.3
  });

  quinteEnvOsc.start();
  quinteEnvOsc.connect(quinteEnvOscWidth).connect(quinteEnv.gain);
  */

  const mix = new GainNode(ctx);

  base.connect(baseEnv).connect(mix);
  /*
  terz.connect(terzEnv).connect(mix);
  quinte.connect(quinteEnv).connect(mix);
  */

  const lopass = new BiquadFilterNode(ctx, {
    type: "lowpass",
    frequency: 2 * f
  });

  base.start();
  terz.start();
  quinte.start();

  mix.connect(lopass).connect(master);
}

function noise(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < buffer.length; ++i) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseGenerator = ctx.createBufferSource();
  noiseGenerator.buffer = buffer;
  noiseGenerator.loop = true;
  return noiseGenerator;
}
