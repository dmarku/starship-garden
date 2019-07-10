import {
  TransformNode,
  Mesh,
  StandardMaterial,
  Scene,
  MeshBuilder,
  Matrix,
  Vector3,
  ActionManager
} from "@babylonjs/core";

import { TreeParameters } from "./ITreeParameters";

export class TreeGraphics extends TransformNode {
  public actionManager: ActionManager;
  public trunk: Mesh;
  public crown: Mesh;
  public material: StandardMaterial;

  constructor(
    name: string,
    options: TreeParameters,
    material: StandardMaterial,
    scene: Scene
  ) {
    super(name, scene);

    const height = 1;
    const crownDiameter = 2.5;

    this.material = material.clone(`tree material for ${name}`);

    this.trunk = MeshBuilder.CreateCylinder(
      "trunk",
      {
        height,
        diameterTop: 0.7,
        diameterBottom: 1.0,
        tessellation: 12,
        updatable: true
      },
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
    this.crown.parent = this;

    this.update(options.size);
    // this is the tree's "root" in the sense of scene hierarchy, not biology
    this.position = options.position
      ? new Vector3(options.position.x, options.position.y, options.position.z)
      : Vector3.Zero();

    this.actionManager = new ActionManager(scene);
    this.trunk.actionManager = this.actionManager;
    this.crown.actionManager = this.actionManager;
  }

  update(size: number) {
    this.trunk.scaling.set(0.2 * size, size, 0.2 * size);
    this.crown.scaling.setAll(0.2 * size);
    this.crown.position.y = size;
  }
}
