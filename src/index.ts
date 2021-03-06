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
  ExecuteCodeAction
} from "@babylonjs/core";
import { TreeParameters } from "./ITreeParameters";
import { NewTreeGraphics } from "./NewTreeGraphics";
import { FMSynth } from "./audio/FMSynth";

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

const seedIndicator = MeshBuilder.CreateCylinder(
  "seed indicator",
  {
    diameterTop: 0,
    diameterBottom: 0.5,
    height: 1,
    subdivisions: 1,
    tessellation: 4
  },
  scene
);

seedIndicator.rotate(Vector3.Left(), Math.PI);
seedIndicator.bakeTransformIntoVertices(Matrix.Translation(0, -0.5, 0));
seedIndicator.visibility = 0;
const indicatorMaterial = new StandardMaterial("indicatorMaterial", scene);
indicatorMaterial.emissiveColor = Color3.Gray();
seedIndicator.material = indicatorMaterial;

const groundMaterial = new StandardMaterial("groundMaterial", scene);
groundMaterial.diffuseColor = Color3.FromHexString("#edb76d");
ground.material = groundMaterial;

const treeMaterial = new StandardMaterial("trunkMaterial", scene);
treeMaterial.diffuseColor = Color3.FromHexString("#38d051");
treeMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

interface ITree {
  root: TransformNode;
  audio: {
    carrier: OscillatorNode;
    envelopeFrequency: AudioParam;
    frequency: AudioParam;
  };
  size: number;
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
  //public root: TreeGraphics;
  public root: NewTreeGraphics;
  public audio: ITree["audio"];
  public size: number;

  private carrierFrequency: ConstantSourceNode;
  private envelopeFrequency: ConstantSourceNode;

  constructor(
    parameters: TreeParameters,
    scene: Scene,
    ctx: AudioContext,
    output: AudioNode
  ) {
    parameters.size = parameters.size || 2;
    this.size = parameters.size;
    ////////////////////////////////////////////////////////
    // setup graphics

    const root = new NewTreeGraphics("tree", parameters, treeMaterial, scene);

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
      offset: getFrequency(this.size)
    });
    this.carrierFrequency.start();
    this.carrierFrequency.connect(carrier.frequency);

    this.envelopeFrequency = new ConstantSourceNode(ctx, {
      offset: getEnvelopeFrequency(this.size)
    });
    this.envelopeFrequency.start();
    this.envelopeFrequency.connect(envOsc.frequency);

    ////////////////////////////////////////////////////////
    // setup interaction

    const actionManager = root.actionManager;
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

    root.position = parameters.position
      ? new Vector3(
          parameters.position.x,
          parameters.position.y,
          parameters.position.z
        )
      : Vector3.Zero();

    // placeholder for audio props
    const audio = {
      carrier,
      frequency: this.carrierFrequency.offset,
      envelopeFrequency: this.envelopeFrequency.offset
    };

    this.root = root;
    this.audio = audio;
  }

  toJson(): TreeParameters {
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

    this.root.update(this.size);
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

  if (tool === "Seed Placement") {
    seedIndicator.visibility = 1;
  } else {
    seedIndicator.visibility = 0;
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
            { size: 1, position: result.pickedPoint || Vector3.Zero() },
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

const matchIndicatorToCursor = new ExecuteCodeAction(
  { trigger: ActionManager.OnEveryFrameTrigger },
  () => {
    const result = scene.pick(
      scene.pointerX,
      scene.pointerY,
      mesh => mesh === ground
    );
    if (result && result.hit && result.pickedPoint) {
      seedIndicator.position.copyFrom(result.pickedPoint);
    }
  }
);

ground.actionManager.registerAction(
  new ExecuteCodeAction({ trigger: ActionManager.OnPointerOverTrigger }, () => {
    scene.actionManager.registerAction(matchIndicatorToCursor);
  })
);

ground.actionManager.registerAction(
  new ExecuteCodeAction({ trigger: ActionManager.OnPointerOutTrigger }, () => {
    scene.actionManager.unregisterAction(matchIndicatorToCursor);
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

const toolDisplay = document.getElementById("tool-display");

if (noToolButton)
  noToolButton.addEventListener("click", () => toggleTool(null));
if (seedToolButton)
  seedToolButton.addEventListener("click", () => toggleTool("Seed Placement"));
if (fertilizeToolButton)
  fertilizeToolButton.addEventListener("click", () => toggleTool("Fertilizer"));
if (removeToolButton)
  removeToolButton.addEventListener("click", () => toggleTool("Tree Remover"));

const synth = new FMSynth(ctx, master);

document.addEventListener("keydown", ev => {
  if (ev.key === "g" && !ev.repeat) {
    synth.trigger();
  }
});

document.addEventListener("keyup", ev => {
  if (ev.key === "g") {
    synth.release();
  }
});
