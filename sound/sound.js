const ctx = new AudioContext();

const modulatorOsc = ctx.createOscillator();
modulatorOsc.type = "sine";
modulatorOsc.frequency.value = 770;

// often described as "depth"
const modulatorGain = ctx.createGain();
modulatorGain.gain.value = 1000;

modulatorOsc.connect(modulatorGain);

const carrierOsc = ctx.createOscillator();
carrierOsc.type = "sine";
// NOTE: to future self - NEVER EVER set 'frequency = 440', do 'frequency.value = 440'
//   anything else seems to 'destroy' the AudioParam functionality and prevents FM variation
carrierOsc.frequency.value = 800;

const carrierGain = ctx.createGain();
carrierGain.gain.value = 0;

modulatorGain.connect(carrierOsc.detune);

carrierOsc.connect(carrierGain).connect(ctx.destination);

modulatorOsc.start();
carrierOsc.start();

document.addEventListener("keydown", event => {
  if (event.key === "m") {
    console.log("m");
  } else {
    carrierGain.gain.value = 1;
  }
});

document.addEventListener("keyup", event => {
  if (event.key === "m") {
    console.log("m");
  } else {
    carrierGain.gain.value = 0;
  }
});
