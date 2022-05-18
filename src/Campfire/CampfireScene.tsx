import { Engine, Scene, SceneEventArgs } from "react-babylonjs";
import * as BABYLON from "@babylonjs/core";
import {
  ArcRotateCameraKeyboardMoveInput,
  ArcRotateCameraMouseWheelInput,
  ArcRotateCameraPointersInput,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { PanningCamera } from "./PanningCamera";
import React from "react";

type Props = {
  flameyAmount: number;
  onFlameyPicked: (idx: number) => void;
};

export class CampfireScene extends React.Component<Props> {
  scene!: BABYLON.Scene;
  canvas!: HTMLCanvasElement;
  camera!: PanningCamera;
  pointLight!: BABYLON.PointLight;
  flame!: BABYLON.AbstractMesh;
  groundMesh!: BABYLON.AbstractMesh;
  sps?: BABYLON.SolidParticleSystem;

  prevPickedIdx = -1;
  prevPickedScale: BABYLON.Vector3 = new BABYLON.Vector3();
  prevPickedColor: BABYLON.Nullable<BABYLON.Color4> = new BABYLON.Color4();

  cameraInitPos: BABYLON.Vector3 = new BABYLON.Vector3();

  public setNewAmount(amount: number): void {
    this.setState({ flameyAmount: amount });
    this.createFlameys(amount);
  }

  public centerCamera(): void {
    this.camera.position = this.cameraInitPos;
  }

  render(): JSX.Element {
    return (
      <>
        <div style={{ flex: 1, display: "flex" }}>
          <Engine antialias={false} adaptToDeviceRatio canvasId="BabylonJS">
            <Scene onSceneMount={this.onSceneMount}>
              <></>
            </Scene>
          </Engine>
        </div>
        {<span id="fps">0</span>}
      </>
    );
  }

  onSceneMount = async (e: SceneEventArgs): Promise<void> => {
    this.canvas = e.canvas;
    this.scene = e.scene;

    // TODO: use proper loading screen
    this.scene.getEngine().displayLoadingUI();
    {
      this.setupScene();
      this.createCamera();
      await this.loadGroundAndFlame();
      this.createLightAndShadows();
      this.animateFlameAndLight();
      this.createFlameys();
      this.setupAllSceneCallbacks();
    }
    this.scene.getEngine().hideLoadingUI();
  };

  setupScene = (): void => {
    this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1.0);
    this.scene.ambientColor = new BABYLON.Color3(0, 0, 0);

    this.scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    this.scene.fogDensity = 0.01;
    this.scene.fogStart = 32.0;
    this.scene.fogEnd = 96.0;
    this.scene.fogColor = new BABYLON.Color3(0, 0.55, 1);
    this.scene.fogEnabled = true;
  };

  createCamera = (): void => {
    const fixedAngle = Math.PI / 5;

    const camera = new PanningCamera(
      "camera",
      0,
      fixedAngle,
      25,
      new BABYLON.Vector3(0, 0, 0),
    );
    camera.lowerAlphaLimit = 0;
    camera.upperAlphaLimit = 0;
    camera.upperBetaLimit = fixedAngle;
    camera.lowerBetaLimit = fixedAngle;

    camera.attachControl(this.canvas, false, false);

    camera.inputs.removeByType(ArcRotateCameraKeyboardMoveInput.name);
    camera.inputs.removeByType(ArcRotateCameraMouseWheelInput.name);

    const pointersInput = camera.inputs.attached[
      "pointers"
    ] as ArcRotateCameraPointersInput;
    pointersInput.multiTouchPanAndZoom = false;
    pointersInput.multiTouchPanning = false;

    camera._panningMouseButton = 0;
    camera.panningAxis = new BABYLON.Vector3(1, 0, 1);
    camera.panningDistanceLimit = 40;
    camera.panningSensibility = 500;
    camera.panningInertia = 0.95;
    camera.inertia = 0.95;

    // Configure rendering effects
    const defaultPipeline = new BABYLON.DefaultRenderingPipeline(
      "defaultPipeline",
      true,
      this.scene,
      [camera],
    );
    const curve = new BABYLON.ColorCurves();
    curve.globalSaturation = 80;
    defaultPipeline.imageProcessing.colorCurves = curve;

    defaultPipeline.imageProcessing.vignetteEnabled = true;
    defaultPipeline.imageProcessing.vignetteWeight = 5;
    defaultPipeline.imageProcessing.vignetteColor = new BABYLON.Color4(
      0,
      0.1,
      0.2,
      0,
    );

    this.camera = camera;
    this.cameraInitPos = camera.position;
  };

  loadGroundAndFlame = async (): Promise<void> => {
    // Import
    const url = "https://dl.dropbox.com/s/5vb65ouihq40ds8/flame.glb";
    const data = await BABYLON.SceneLoader.ImportMeshAsync("", url);

    // and scale down to better match camera
    const SETSCALE = 1.1;
    const scaling = new BABYLON.Vector3(SETSCALE, SETSCALE, SETSCALE);
    data.meshes[0].scaling = scaling;

    const groundMesh = data.meshes.find((mesh) => mesh.name == "BGPlane");
    if (groundMesh) {
      // move it further down for more abstract look
      const LOWER_GROUND_BY_Z = 5;
      groundMesh.position = groundMesh.position.add(
        BABYLON.Vector3.Down().scale(LOWER_GROUND_BY_Z),
      );

      // save ground mesh for later parallax
      this.groundMesh = groundMesh;
    }

    const campFireMesh = data.meshes.find((mesh) => mesh.name == "Flame");
    if (campFireMesh) {
      const campfireMaterial = new BABYLON.StandardMaterial(
        "campfireMat",
        this.scene,
      );
      const campfireTexture = new BABYLON.Texture(
        "https://dl.dropbox.com/s/prhdjo2403h3vp9/flametexture.png",
      );

      campfireMaterial.disableLighting = true;
      campfireMaterial.diffuseTexture = campfireTexture;
      campfireMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
      campfireMaterial.specularPower = 16;

      // Fresnel
      campfireMaterial.emissiveFresnelParameters =
        new BABYLON.FresnelParameters();
      campfireMaterial.emissiveFresnelParameters.bias = 0.5;
      campfireMaterial.emissiveFresnelParameters.power = 100;
      campfireMaterial.emissiveFresnelParameters.leftColor = new BABYLON.Color3(
        1.0,
        1.0,
        1.0,
      );
      campfireMaterial.emissiveFresnelParameters.rightColor =
        new BABYLON.Color3(0.65, 0.85, 0.95);

      campFireMesh.material = campfireMaterial;

      const CAMPFIRE_SCALE = 1.33;
      campFireMesh.scaling = new BABYLON.Vector3(
        CAMPFIRE_SCALE,
        CAMPFIRE_SCALE,
        CAMPFIRE_SCALE,
      );
    }

    // Return flame mesh for future programmatic animation
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.flame = campFireMesh!; // we know it's in the scene
  };

  createLightAndShadows = (): void => {
    this.scene.createDefaultEnvironment();

    const hemiLight = new BABYLON.HemisphericLight(
      "hemiLight",
      new BABYLON.Vector3(0, 1, 1),
      this.scene,
    );
    hemiLight.diffuse = new BABYLON.Color3(0, 0.333, 1);
    hemiLight.specular = new BABYLON.Color3(0, 0.333, 1);
    hemiLight.intensity = 0.2;

    const pointLight = new BABYLON.PointLight(
      "pointLight",
      new BABYLON.Vector3(0, 7, 0),
      this.scene,
    );
    pointLight.diffuse = new BABYLON.Color3(0, 0.333, 1);
    pointLight.specular = new BABYLON.Color3(0, 0.333, 1);
    pointLight.intensity = 2500;

    this.pointLight = pointLight;
  };

  animateFlameAndLight = (): void => {
    const animFlame = new BABYLON.Animation(
      "animFlame",
      "position.y",
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
    );
    animFlame.setKeys([
      { frame: 0, value: 0.05 },
      { frame: 50, value: 0.45 },
      { frame: 100, value: 0.05 },
    ]);
    const easingFunction = new BABYLON.CubicEase();
    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    animFlame.setEasingFunction(easingFunction);

    this.flame.animations = [];
    this.flame.animations.push(animFlame);
    this.scene.beginAnimation(this.flame, 0, 100, true);

    const animLight = new BABYLON.Animation(
      "animLight",
      "intensity",
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
    );
    animLight.setKeys([
      { frame: 0, value: 500 },
      { frame: 50, value: 5000 },
      { frame: 100, value: 500 },
    ]);
    animLight.setEasingFunction(easingFunction);

    this.pointLight.animations = [];
    this.pointLight.animations.push(animLight);
    this.scene.beginAnimation(this.pointLight, 0, 100, true);
  };

  createFlameys = (amount?: number): void => {
    if (this.sps) {
      this.sps.dispose();
      this.sps = undefined;
      this.prevPickedIdx = -1;
    }

    this.sps = new BABYLON.SolidParticleSystem("sps", this.scene, {
      isPickable: true,
    });
    const sps = this.sps;

    const flameyAmount =
      amount !== undefined ? amount : this.props.flameyAmount;

    const tempFlameyMesh = BABYLON.MeshBuilder.CreatePlane("plane", {});
    sps.addShape(tempFlameyMesh, flameyAmount);
    tempFlameyMesh.dispose();

    const flameyTex = new BABYLON.Texture(
      "https://dl.dropbox.com/s/8j3ui3gab760l01/sprite_triangle.png",
    );
    flameyTex.hasAlpha = true;

    const flameyMat = new BABYLON.StandardMaterial("flameyMat");
    flameyMat.diffuseTexture = flameyTex;
    flameyMat.useAlphaFromDiffuseTexture = true;
    flameyMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    flameyMat.disableLighting = true;

    const spsMesh = sps.buildMesh();
    spsMesh.material = flameyMat;

    sps.initParticles = () => {
      this.setupIndividualFlameys(sps);
    };

    sps.billboard = true;

    sps.initParticles(); // compute particle initial status
    sps.setParticles(); // updates the SPS mesh and draws it
    sps.refreshVisibleSize(); // updates the BBox for pickability

    // Optimizers after first setParticles() call
    // This will be used only for the next setParticles() calls
    sps.computeParticleTexture = false;
  };

  setupIndividualFlameys = (sps: BABYLON.SolidParticleSystem): void => {
    const AMOUNT_INIT = 20;
    const RADIUS_INIT = 3;
    const RADIUS_INCREMENT = 1.2;

    const POSITION_RANDOMNESS = 0.55;
    const POSITION_Y = 0.55;

    const SCALE_MIN = 0.5;
    const SCALE_MAX = 0.7;

    const GRADIENT = [
      // NOTE: at least 2 points required!
      { amount: 0, color: new BABYLON.Color4(0.5, 2, 1.5) },
      { amount: 100, color: new BABYLON.Color4(0.1, 1, 0.8) },
      { amount: 1000, color: new BABYLON.Color4(1, 0.66, 0.1) },
      { amount: 10000, color: new BABYLON.Color4(1, 0.1, 0.2) },
    ];

    let currentCircleFlameyId = 0;
    let currentRadius = RADIUS_INIT;
    let currentAngleStep = (2 * Math.PI) / AMOUNT_INIT;
    let currentAngleOffset = false;
    let currentCircleMaxAmt = AMOUNT_INIT;
    let nbLeftToDistribute = sps.nbParticles;

    const PREFERRED_ARC_DISTANCE = (2 * Math.PI * RADIUS_INIT) / AMOUNT_INIT;

    for (let i = 0; i < sps.nbParticles; i++) {
      const particle = sps.particles[i];

      // calculate angle to get position
      let angle = currentCircleFlameyId * currentAngleStep;
      if (currentAngleOffset) {
        angle += currentAngleStep / 2;
      }

      particle.position = new BABYLON.Vector3(
        currentRadius * Math.cos(angle) + Math.random() * POSITION_RANDOMNESS,
        POSITION_Y,
        currentRadius * Math.sin(angle) + Math.random() * POSITION_RANDOMNESS,
      );

      // a bit of random scaling
      const randomScale = BABYLON.Scalar.RandomRange(SCALE_MIN, SCALE_MAX);
      particle.scaling = new BABYLON.Vector3(
        randomScale,
        randomScale,
        randomScale,
      );

      // color gradient calculation
      let gradienAnchor = 0;
      for (; gradienAnchor < GRADIENT.length - 1; gradienAnchor++) {
        if (
          GRADIENT[gradienAnchor].amount <= i &&
          i < GRADIENT[gradienAnchor + 1].amount
        )
          break;
      }
      if (gradienAnchor == GRADIENT.length - 1) {
        gradienAnchor = GRADIENT.length - 2; // fallback to last
      }

      const lerpFactor =
        (i - GRADIENT[gradienAnchor].amount) /
        (GRADIENT[gradienAnchor + 1].amount - GRADIENT[gradienAnchor].amount);

      particle.color = BABYLON.Color4.Lerp(
        GRADIENT[gradienAnchor].color,
        GRADIENT[gradienAnchor + 1].color,
        lerpFactor,
      );

      // circle switching logic
      if (currentCircleFlameyId < currentCircleMaxAmt - 1) {
        currentCircleFlameyId++;
      } else {
        // next circle starts
        currentCircleFlameyId = 0;
        currentRadius += RADIUS_INCREMENT;
        currentAngleOffset = !currentAngleOffset;
        nbLeftToDistribute -= currentCircleMaxAmt;

        currentCircleMaxAmt = Math.floor(
          (2 * Math.PI * currentRadius) / PREFERRED_ARC_DISTANCE,
        );

        const divisions =
          0 < nbLeftToDistribute && nbLeftToDistribute < currentCircleMaxAmt
            ? nbLeftToDistribute
            : currentCircleMaxAmt;
        currentAngleStep = (2 * Math.PI) / divisions;
      }
    }
  };

  setupAllSceneCallbacks = (): void => {
    // Main rendering loop, update fps
    const divFps = document.getElementById("fps");
    this.scene.getEngine().runRenderLoop(() => {
      if (this.scene) {
        this.scene.render();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        divFps!.innerHTML = this.scene.getEngine().getFps().toFixed() + " fps";
      }
    });

    // Animate particles
    let time = 0;
    this.scene.onBeforeRenderObservable.add(() => {
      if (!this.sps) return;

      this.sps.setParticles(); // rotates billboards

      time += this.scene.getEngine().getDeltaTime();
      for (let i = 0; i < this.sps.nbParticles; i++) {
        // simple floating
        this.sps.particles[i].position.y =
          0.55 + 0.08 * Math.cos(i + time / 2300);
      }
    });

    // Individual particle selection
    this.scene.onPointerPick = (evt, pickResult) => {
      if (!this.sps) return;

      if (pickResult.pickedMesh !== this.sps.mesh || pickResult.faceId === -1) {
        return;
      }
      const picked = this.sps.pickedParticle(pickResult);
      if (picked) {
        const pickedParticle = this.sps.particles[picked.idx];
        if (pickedParticle && picked.idx != this.prevPickedIdx) {
          if (this.prevPickedIdx != -1) {
            const prevPickedParticle = this.sps.particles[this.prevPickedIdx];
            prevPickedParticle.color = this.prevPickedColor;
            prevPickedParticle.scale = this.prevPickedScale;
          }
          this.prevPickedColor = pickedParticle.color;
          this.prevPickedScale = pickedParticle.scale;
          this.prevPickedIdx = picked.idx;

          pickedParticle.color = new BABYLON.Color4(1, 0, 0);
          pickedParticle.scale = new BABYLON.Vector3(1.5, 1.5, 1.5);
          this.props.onFlameyPicked(picked.idx);
        }
      }
    };

    // Add parallax effect to the ground
    if (this.groundMesh) {
      const PARALLAX_FACTOR = -0.25; // 0 means no parallax
      const offset = this.camera.position.subtract(this.groundMesh.position);

      this.scene.onBeforeRenderObservable.add(() => {
        this.groundMesh.position = new BABYLON.Vector3(
          offset.x + PARALLAX_FACTOR * this.camera.position.x,
          this.groundMesh.position.y,
          offset.z + PARALLAX_FACTOR * this.camera.position.z,
        );
      });
    }
  };
}
