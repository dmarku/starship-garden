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
  Color4
} from "@babylonjs/core";

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
camera.attachControl(canvas, true);

const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);

const height = 2;
const trunk = MeshBuilder.CreateCylinder(
  "trunk",
  { height, diameterTop: 0.7, diameterBottom: 1.0, tessellation: 12 },
  scene
);
// offset by y so that the trunk's base is centered at its local origin
trunk.bakeTransformIntoVertices(Matrix.Translation(0, 0.5 * height, 0));

const ground = MeshBuilder.CreateGround(
  "ground",
  { width: 25, height: 25, subdivisions: 3 },
  scene
);

const groundMaterial = new StandardMaterial("groundMaterial", scene);
groundMaterial.diffuseColor = Color3.FromHexString("#edb76d");
ground.material = groundMaterial;

const material = new StandardMaterial("trunkMaterial", scene);
material.diffuseColor = new Color3(0.6, 0.6, 0.6);
material.specularColor = new Color3(0.1, 0.1, 0.1);
trunk.material = material;

engine.runRenderLoop(() => {
  scene.render();
});

camera.onViewMatrixChangedObservable.add(cam => {
  console.log(`POS: ${camera.globalPosition};  ROT: ${camera.rotation}`);
});
