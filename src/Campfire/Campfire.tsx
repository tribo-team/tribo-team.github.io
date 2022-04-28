import { Engine, Scene, SceneEventArgs } from 'react-babylonjs'
import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders/glTF";
import { PanningCamera } from './PanningCamera';

export const Campfire = () => {
    return (
        <div style={{ flex: 1, display: "flex" }}>
            <Engine antialias={false} adaptToDeviceRatio canvasId="BabylonJS">
                <Scene
                    onSceneMount={onSceneMount}
                    children={undefined}
                />
            </Engine>
        </div>
    );
}

const onSceneMount = async (e: SceneEventArgs) => {
    const { canvas, scene } = e

    scene.getEngine().displayLoadingUI(); // TODO: use proper screen

    setupScene(scene);
    createCamera(canvas);
    const flame = await loadEnvironment();
    const pointLight = createLightAndShadows(scene);
    animateFlameAndLight(pointLight, flame, scene);

    createFlameys(10000, scene);

    scene.getEngine().hideLoadingUI(); // TODO: use proper screen
}

function setupScene(scene: BABYLON.Scene) {
    scene.clearColor = new BABYLON.Color4(0.15, 0.03, 0.29, 1.0);

    const divFps = document.getElementById("fps");
    scene.getEngine().runRenderLoop(() => {
        if (scene) {
            scene.render();
            divFps!.innerHTML = scene.getEngine().getFps().toFixed() + " fps";
        }
    });
}

function createCamera(canvas: HTMLCanvasElement): PanningCamera {
    const fixedAngle = Math.PI / 4;

    const camera = new PanningCamera('camera',
        0,
        fixedAngle,
        15,
        new BABYLON.Vector3(0, 0, 0)
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

async function loadEnvironment(): Promise<BABYLON.AbstractMesh> {
    var url = "https://dl.dropbox.com/s/pbczbdwdjef9tre/triboscene.glb";
    const scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);

    let data = await BABYLON.SceneLoader.ImportMeshAsync("", url);
    data.meshes[0].scaling = scaling;

    let flameMesh = data.meshes.find(mesh => mesh.name == "Flame");
    return flameMesh!;
}

function createLightAndShadows(scene: BABYLON.Scene): BABYLON.PointLight {
    scene.createDefaultEnvironment();
    
    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.diffuse = new BABYLON.Color3(0, 1, 0.78);
    hemiLight.specular = new BABYLON.Color3(0, 1, 0.78);
    hemiLight.intensity = 0.2;

    const pointLight = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(0, 7, 0), scene);
    pointLight.diffuse = new BABYLON.Color3(0, 1, 0.78);
    pointLight.specular = new BABYLON.Color3(0, 1, 0.78);
    pointLight.intensity = 1500;

    return pointLight;
}

function animateFlameAndLight(
    pointLight: BABYLON.PointLight,
    flame: BABYLON.AbstractMesh,
    scene: BABYLON.Scene
) {
    const animFlame = new BABYLON.Animation("animFlame", "position.y", 30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    animFlame.setKeys([
        { frame: 0, value: 0.05 },
        { frame: 50, value: 0.45 },
        { frame: 100, value: 0.05 }
    ]);
    const easingFunction = new BABYLON.CubicEase();
    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    animFlame.setEasingFunction(easingFunction);

    flame.animations = [];
    flame.animations.push(animFlame);
    scene.beginAnimation(flame, 0, 100, true);

    const animLight = new BABYLON.Animation("animLight", "intensity", 30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    animLight.setKeys([
        { frame: 0, value: 500 },
        { frame: 50, value: 1000 },
        { frame: 100, value: 500 }
    ]);
    animLight.setEasingFunction(easingFunction);

    pointLight.animations = [];
    pointLight.animations.push(animLight);
    scene.beginAnimation(pointLight, 0, 100, true);
}

function createFlameys(numberOfFlameys: number, scene: BABYLON.Scene): void {
    const sps = new BABYLON.SolidParticleSystem("sps", scene, { isPickable: false });

    const tempFlameyMesh = BABYLON.MeshBuilder.CreatePlane("plane", {});
    sps.addShape(tempFlameyMesh, numberOfFlameys);
    tempFlameyMesh.dispose();

    const spsMesh = sps.buildMesh();

    const flameyTex = new BABYLON.Texture("https://dl.dropbox.com/s/8j3ui3gab760l01/sprite_triangle.png");
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

function positionFlameys(sps: BABYLON.SolidParticleSystem) {
    const R_INIT = 2.4;
    const R_INC = 0.8;
    const R_INC_MULT = 1.0;
    const AMT_INIT = 20;
    const AMT_MULT = 1.1;

    const COLOR_A = new BABYLON.Color4(0, 1, 0.78);
    const COLOR_B = new BABYLON.Color4(1, 0, 0);

    let currentCircleFlameyId = 0;
    let currentRadius = R_INIT;
    let currentRadiusIncrement = R_INC;
    let currentAngleStep = (2 * Math.PI / AMT_INIT);
    let currentAngleOffset = false;
    let currentCircleMaxAmt = AMT_INIT;
    let amtLeftToDistribute = sps.nbParticles;

    for (let i = 0; i < sps.nbParticles; i++) {
        let particle = sps.particles[i];

        // calculate angle to get position
        let angle = currentCircleFlameyId * currentAngleStep;
        if (currentAngleOffset) {
            angle += currentAngleStep / 2;
        }

        particle.position = new BABYLON.Vector3(
            currentRadius * Math.cos(angle) + Math.random() * 0.4,
            0.55,
            currentRadius * Math.sin(angle) + Math.random() * 0.4);
        // TODO: it might make sense to cache these to optimize later?

        // a bit of random scaling
        let randomScale = BABYLON.Scalar.RandomRange(0.2, 0.3);
        particle.scaling = new BABYLON.Vector3(randomScale, randomScale, randomScale);

        // lerp color
        particle.color = BABYLON.Color4.Lerp(COLOR_A, COLOR_B, currentRadius / 30);

        // figure out if we should stay on the same circle radius
        if (currentCircleFlameyId < currentCircleMaxAmt - 1) {
            currentCircleFlameyId++;
        }
        else {
            currentCircleFlameyId = 0;

            currentRadius += currentRadiusIncrement;
            currentRadiusIncrement *= R_INC_MULT;

            currentAngleOffset = !currentAngleOffset;

            amtLeftToDistribute -= currentCircleMaxAmt;

            let prevCurrentCircleMaxAmt = currentCircleMaxAmt;
            currentCircleMaxAmt = Math.round(currentCircleMaxAmt * AMT_MULT);

            if ((0 < amtLeftToDistribute) && (amtLeftToDistribute < currentCircleMaxAmt)) {
                currentAngleStep = (2 * Math.PI / amtLeftToDistribute);
            }
            else {
                currentAngleStep /= (currentCircleMaxAmt / prevCurrentCircleMaxAmt);
            }
        }
    }
}