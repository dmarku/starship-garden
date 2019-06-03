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

new ArcRotateCamera("cam", 0, 0.32 * Math.PI, 30, Vector3.Zero(), scene);
//camera.attachControl(canvas, true);

new HemisphericLight("light", new Vector3(1, 1, 0), scene);

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
  public material: StandardMaterial;

  constructor(name: string, scene: Scene) {
    super(name, scene);

    const height = 2;
    const crownDiameter = 2.5;

    this.material = treeMaterial.clone(`tree material for ${name}`);

    this.trunk = MeshBuilder.CreateCylinder(
      "trunk",
      { height, diameterTop: 0.7, diameterBottom: 1.0, tessellation: 12 },
      scene
    );
    // offset by y so that the trunk's base is centered at its local origin
    this.trunk.bakeTransformIntoVertices(
      Matrix.Translation(0, 0.5 * height, 0)
    );
    this.trunk.material = this.material;
    this.trunk.parent = this;

    this.crown = MeshBuilder.CreateSphere(
      "crown",
      { diameter: crownDiameter },
      scene
    );
    // center = trunk height + crown radius
    this.crown.position.y = height + 0.5 * crownDiameter;
    this.crown.material = this.material;
    this.crown.parent = this.trunk;
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
  public root: TreeGraphics;
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
    const size = options.size || 0.3;
    ////////////////////////////////////////////////////////
    // setup graphics

    const root = new TreeGraphics("tree", scene);

    // this is the tree's "root" in the sense of scene hierarchy, not biology
    root.position = options.position
      ? new Vector3(options.position.x, options.position.y, options.position.z)
      : Vector3.Zero();

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

    actionManager.registerAction(
      new ExecuteCodeAction(
        { trigger: ActionManager.OnPointerOverTrigger },
        () => focusTree(this)
      )
    );

    actionManager.registerAction(
      new ExecuteCodeAction(
        { trigger: ActionManager.OnPointerOutTrigger },
        () => blurTree(this)
      )
    );

    root.trunk.actionManager = actionManager;
    root.crown.actionManager = actionManager;

    root.position = options.position
      ? new Vector3(options.position.x, options.position.y, options.position.z)
      : Vector3.Zero();

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

let focusedTree: Tree | null = null;

function focusTree(tree: Tree) {
  if (focusedTree !== tree) {
    if (focusedTree) {
      focusedTree.root.material.emissiveColor = Color3.Black();
    }

    focusedTree = tree;

    if (tool === "Tree Remover") {
      tree.root.material.emissiveColor = Color3.Red();
    } else if (tool === "Fertilizer") {
      tree.root.material.emissiveColor = Color3.Green();
    } else {
      tree.root.material.emissiveColor = Color3.Gray();
    }
  }
}

function blurTree(tree: Tree) {
  if (tree === focusedTree) {
    tree.root.material.emissiveColor = Color3.Black();
    focusedTree = null;
  }
}

function toggleTool(newTool: Tool) {
  if (tool !== newTool) {
    tool = newTool;
    console.log(`${newTool} selected`);

    // purely visual changes
    if (focusedTree) {
      if (tool === "Tree Remover") {
        focusedTree.root.material.emissiveColor = Color3.Red();
      } else if (tool === "Fertilizer") {
        focusedTree.root.material.emissiveColor = Color3.Green();
      } else {
        focusedTree.root.material.emissiveColor = Color3.Gray();
      }
    }
  } else {
    tool = null;
    if (focusedTree) {
      focusedTree.root.material.emissiveColor = Color3.Gray();
    }
    console.log("no tool selected");
  }

  if (toolDisplay) {
    toolDisplay.innerText = tool ? tool : "Nothing";
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

const noToolButton = document.getElementById("select-nothing"),
  seedToolButton = document.getElementById("select-seed"),
  fertilizeToolButton = document.getElementById("select-fertilize"),
  removeToolButton = document.getElementById("select-remove");

const toolDisplay = document.getElementById('tool-display');

if (noToolButton) noToolButton.addEventListener("click", () => toggleTool(null));
if ( seedToolButton) seedToolButton.addEventListener("click", () => toggleTool("Seed Placement"));
if (fertilizeToolButton) fertilizeToolButton.addEventListener("click", () => toggleTool("Fertilizer"));
if (removeToolButton) removeToolButton.addEventListener("click", () => toggleTool("Tree Remover"));

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
