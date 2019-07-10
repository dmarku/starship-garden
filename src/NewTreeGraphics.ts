import {
  TransformNode,
  Mesh,
  ActionManager,
  Scene,
  MeshBuilder,
  Matrix,
  StandardMaterial
} from "@babylonjs/core";
import { TreeParameters } from "./ITreeParameters";

export class NewTreeGraphics extends TransformNode {
  private size: number = 1;
  private stem: Mesh;
  public actionManager: ActionManager;
  public material: StandardMaterial;

  private l1Branch: Mesh;
  private l2Branch: Mesh;
  private l3Branch: Mesh;

  constructor(
    name: string,
    parameters: TreeParameters,
    material: StandardMaterial,
    scene: Scene
  ) {
    super(name, scene);
    this.actionManager = new ActionManager(scene);
    this.material = material.clone(`${name}_material`);

    this.stem = MeshBuilder.CreateCylinder(
      `${name}_stem`,
      {
        height: 1,
        diameterTop: 0,
        diameterBottom: 1,
        tessellation: 7
      },
      scene
    );
    this.stem.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0));
    this.stem.parent = this;
    this.stem.material = this.material;
    this.stem.actionManager = this.actionManager;
    this.update(parameters.size);

    this.l1Branch = MeshBuilder.CreateCylinder(
      `${name}_branch_1`,
      { height: 0.5, tessellation: 5, diameterTop: 0, diameterBottom: 0.3 },
      scene
    );
    this.l1Branch.bakeTransformIntoVertices(Matrix.Translation(0, 0.25, 0));
    this.l1Branch.position.set(0, 1, 0);
    this.l1Branch.material = this.material;
    this.l1Branch.actionManager = this.actionManager;
    this.l1Branch.parent = this;

    this.l2Branch = MeshBuilder.CreateCylinder(
      `${name}_branch_1`,
      { height: 0.5, tessellation: 5, diameterTop: 0, diameterBottom: 0.3 },
      scene
    );
    this.l2Branch.visibility = 0;

    this.l3Branch = MeshBuilder.CreateCylinder(
      `${name}_branch_1`,
      { height: 0.5, tessellation: 5, diameterTop: 0, diameterBottom: 0.3 },
      scene
    );
    this.l3Branch.visibility = 0;
  }

  update(size: number) {
    this.size = size;
    this.stem.scaling.set(0.3 * this.size, this.size, 0.3 * this.size);
  }
}
