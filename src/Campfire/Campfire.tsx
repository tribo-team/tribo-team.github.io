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
  const camera = createCamera(canvas);
  const flame = await loadEnvironment(scene, camera);
  const pointLight = createLightAndShadows(scene);
  animateFlameAndLight(pointLight, flame, scene);

  createFlameys(10000, scene);

  scene.getEngine().hideLoadingUI(); // TODO: use proper screen
};

function setupScene(scene: BABYLON.Scene): void {
  scene.clearColor = new BABYLON.Color4(0.15, 0.03, 0.29, 1.0);

  const divFps = document.getElementById("fps");
  scene.getEngine().runRenderLoop(() => {
    if (scene) {
      scene.render();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      divFps!.innerHTML = scene.getEngine().getFps().toFixed() + " fps";
    }
  });
}

function createCamera(canvas: HTMLCanvasElement): PanningCamera {
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
  camera.panningInertia = 0.85;
  camera.inertia = 0.85;

  return camera;
}

async function loadEnvironment(
  scene: BABYLON.Scene,
  camera: PanningCamera,
): Promise<BABYLON.AbstractMesh> {
  const url = "https://dl.dropbox.com/s/pbczbdwdjef9tre/triboscene.glb";
  const scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);

  const data = await BABYLON.SceneLoader.ImportMeshAsync("", url);
  data.meshes[0].scaling = scaling;

  const flameMesh = data.meshes.find((mesh) => mesh.name == "Flame");

  // scene.onBeforeRenderObservable.add(() => {
  //   data.meshes[0].position = new BABYLON.Vector3(
  //     camera.position.x,
  //     camera.position.y - 11,
  //     camera.position.z,
  //   );
  // });

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
    positionFlameys(sps);
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

function positionFlameys(sps: BABYLON.SolidParticleSystem): void {
  const AMOUNT_INIT = 20;
  const RADIUS_INIT = 2.4;
  const RADIUS_INCREMENT = 1.0;
  const PREFERRED_ARC_DISTANCE = (2 * Math.PI * RADIUS_INIT) / AMOUNT_INIT;

  const POSITION_RANDOMNESS = 0.4;
  const POSITION_Y = 0.55;

  const SCALE_MIN = 0.2;
  const SCALE_MAX = 0.3;

  const COLOR_A = new BABYLON.Color4(0, 1, 0.78);
  const COLOR_B = new BABYLON.Color4(1, 0, 0);

  let currentCircleFlameyId = 0;
  let currentRadius = RADIUS_INIT;
  let currentAngleStep = (2 * Math.PI) / AMOUNT_INIT;
  let currentAngleOffset = false;
  let currentCircleMaxAmt = AMOUNT_INIT;
  let nbLeftToDistribute = sps.nbParticles;

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

    // lerp color
    particle.color = BABYLON.Color4.Lerp(COLOR_A, COLOR_B, currentRadius / 30);

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
