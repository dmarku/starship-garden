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
  TransformNode
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
camera.attachControl(canvas, true);

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

// this is the tree's "root" in the sense of scene hierarchy, not biology
const root = new TransformNode("tree");

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
crown.parent = root;
// center = trunk height + crown radiussessions
crown.position.y = 2 + 1.25;
crown.material = treeMaterial;

const handleMaterial = new StandardMaterial("handleMaterial", scene);
handleMaterial.diffuseColor = new Color3(1, 1, 1);

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
trunkSizeHandle.parent = root;
trunkSizeHandle.material = handleMaterial;

(() => {
  let origin = trunkSizeDonut.position;
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
    trunk.scaling = startScale.scale(distance / startDistance);
  });

  handleBehavior.useObjectOrienationForDragging = false;
  handleBehavior.attach(trunkSizeHandle);
})();

engine.runRenderLoop(() => {
  scene.render();
});
