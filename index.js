console.log("hi there");
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3,
  Color3,
  StandardMaterial
} from "./node_modules/babylonjs/es6.js";

const canvas = document.getElementById("scene");

const engine = new Engine(canvas, true);

const scene = new Scene(engine);
scene.clearColor = new Color3(1, 0.8, 0.2);

const camera = new ArcRotateCamera(
  "cam",
  Math.PI / 2,
  Math.PI / 2,
  2,
  Vector3.Zero()
);
camera.attachControl(canvas, true);

const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);

const trunk = new MeshBuilder.CreateCylinder(
  "trunk",
  { height: 2, diameterTop: 0.7, diameterBottom: 1.0, tessellation: 5 },
  scene
);

const ground = new MeshBuilder.CreateGround(
  "ground",
  {
    width: 12,
    height: 12,
    subdivisions: 3
  },
  scene
);

trunk.position = new Vector3(0, 0.5, 0);
const material = new StandardMaterial("trunkMaterial", scene);
material.diffuseColor = new Color3(0.6, 0.6, 0.6);
material.specularColor = new Color3(0.1, 0.1, 0.1);
trunk.material = material;

engine.runRenderLoop(() => {
  scene.render();
});
