import {
  TransformNode,
  Mesh,
  ActionManager,
  Scene,
  MeshBuilder,
  Matrix,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import { TreeParameters } from "./ITreeParameters";

function createBranch(
  height: number,
  diameterBottom: number,
  diameterTop: number,
  scene: Scene
): Mesh {
  const branch = MeshBuilder.CreateCylinder(
    `${name}_branch_1`,
    {
      height,
      tessellation: 5,
      diameterTop,
      diameterBottom
    },
    scene
  );

  branch.bakeTransformIntoVertices(Matrix.Translation(0, 0.5 * height, 0));

  return branch;
}

export class NewTreeGraphics extends TransformNode {
  private size: number = 1;
  private stem: Mesh;
  public actionManager: ActionManager;
  public material: StandardMaterial;

  private leftBranch: Mesh;
  private rightBranch: Mesh;

  constructor(
    name: string,
    parameters: TreeParameters,
    material: StandardMaterial,
    scene: Scene
  ) {
    super(name, scene);

    // share an action manager across all geometry
    this.actionManager = new ActionManager(scene);
    this.material = material.clone(`${name}_material`);

    const branchingAngle = 0.3 * Math.PI;
    const treeHeight = 1;

    this.stem = MeshBuilder.CreateCylinder(
      `${name}_stem`,
      {
        height: treeHeight,
        diameterTop: 0.1,
        diameterBottom: 1,
        tessellation: 7
      },
      scene
    );

    this.stem.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0));
    this.stem.parent = this;
    this.stem.material = this.material;
    this.stem.actionManager = this.actionManager;

    this.leftBranch = createBranch(0.5 * treeHeight, 0.1, 0.01, scene);
    this.leftBranch.rotate(Vector3.Right(), branchingAngle);
    this.leftBranch.material = this.material;
    this.leftBranch.actionManager = this.actionManager;
    this.leftBranch.parent = this;

    this.rightBranch = createBranch(0.5 * treeHeight, 0.1, 0.01, scene);
    this.rightBranch.rotate(Vector3.Right(), -branchingAngle);
    this.rightBranch.material = this.material;
    this.rightBranch.actionManager = this.actionManager;
    this.rightBranch.parent = this;

    this.update(parameters.size);
  }

  update(size: number) {
    this.size = size;
    this.stem.scaling.set(0.3 * this.size, this.size, 0.3 * this.size);

    this.leftBranch.position.set(0, 0.4 * this.size, 0);
    this.rightBranch.position.set(0, 0.7 * this.size, 0);

    this.leftBranch.scaling.setAll(this.size);
    this.rightBranch.scaling.setAll(this.size);
  }
}
