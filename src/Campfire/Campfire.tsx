import { Engine, Scene, SceneEventArgs } from "react-babylonjs";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { PanningCamera } from "./PanningCamera";

export const Campfire = (): JSX.Element => (
  <div style={{ flex: 1, display: "flex" }}>
    <Engine antialias={false} adaptToDeviceRatio canvasId="BabylonJS">
      <Scene onSceneMount={onSceneMount}>
        <></>
      </Scene>
    </Engine>
  </div>
);

const onSceneMount = async (e: SceneEventArgs): Promise<void> => {
  const { canvas, scene } = e;

  scene.getEngine().displayLoadingUI(); // TODO: use proper screen

  setupScene(scene);
  const camera = createCamera(scene, canvas);
  const flame = await loadGroundAndFlame(scene, camera);
  const pointLight = createLightAndShadows(scene);
  animateFlameAndLight(pointLight, flame, scene);

  createFlameys(10000, scene);

  scene.getEngine().hideLoadingUI(); // TODO: use proper screen
};

function setupScene(scene: BABYLON.Scene): void {

  scene.clearColor = new BABYLON.Color4(0, 0, 0, 1.0);
  scene.ambientColor = new BABYLON.Color3(0,0,0);

  scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
  scene.fogDensity = 0.01;
  scene.fogStart = 15.0;
  scene.fogEnd = 150.0;
  scene.fogColor = new BABYLON.Color3(0, 0, 1);
  scene.fogEnabled = true;

  const divFps = document.getElementById("fps");
  scene.getEngine().runRenderLoop(() => {
    if (scene) {
      scene.render();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      divFps!.innerHTML = scene.getEngine().getFps().toFixed() + " fps";
    }
  });
}

function createCamera(
  scene: BABYLON.Scene,
  canvas: HTMLCanvasElement,
): PanningCamera {
  const fixedAngle = Math.PI / 4;

  const camera = new PanningCamera(
    "camera",
    0,
    fixedAngle,
    15,
    new BABYLON.Vector3(0, 0, 0),
  );
  camera.lowerAlphaLimit = 0;
  camera.upperAlphaLimit = 0;
  camera.upperBetaLimit = fixedAngle;
  camera.lowerBetaLimit = fixedAngle;

  camera.attachControl(canvas, false, false);

  camera.inputs.remove(camera.inputs.attached.keyboard);
  camera.inputs.remove(camera.inputs.attached.mousewheel);

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
    scene,
    [camera],
  );
  const curve = new BABYLON.ColorCurves();
  // curve.globalHue = 200;
  // curve.globalDensity = 80;
  curve.globalSaturation = 80;
  // curve.highlightsHue = 20;
  // curve.highlightsDensity = 80;
  // curve.highlightsSaturation = -80;
  // curve.shadowsHue = 2;
  // curve.shadowsDensity = 80;
  // curve.shadowsSaturation = 40;
  defaultPipeline.imageProcessing.colorCurves = curve;

  defaultPipeline.imageProcessing.vignetteEnabled = true;
  defaultPipeline.imageProcessing.vignetteWeight = 5;
  defaultPipeline.imageProcessing.vignetteColor = new BABYLON.Color4(
    0,
    0,
    0,
    0,
  );

  return camera;
}

async function loadGroundAndFlame(
  scene: BABYLON.Scene,
  camera: PanningCamera,
): Promise<BABYLON.AbstractMesh> {
  // Import
  const url = "https://dl.dropbox.com/s/ang88plen9d2w3v/triboscene.glb";
  const data = await BABYLON.SceneLoader.ImportMeshAsync("", url);

  // and scale down to better match camera
  const DOWNSCALE = 0.2;
  const scaling = new BABYLON.Vector3(DOWNSCALE, DOWNSCALE, DOWNSCALE);
  data.meshes[0].scaling = scaling;

  // Make ground mesh follow camera
  const groundMesh = data.meshes.find((mesh) => mesh.name == "BGPlane");
  if (groundMesh) {
    // move it further down for more abstract look
    const LOWER_GROUND_BY_Z = 20;
    groundMesh.position = groundMesh.position.add(
      BABYLON.Vector3.Down().scale(LOWER_GROUND_BY_Z),
    );

    const PARALLAX_FACTOR = -2; // 0 means no parallax
    const offset = camera.position.subtract(groundMesh.position);
    scene.onBeforeRenderObservable.add(() => {
      groundMesh.position = new BABYLON.Vector3(
        offset.x + PARALLAX_FACTOR * camera.position.x,
        groundMesh.position.y,
        offset.z + PARALLAX_FACTOR * camera.position.z,
      );
    });
  }

  // Return flame mesh for future programmatic animation
  const flameMesh = data.meshes.find((mesh) => mesh.name == "Flame");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return flameMesh!; // we know it's in the scene
}

function createLightAndShadows(scene: BABYLON.Scene): BABYLON.PointLight {
  scene.createDefaultEnvironment();

  const hemiLight = new BABYLON.HemisphericLight(
    "hemiLight",
    new BABYLON.Vector3(0, 1, 0),
    scene,
  );
  hemiLight.diffuse = new BABYLON.Color3(0, 1, 0.78);
  hemiLight.specular = new BABYLON.Color3(0, 1, 0.78);
  hemiLight.intensity = 0.2;

  const pointLight = new BABYLON.PointLight(
    "pointLight",
    new BABYLON.Vector3(0, 7, 0),
    scene,
  );
  pointLight.diffuse = new BABYLON.Color3(0, 1, 0.78);
  pointLight.specular = new BABYLON.Color3(0, 1, 0.78);
  pointLight.intensity = 1500;

  return pointLight;
}

function animateFlameAndLight(
  pointLight: BABYLON.PointLight,
  flame: BABYLON.AbstractMesh,
  scene: BABYLON.Scene,
): void {
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

  flame.animations = [];
  flame.animations.push(animFlame);
  scene.beginAnimation(flame, 0, 100, true);

  const animLight = new BABYLON.Animation(
    "animLight",
    "intensity",
    30,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  animLight.setKeys([
    { frame: 0, value: 500 },
    { frame: 50, value: 1000 },
    { frame: 100, value: 500 },
  ]);
  animLight.setEasingFunction(easingFunction);

  pointLight.animations = [];
  pointLight.animations.push(animLight);
  scene.beginAnimation(pointLight, 0, 100, true);
}

function createFlameys(numberOfFlameys: number, scene: BABYLON.Scene): void {
  const sps = new BABYLON.SolidParticleSystem("sps", scene, {
    isPickable: false,
  });

  const tempFlameyMesh = BABYLON.MeshBuilder.CreatePlane("plane", {});
  sps.addShape(tempFlameyMesh, numberOfFlameys);
  tempFlameyMesh.dispose();

  const spsMesh = sps.buildMesh();

  const flameyTex = new BABYLON.Texture(
    "https://dl.dropbox.com/s/8j3ui3gab760l01/sprite_triangle.png",
  );
  flameyTex.hasAlpha = true;

  const flameyMat = new BABYLON.StandardMaterial("flameyMat");
  flameyMat.diffuseTexture = flameyTex;
  flameyMat.useAlphaFromDiffuseTexture = true;
  flameyMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  flameyMat.disableLighting = true;
  spsMesh.material = flameyMat;

  sps.initParticles = () => {
    setupIndividualFlameys(sps);
  };

  sps.billboard = true;

  sps.initParticles(); // compute particle initial status
  sps.setParticles(); // updates the SPS mesh and draws it
  sps.refreshVisibleSize(); // updates the BBox for pickability

  // Optimizers after first setParticles() call
  // This will be used only for the next setParticles() calls
  sps.computeParticleTexture = false;

  scene.onBeforeRenderObservable.add(() => {
    sps.setParticles(); // rotate billboards
  });
}

function setupIndividualFlameys(sps: BABYLON.SolidParticleSystem): void {
  const AMOUNT_INIT = 25;
  const RADIUS_INIT = 2.4;
  const RADIUS_INCREMENT = 1.0;

  const POSITION_RANDOMNESS = 0.35;
  const POSITION_Y = 0.55;

  const SCALE_MIN = 0.2;
  const SCALE_MAX = 0.3;

  const GRADIENT = [
    // NOTE: at least 2 points required!
    { amount: 0, color: new BABYLON.Color4(1, 1, 1) },
    { amount: 500, color: new BABYLON.Color4(1, 0, 0) },
    { amount: 1000, color: new BABYLON.Color4(0, 1, 0) },
    { amount: 4000, color: new BABYLON.Color4(0, 0, 1) },
    { amount: 10000, color: new BABYLON.Color4(0, 1, 1) },
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
}
