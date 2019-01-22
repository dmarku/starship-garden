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
scene.clearColor = new Color4(1, 0.8, 0.2, 1);

const camera = new ArcRotateCamera(
  "cam",
  Math.PI / 2,
  Math.PI / 2,
  2,
  Vector3.Zero(),
  scene
);
camera.attachControl(canvas, true);

const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);

const height = 2;
const trunk = MeshBuilder.CreateCylinder(
  "trunk",
  { height, diameterTop: 0.7, diameterBottom: 1.0, tessellation: 5 },
  scene
);
// offset by y so that the trunk's base is centered at its local origin
trunk.bakeTransformIntoVertices(Matrix.Translation(0, 0.5 * height, 0));

const ground = MeshBuilder.CreateGround(
  "ground",
  { width: 12, height: 12, subdivisions: 3 },
  scene
);

const material = new StandardMaterial("trunkMaterial", scene);
material.diffuseColor = new Color3(0.6, 0.6, 0.6);
material.specularColor = new Color3(0.1, 0.1, 0.1);
trunk.material = material;

engine.runRenderLoop(() => {
  scene.render();
});
