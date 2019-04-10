import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3,
  Matrix,
  Color3,
  StandardMaterial,
  Color4,
  PointerDragBehavior,
  TransformNode,
  ActionManager,
  ExecuteCodeAction
} from "@babylonjs/core";

// NOTE TO SELF: y-axis is up!

const canvas = document.getElementById("scene") as HTMLCanvasElement;

const engine = new Engine(canvas, true);

const scene = new Scene(engine);
scene.clearColor = Color4.FromHexString("#8baff3ff");

const camera = new ArcRotateCamera(
  "cam",
  0,
  0.32 * Math.PI,
  30,
  Vector3.Zero(),
  scene
);
//camera.attachControl(canvas, true);

const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);

const ground = MeshBuilder.CreateGround(
  "ground",
  { width: 25, height: 25, subdivisions: 3 },
  scene
);

const groundMaterial = new StandardMaterial("groundMaterial", scene);
groundMaterial.diffuseColor = Color3.FromHexString("#edb76d");
ground.material = groundMaterial;

const treeMaterial = new StandardMaterial("trunkMaterial", scene);
treeMaterial.diffuseColor = Color3.FromHexString("#38d051");
treeMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

const handleMaterial = new StandardMaterial("handleMaterial", scene);
handleMaterial.diffuseColor = new Color3(1, 1, 1);

interface TreeOptions {
  position?: Vector3;
}

interface Tree {
  root: TransformNode;
}

function createTree(
  options: TreeOptions,
  scene: Scene,
  ctx: AudioContext,
  output: AudioNode
) {
  ////////////////////////////////////////////////////////
  // setup graphics

  // this is the tree's "root" in the sense of scene hierarchy, not biology
  const root = new TransformNode("tree", scene);

  const height = 2;

  const trunk = MeshBuilder.CreateCylinder(
    "trunk",
    { height, diameterTop: 0.7, diameterBottom: 1.0, tessellation: 12 },
    scene
  );
  // offset by y so that the trunk's base is centered at its local origin
  trunk.bakeTransformIntoVertices(Matrix.Translation(0, 0.5 * height, 0));
  trunk.material = treeMaterial;
  trunk.parent = root;

  const crown = MeshBuilder.CreateSphere("crown", { diameter: 2.5 }, scene);
  // center = trunk height + crown radius
  crown.position.y = 2 + 1.25;
  crown.material = treeMaterial;
  crown.parent = trunk;

  const trunkSizeDonut = MeshBuilder.CreateTorus(
    "trunk size donut",
    { diameter: 2, thickness: 0.3 },
    scene
  );
  trunkSizeDonut.position.y = 0.5 * height;
  trunkSizeDonut.material = handleMaterial;
  trunkSizeDonut.parent = root;

  const trunkSizeHandle = MeshBuilder.CreateSphere(
    "trunk size handle",
    { diameter: 1, segments: 4 },
    scene
  );
  trunkSizeHandle.position.y = 0.5 * height;
  trunkSizeHandle.position.x = 1;
  trunkSizeHandle.material = handleMaterial;
  trunkSizeHandle.parent = root;

  ////////////////////////////////////////////////////////
  // setup audio

  const carrier = new OscillatorNode(ctx, { type: "sine", frequency: 0 });

  const envelope = new GainNode(ctx, { gain: 0.15 });
  const envOsc = new OscillatorNode(ctx, { type: "sine", frequency: 0 });
  const envOscWidth = new GainNode(ctx, { gain: 0.1 });

  envOsc.connect(envOscWidth).connect(envelope.gain);
  carrier.connect(envelope).connect(output);
  carrier.start();
  envOsc.start();

  const carrierFrequency = new ConstantSourceNode(ctx, {
    offset: getFrequency(1)
  });
  carrierFrequency.start();
  carrierFrequency.connect(carrier.frequency);

  const envelopeFrequency = new ConstantSourceNode(ctx, {
    offset: 1 / 7
  });
  envelopeFrequency.start();
  envelopeFrequency.connect(envOsc.frequency);

  function getFrequency(scale: number): number {
    // let's assume reasonable scaling factors go from 0.1 to 10
    // set frequencies between 220 and 880 hertz (so that two orders of magnitude ~ two octaves)
    // map [0.1, 10] -> [0, 1]
    const s = (10 - scale) / (10 - 0.1);

    // map exponentially [0, 1] -> [0, 1]
    const factor = (Math.exp(s) - 1) / (Math.E - 1);
    return factor * 1046.5 /* C6 */ + (1 - factor) * 32.7 /* C1 */;
  }

  let origin: Vector3;
  let startScale: Vector3;
  let startDistance: number;

  const handleBehavior = new PointerDragBehavior({
    dragPlaneNormal: Vector3.Up()
  });

  handleBehavior.onDragStartObservable.add(event => {
    startDistance = event.dragPlanePoint.subtract(origin).length();
    startScale = trunk.scaling;
  });

  handleBehavior.onDragObservable.add(event => {
    const distance = event.dragPlanePoint.subtract(origin).length();
    const scaling = distance / startDistance;

    trunk.scaling = startScale.scale(scaling);
    carrierFrequency.offset.value = getFrequency(trunk.scaling.x);
  });

  handleBehavior.useObjectOrienationForDragging = false;
  handleBehavior.attach(trunkSizeHandle);

  root.position = options.position || Vector3.Zero();
  origin = Vector3.TransformCoordinates(
    trunkSizeDonut.position,
    root.getWorldMatrix()
  );
  // placeholder for audio props
  const audio = { carrier, frequency: carrierFrequency, envelopeFrequency };

  return { root, audio };
}

const ctx = new AudioContext();

const master = ctx.createGain();
master.gain.value = 0.25;
master.connect(ctx.destination);

const trees = [
  createTree({ position: new Vector3(0, 0, -3) }, scene, ctx, master),
  createTree({ position: new Vector3(0.5, 0, 5) }, scene, ctx, master)
];

type Tool = null | "Seed Placement";
let tool: Tool = null;

scene.actionManager = new ActionManager(scene);
scene.actionManager.registerAction(
  new ExecuteCodeAction(
    { trigger: ActionManager.OnKeyUpTrigger, parameter: "s" },
    () => {
      if (tool !== "Seed Placement") {
        tool = "Seed Placement";
        console.log("seeding tool selected");
      } else {
        tool = null;
        console.log("no tool selected");
      }
    }
  )
);

ground.actionManager = new ActionManager(scene);
ground.actionManager.registerAction(
  new ExecuteCodeAction({ trigger: ActionManager.OnPickUpTrigger }, () => {
    if (tool === "Seed Placement") {
      const result = scene.pick(
        scene.pointerX,
        scene.pointerY,
        mesh => mesh === ground
      );
      if (result && result.hit) {
        createTree(
          { position: result.pickedPoint || Vector3.Zero() },
          scene,
          ctx,
          master
        );
        console.log("seed placed");
      }
    }
  })
);

engine.runRenderLoop(() => {
  scene.render();
});

//audio_v1(ctx);
//audio_v2(ctx);

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
