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
  ExecuteCodeAction,
  Mesh
} from "@babylonjs/core";

// cache halftones from C1 - C7
let notes: number[] = [];
for (let halftones = -57; halftones < 28; halftones++) {
  notes.push(440 * Math.pow(2, halftones / 12));
}

// finds the closest frequency match in the notes array
function roundToChromatic(frequency: number): number {
  return notes.reduce(
    (best, current) =>
      Math.abs(current - frequency) < Math.abs(best - frequency)
        ? current
        : best,
    Infinity
  );
}

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
  position?: { x: number; y: number; z: number };
  size?: number;
}

interface ITree {
  root: TransformNode;
  audio: {
    carrier: OscillatorNode;
    envelopeFrequency: AudioParam;
    frequency: AudioParam;
  };
  size: number;
}

class TreeGraphics extends TransformNode {
  public trunk: Mesh;
  public crown: Mesh;
  public handle: Mesh;

  constructor(name: string, scene: Scene, size: number = 0.3) {
    super(name, scene);

    const height = 2;

    this.trunk = MeshBuilder.CreateCylinder(
      "trunk",
      { height, diameterTop: 0.7, diameterBottom: 1.0, tessellation: 12 },
      scene
    );
    // offset by y so that the trunk's base is centered at its local origin
    this.trunk.bakeTransformIntoVertices(
      Matrix.Translation(0, 0.5 * height, 0)
    );
    this.trunk.material = treeMaterial;
    this.trunk.parent = this;

    this.crown = MeshBuilder.CreateSphere("crown", { diameter: 2.5 }, scene);
    // center = trunk height + crown radius
    this.crown.position.y = 2 + 1.25;
    this.crown.material = treeMaterial;
    this.crown.parent = this.trunk;

    this.handle = MeshBuilder.CreateSphere(
      "trunk size handle",
      { diameter: 1, segments: 4 },
      scene
    );
    this.handle.position.y = 1;
    this.handle.position.z = size;
    this.handle.material = handleMaterial;
    this.handle.parent = this;
  }
}

function getFrequency(size: number): number {
  // let's assume reasonable scaling factors go from 0.1 to 10
  // set frequencies between 220 and 880 hertz (so that two orders of magnitude ~ two octaves)
  // map [0.1, 10] -> [0, 1]
  const s = (10 - size) / (10 - 0.1);

  // map exponentially [0, 1] -> [0, 1]
  const factor = (Math.exp(s) - 1) / (Math.E - 1);
  const frequency = factor * 2093.0 /* C7 */ + (1 - factor) * 32.7; /* C1 */
  return roundToChromatic(frequency);
}

function getEnvelopeFrequency(size: number): number {
  // for explanation, see `getFrequency()`
  const s = (10 - size) / (10 - 0.1);
  const factor = (Math.exp(s) - 1) / (Math.E - 1);
  return (factor * 1) / 5 + ((1 - factor) * 1) / 51;
}

class Tree implements ITree {
  public root: TransformNode & { trunk: TransformNode };
  public audio: ITree["audio"];
  public size: number;

  private carrierFrequency: ConstantSourceNode;
  private envelopeFrequency: ConstantSourceNode;

  constructor(
    options: TreeOptions,
    scene: Scene,
    ctx: AudioContext,
    output: AudioNode
  ) {
    ////////////////////////////////////////////////////////
    // setup graphics

    ////////////////////////////////////////////////////////
    // setup audio

    const size = options.size || 0.3;

    const root = new TreeGraphics("tree", scene, size);

    // this is the tree's "root" in the sense of scene hierarchy, not biology
    root.position = options.position
      ? new Vector3(options.position.x, options.position.y, options.position.z)
      : Vector3.Zero();

    const carrier = new OscillatorNode(ctx, { type: "sine", frequency: 0 });

    const envelope = new GainNode(ctx, { gain: 0.15 });
    const envOsc = new OscillatorNode(ctx, { type: "sine", frequency: 0 });
    const envOscWidth = new GainNode(ctx, { gain: 0.1 });

    envOsc.connect(envOscWidth).connect(envelope.gain);
    carrier.connect(envelope).connect(output);
    carrier.start();
    envOsc.start();

    this.carrierFrequency = new ConstantSourceNode(ctx, {
      offset: getFrequency(size)
    });
    this.carrierFrequency.start();
    this.carrierFrequency.connect(carrier.frequency);

    this.envelopeFrequency = new ConstantSourceNode(ctx, {
      offset: getEnvelopeFrequency(size)
    });
    this.envelopeFrequency.start();
    this.envelopeFrequency.connect(envOsc.frequency);

    ////////////////////////////////////////////////////////
    // setup interaction

    const actionManager = new ActionManager(scene);
    actionManager.registerAction(
      new ExecuteCodeAction(
        {
          trigger: ActionManager.OnPickUpTrigger
        },
        () => {
          if (tool === "Tree Remover") {
            removeTree(this);
          }
          if (tool === "Fertilizer") {
            this.grow();
          }
        }
      )
    );

    root.trunk.actionManager = actionManager;
    root.crown.actionManager = actionManager;

    let origin: Vector3;
    let startSize: number;
    let startDistance: number;
    root.trunk.scaling.setAll(size);

    const handleBehavior = new PointerDragBehavior({
      dragPlaneNormal: Vector3.Up()
    });

    handleBehavior.onDragStartObservable.add(event => {
      startDistance = event.dragPlanePoint.subtract(origin).length();
      startSize = this.size;
    });

    handleBehavior.onDragObservable.add(event => {
      const distance = event.dragPlanePoint.subtract(origin).length();
      this.size = (startSize * distance) / startDistance;

      root.trunk.scaling.setAll(this.size);
      this.carrierFrequency.offset.value = getFrequency(this.size);
      this.envelopeFrequency.offset.value = getEnvelopeFrequency(this.size);
    });

    handleBehavior.onDragEndObservable.add(() => {
      save();
    });

    handleBehavior.useObjectOrienationForDragging = false;
    handleBehavior.attach(root.handle);

    root.position = options.position
      ? new Vector3(options.position.x, options.position.y, options.position.z)
      : Vector3.Zero();
    origin = Vector3.TransformCoordinates(
      new Vector3(0, 1, 0),
      root.getWorldMatrix()
    );
    // placeholder for audio props
    const audio = {
      carrier,
      frequency: this.carrierFrequency.offset,
      envelopeFrequency: this.envelopeFrequency.offset
    };

    this.root = root;
    this.size = size;
    this.audio = audio;
  }

  toJson() {
    return {
      position: {
        x: this.root.position.x,
        y: this.root.position.y,
        z: this.root.position.z
      },
      size: this.size
    };
  }

  grow() {
    this.size += 1;

    this.root.trunk.scaling.setAll(this.size);
    this.carrierFrequency.offset.value = getFrequency(this.size);
    this.envelopeFrequency.offset.value = getEnvelopeFrequency(this.size);
    save();
  }
}

function removeTree(tree: Tree) {
  tree.root.dispose();
  tree.audio.carrier.stop();
  trees = trees.filter(t => t !== tree);
  save();
}

const ctx = new AudioContext();

const master = ctx.createGain();
master.gain.value = 0.25;
master.connect(ctx.destination);

let trees: Tree[] = [];

function save() {
  localStorage.setItem("scene", serialize());
}

function load() {
  const serializedScene = localStorage.getItem("scene");
  trees = serializedScene ? deserialize(serializedScene) : defaultScene();
}

function serialize(): string {
  const data = trees.map(tree => ({
    position: {
      x: tree.root.position.x,
      y: tree.root.position.y,
      z: tree.root.position.z
    },
    size: tree.size
  }));
  return JSON.stringify(data);
}

function deserialize(json: string) {
  const data = JSON.parse(json) as any[];
  // TODO: clear everything before
  return data.map(
    parameters =>
      new Tree(
        {
          ...parameters,
          position: new Vector3(
            parameters.position.x,
            parameters.position.y,
            parameters.position.z
          )
        },
        scene,
        ctx,
        master
      )
  );
}

function defaultScene(): Tree[] {
  return [
    new Tree({ position: new Vector3(0, 0, -3), size: 1 }, scene, ctx, master),
    new Tree({ position: new Vector3(0.5, 0, 5), size: 3 }, scene, ctx, master)
  ];
}

type Tool = null | "Seed Placement" | "Tree Remover" | "Fertilizer";
let tool: Tool = null;

function toggleTool(newTool: Tool) {
  if (tool !== newTool) {
    tool = newTool;
    console.log(`${newTool} selected`);
  } else {
    tool = null;
    console.log("no tool selected");
  }
}

scene.actionManager = new ActionManager(scene);
scene.actionManager.registerAction(
  new ExecuteCodeAction(
    { trigger: ActionManager.OnKeyUpTrigger, parameter: "s" },
    () => toggleTool("Seed Placement")
  )
);

scene.actionManager.registerAction(
  new ExecuteCodeAction(
    { trigger: ActionManager.OnKeyUpTrigger, parameter: "d" },
    () => toggleTool("Tree Remover")
  )
);

scene.actionManager.registerAction(
  new ExecuteCodeAction(
    { trigger: ActionManager.OnKeyUpTrigger, parameter: "f" },
    () => toggleTool("Fertilizer")
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
        trees.push(
          new Tree(
            { position: result.pickedPoint || Vector3.Zero() },
            scene,
            ctx,
            master
          )
        );
        console.log("seed placed");
        save();
      }
    }
  })
);

load();

engine.runRenderLoop(() => {
  scene.render();
});

function onVisibilityChange() {
  if (document.hidden) {
    ctx.suspend();
  } else {
    ctx.resume();
  }
}

document.addEventListener("visibilitychange", onVisibilityChange);
// trigger once for initialization
onVisibilityChange();

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

interface AdsrOptions extends GainOptions {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

class AdsrNode extends GainNode {
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
    const now = ctx.currentTime;
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
    const now = ctx.currentTime;
    this.gain.setTargetAtTime(0, now, this.releaseTime);
  }
}

const osc = new OscillatorNode(ctx, { type: "sine", frequency: 391 });

const adsrOptions = {
  attack: 0.1,
  decay: 1,
  sustain: 0.3,
  release: 2
};

const adsr = new AdsrNode(ctx, adsrOptions);

const mod = new OscillatorNode(ctx, { type: "sine", frequency: 387 });
const modAdsr = new AdsrNode(ctx, adsrOptions);
const modWidth = new GainNode(ctx, { gain: 391 * 3 });

mod.connect(modWidth).connect(osc.frequency);
mod.start();

osc.connect(adsr).connect(master);
osc.start();

document.addEventListener("keydown", ev => {
  if (ev.key === "g" && !ev.repeat) {
    adsr.trigger();
    modAdsr.trigger();
  }
});

document.addEventListener("keyup", ev => {
  if (ev.key === "g") {
    adsr.release();
    modAdsr.release();
  }
});
