import { Engine, Scene, SceneEventArgs } from 'react-babylonjs'
import * as BABYLON from '@babylonjs/core';
import { PanningCamera } from './PanningCamera';

export const Campfire = () => {
    return (
        <div style={{ flex: 1, display: "flex" }}>
            <Engine antialias adaptToDeviceRatio canvasId="BabylonJS">
                <Scene
                    onSceneMount={onSceneMount}
                    children={undefined}
                />
            </Engine>
        </div>
    );
}

const onSceneMount = (e: SceneEventArgs) => {
    const { canvas, scene } = e

    setupScene();
    createCamera();
    createGround();
    createCampfireLogs();
    const { fire } = createFireModel();
    const pointLight = createLightAndShadows();
    const easingFunction = createEasingFunction();
    animateFire(pointLight, fire, easingFunction);
    createFlameys(5000);

    scene.getEngine().runRenderLoop(() => {
        if (scene) {
            scene.render();
        }
    });


    //==== IMPLEMENTATION DETAILS ====//

    function createFlameys(numberOfFlameys: number): void {
        const FLAMEY_COUNT = numberOfFlameys;

        const sps = new BABYLON.SolidParticleSystem("sps", scene, { isPickable: false });

        const tempFlameyMesh = BABYLON.MeshBuilder.CreatePlane("plane", {});
        sps.addShape(tempFlameyMesh, FLAMEY_COUNT);
        tempFlameyMesh.dispose();

        const spsMesh = sps.buildMesh();

        const flameyMat = new BABYLON.StandardMaterial("flameyMat");
        flameyMat.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/spriteAtlas.png");
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

        let currentCircleFlameyId = 0;
        let currentRadius = R_INIT;
        let currentRadiusIncrement = R_INC;
        let currentAngleStep = (2 * Math.PI / AMT_INIT);
        let currentAngleOffset = false;
        let currentCircleMaxAmt = AMT_INIT;
        let amtLeftToDistribute = sps.nbParticles;

        for (let i = 0; i < sps.nbParticles; i++) {
            let particle = sps.particles[i];

            // pick random sprite
            const row = Math.floor(BABYLON.Scalar.RandomRange(0, 4));
            const col = Math.floor(BABYLON.Scalar.RandomRange(0, 6));
            particle.uvs = new BABYLON.Vector4(col / 6, row / 4, (col + 1) / 6, (row + 1) / 4);

            // calculate angle to get position
            let angle = currentCircleFlameyId * currentAngleStep;
            if (currentAngleOffset) {
                angle += currentAngleStep / 2;
            }

            particle.position = new BABYLON.Vector3(
                currentRadius * Math.cos(angle) + Math.random() * 0.4,
                0.15,
                currentRadius * Math.sin(angle) + Math.random() * 0.4);
            // TODO: it might make sense to cache these to optimize later?

            // a bit of random scaling
            let randomScale = BABYLON.Scalar.RandomRange(0.2, 0.3);
            particle.scaling = new BABYLON.Vector3(randomScale, randomScale, randomScale);

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

    function setupScene() {
        scene.clearColor = new BABYLON.Color4(0.15, 0.03, 0.29, 1.0);
    }

    function animateFire(pointLight: BABYLON.PointLight, fire: BABYLON.Mesh, easingFunction: BABYLON.Nullable<BABYLON.IEasingFunction>) {
        const animFire = new BABYLON.Animation("animFire", "position.y", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        animFire.setKeys([
            { frame: 0, value: 0.05 },
            { frame: 50, value: 0.35 },
            { frame: 100, value: 0.05 }
        ]);
        animFire.setEasingFunction(easingFunction);

        fire.animations = [];
        fire.animations.push(animFire);
        scene.beginAnimation(fire, 0, 100, true);

        const animLight = new BABYLON.Animation("animLight", "intensity", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        animLight.setKeys([
            { frame: 0, value: 0.8 },
            { frame: 50, value: 1.2 },
            { frame: 100, value: 0.8 }
        ]);
        animLight.setEasingFunction(easingFunction);

        pointLight.animations = [];
        pointLight.animations.push(animLight);
        scene.beginAnimation(pointLight, 0, 100, true);
    }

    function createEasingFunction(): BABYLON.EasingFunction {
        const easingFunction = new BABYLON.CubicEase();
        easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        return easingFunction;
    }

    function createFireModel(): { fire: BABYLON.Mesh; flameProfile: BABYLON.Vector3[]; } {
        const fireMat = new BABYLON.StandardMaterial("fireMat");
        fireMat.emissiveColor = new BABYLON.Color3(0, 1, 0.78);

        const flameProfile = [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(0.5, 0.3, 0),
            new BABYLON.Vector3(0.6, 0.6, 0),
            new BABYLON.Vector3(0.2, 1.5, 0),
            new BABYLON.Vector3(0, 2, 0)
        ];

        const fire = BABYLON.MeshBuilder.CreateLathe("fire", { shape: flameProfile, sideOrientation: BABYLON.Mesh.DOUBLESIDE });
        fire.position.y = 0.15;
        fire.material = fireMat;
        return { fire, flameProfile };
    }

    function createCampfireLogs() {
        const logMat = new BABYLON.StandardMaterial("logMat");
        logMat.diffuseColor = new BABYLON.Color3(0.45, 0.27, 0.04);

        const LOGS = 7;
        for (let i = 0; i < LOGS; i++) {
            let log = BABYLON.MeshBuilder.CreateCylinder("log_" + i, {
                height: BABYLON.Scalar.RandomRange(2.5, 3.5),
                diameter: 0.25
            });
            log.rotation = new BABYLON.Vector3(0, i * (Math.PI / LOGS), -Math.PI / 2);
            log.material = logMat;
        }
    }

    function createGround() {
        const ground = BABYLON.MeshBuilder.CreateGround("ground",
            { width: 100, height: 100, subdivisions: 2 });
        ground.receiveShadows = true;
    }

    function createLightAndShadows(): BABYLON.PointLight {
        const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.diffuse = new BABYLON.Color3(0.45, 0.03, 0.93);
        hemiLight.specular = new BABYLON.Color3(0.03, 0.9, 0.93);
        hemiLight.intensity = 0.2;

        const pointLight = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(0, 1.5, 0), scene);
        pointLight.diffuse = new BABYLON.Color3(0, 1, 0.78);
        pointLight.specular = new BABYLON.Color3(0, 1, 0.78);
        pointLight.intensity = 0.8;
        // pointLight.shadowMaxZ = 7;
        // pointLight.shadowMinZ = 1;

        return pointLight;
    }

    function createCamera(): PanningCamera {
        var camera = new PanningCamera('camera',
            -Math.PI / 3,
            Math.PI / 4,
            6,
            new BABYLON.Vector3(4, 7, -7)
        );

        camera.attachControl(canvas, true, false/*, 1*/);

        camera.panningAxis = new BABYLON.Vector3(1, 0, 1);
        camera.wheelPrecision = 0.1;
        camera.panningSensibility = 50;
        camera.inertia = 0.1;
        camera.panningInertia = 0.12;
        camera._panningMouseButton = 0; // change functionality from left to right mouse button
        camera.angularSensibilityX = 500;
        camera.angularSensibilityY = 500;
        camera.upperBetaLimit = Math.PI / 4;
        camera.lowerBetaLimit = 0;

        return camera;
    }
}