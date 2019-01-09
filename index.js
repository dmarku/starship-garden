console.log("hi there");
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3
} from "./node_modules/babylonjs/es6.js";

const canvas = document.getElementById("scene");

const engine = new Engine(canvas, true);

const scene = new Scene(engine);

const camera = new ArcRotateCamera(
  "cam",
  Math.PI / 2,
  Math.PI / 2,
  2,
  Vector3.Zero()
);
camera.attachControl(canvas, true);

const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);

//const sphere = new MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
const trunk = new MeshBuilder.CreateCylinder(
  "trunk",
  { height: 1, diameterTop: 0.7, diameterBottom: 1.0 },
  scene
);

trunk.position = new Vector3(0, 0.5, 0);

engine.runRenderLoop(() => {
  scene.render();
});
