import { Engine, Scene, SceneEventArgs } from 'react-babylonjs'
import * as BABYLON from '@babylonjs/core';

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
        pointLight.shadowMaxZ = 7;
        pointLight.shadowMinZ = 1;

        return pointLight;
    }

    function createCamera(): BABYLON.ArcRotateCamera {
        const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, new BABYLON.Vector3(0, 0, 0));
        camera.upperBetaLimit = Math.PI / 2.2;
        camera.attachControl(canvas, true);
        camera.useAutoRotationBehavior = true;
        return camera;
    }

    // function createCamera() {

    //     // These are the vectors for the camera's position and target
    //     var nextCameraPos: BABYLON.Vector3;
    //     var nextCameraTarget: BABYLON.Vector3;

    //     // Bools to keep track of states
    //     var enableAnim = false;
    //     var zoomEnabled = false;
    //     var boardMove = false;
    //     var buttonDown = false;

    //     // Keep track of previous locations for movement
    //     var previousX = 0;
    //     var previousY = 0;

    //     // When we select a mesh, keep track of it here
    //     var selectedMesh: BABYLON.Nullable<BABYLON.AbstractMesh> = null;

    //     var configureCameraControls = function (camera: BABYLON.ArcRotateCamera) {
    //         // Attach controls
    //         camera.attachControl(canvas, true);
    //         // Remove original keyboard controls
    //         camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    //         camera.inputs.removeByType("ArcRotateCameraPointersInput");

    //         // We need an input object to attach to the camera and some arrays to store what keycodes we care about
    //         var ArcRotateCameraKeyboardPanInput = function (this: any) {
    //             // Array with pressed keys
    //             this._keys = [];
    //             // Arrays with keycodes we care about and what input they should be considered for
    //             this.keysLeft = [37];
    //             this.keysRight = [39];
    //             this.keysUp = [38];
    //             this.keysDown = [40];
    //         };

    //         // We're adding additional booleans to track conditional behavior that the standard ArcRotateCamera can't usually do
    //         ArcRotateCameraKeyboardPanInput.prototype.activeMove = true;
    //         ArcRotateCameraKeyboardPanInput.prototype.activeRotate = false;

    //         // attachControl: Our first required function
    //         ArcRotateCameraKeyboardPanInput.prototype.attachControl = function (noPreventDefault: any) {
    //             // For the JS code, we NEED the element to configure what HTMLElement should be listening for our input
    //             // We want the canvas, in this case
    //             var _this = this;
    //             var engine = this.camera.getEngine();
    //             var element = engine.getInputElement();

    //             // Some of this code leverages existing variables from other related classes to the ArcRotateCamera
    //             // Because of the traits shared amongst the cameras, we can reuse code from other camera without reinventing
    //             // too much of the wheel.  Because we want to pan with the keyboard, the FreeCamera was gracious enough to 
    //             // volunteer some of its code for this.
    //             if (!this._onKeyDown) {
    //                 element.tabIndex = 1;
    //                 this._onKeyDown = function (evt: { keyCode: any; preventDefault: () => void; }) {
    //                     if (_this.keysLeft.indexOf(evt.keyCode) !== -1 ||
    //                         _this.keysRight.indexOf(evt.keyCode) !== -1 ||
    //                         _this.keysUp.indexOf(evt.keyCode) !== -1 ||
    //                         _this.keysDown.indexOf(evt.keyCode) !== -1) {
    //                         var index = _this._keys.indexOf(evt.keyCode);
    //                         if (index === -1) {
    //                             _this._keys.push(evt.keyCode);
    //                         }
    //                         if (!noPreventDefault) {
    //                             evt.preventDefault();
    //                         }
    //                     }
    //                 };
    //                 this._onKeyUp = function (evt: { keyCode: any; preventDefault: () => void; }) {
    //                     if (_this.keysLeft.indexOf(evt.keyCode) !== -1 ||
    //                         _this.keysRight.indexOf(evt.keyCode) !== -1 ||
    //                         _this.keysUp.indexOf(evt.keyCode) !== -1 ||
    //                         _this.keysDown.indexOf(evt.keyCode) !== -1) {
    //                         var index = _this._keys.indexOf(evt.keyCode);
    //                         if (index >= 0) {
    //                             _this._keys.splice(index, 1);
    //                         }
    //                         if (!noPreventDefault) {
    //                             evt.preventDefault();
    //                         }
    //                     }
    //                 };

    //                 element.addEventListener("keydown", this._onKeyDown, false);
    //                 element.addEventListener("keyup", this._onKeyUp, false);
    //                 BABYLON.Tools.RegisterTopRootEvents(canvas, [
    //                     { name: "blur", handler: this._onLostFocus }
    //                 ]);
    //             }
    //         };

    //         // checkInputs: This isn't required to create for custom inputs but it really depends on how you write your input object.
    //         // This function will run with each frame
    //         // I wrote it to handle whatever buttons are pressed and update the camera position just a bit with each tick
    //         ArcRotateCameraKeyboardPanInput.prototype.checkInputs = function () {
    //             if (this._onKeyDown) {
    //                 // This boolean should be true for the overhead view and will pan
    //                 if (this.activeMove) {
    //                     var speed = 2 * camera._computeLocalCameraSpeed();
    //                     let transformMatrix = BABYLON.Matrix.Zero();
    //                     let localDirection = BABYLON.Vector3.Zero();
    //                     let transformedDirection = BABYLON.Vector3.Zero();
    //                     // Keyboard
    //                     for (var index = 0; index < this._keys.length; index++) {
    //                         var keyCode = this._keys[index];
    //                         if (this.keysLeft.indexOf(keyCode) !== -1) {
    //                             localDirection.copyFromFloats(-speed, 0, 0);
    //                         }
    //                         else if (this.keysRight.indexOf(keyCode) !== -1) {
    //                             localDirection.copyFromFloats(speed, 0, 0);
    //                         }
    //                         else if (this.keysUp.indexOf(keyCode) !== -1) {
    //                             localDirection.copyFromFloats(0, speed, 0);
    //                         }
    //                         else if (this.keysDown.indexOf(keyCode) !== -1) {
    //                             localDirection.copyFromFloats(0, -speed, 0);
    //                         }

    //                         // While we don't need this complex of a solution to pan on the X and Z axis, this is a good
    //                         // way to handle movement when the camera angle isn't fixed like ours is.
    //                         camera.getViewMatrix().invertToRef(transformMatrix);
    //                         BABYLON.Vector3.TransformNormalToRef(localDirection, transformMatrix, transformedDirection);
    //                         camera.position.addInPlace(transformedDirection);
    //                         camera.target.addInPlace(transformedDirection);
    //                     }
    //                 }
    //                 // This should only be active when zoomed in, it uses the existing camera rotation code to rotate with keyboard input
    //                 else if (this.activeRotate) {
    //                     for (var index = 0; index < this._keys.length; index++) {
    //                         var keyCode = this._keys[index];
    //                         if (this.keysLeft.indexOf(keyCode) !== -1) {
    //                             camera.inertialAlphaOffset -= 3 / 1000;
    //                         }
    //                         else if (this.keysRight.indexOf(keyCode) !== -1) {
    //                             camera.inertialAlphaOffset -= -3 / 1000;
    //                         }
    //                         else if (this.keysUp.indexOf(keyCode) !== -1) {
    //                             camera.inertialBetaOffset -= 3 / 1000;
    //                         }
    //                         else if (this.keysDown.indexOf(keyCode) !== -1) {
    //                             camera.inertialBetaOffset -= -3 / 1000;
    //                         }
    //                     }
    //                 }
    //             }
    //         };

    //         // getClassName - String used as a reference name for your input object
    //         ArcRotateCameraKeyboardPanInput.prototype.getClassName = function () {
    //             return "ArcRotateCameraKeyboardPanInput";
    //         };

    //         // getClassName - String used as a reference name for your input object, simpler version
    //         ArcRotateCameraKeyboardPanInput.prototype.getSimpleName = function () {
    //             return "KeyboardPan";
    //         };

    //         // detachControl - The last required function.  We need this to undo our listeners if this input object is removed
    //         // or if the camera is disposed of.
    //         ArcRotateCameraKeyboardPanInput.prototype.detachControl = function () {
    //             if (this._onKeyDown) {
    //                 var engine = this.camera.getEngine();
    //                 var element = engine.getInputElement();
    //                 element.removeEventListener("keydown", this._onKeyDown);
    //                 element.removeEventListener("keyup", this._onKeyUp);
    //                 BABYLON.Tools.UnregisterTopRootEvents(canvas, [
    //                     { name: "blur", handler: this._onLostFocus }
    //                 ]);
    //                 this._keys = [];
    //                 this._onKeyDown = null;
    //                 this._onKeyUp = null;
    //             }
    //         };

    //         // Add completed keyboard input
    //         camera.inputs.add(new ArcRotateCameraKeyboardPanInput());
    //     };

    //     var squareSize = 5;
    //     var squareLength = 8;
    //     var boardRadius = squareSize * squareLength * 1.25;

    //     // This is where we initialize and configure our camera
    //     var camPosValue = squareSize * ((squareLength - 1) / 2);
    //     nextCameraTarget = new BABYLON.Vector3(camPosValue, 0, camPosValue);
    //     var camera = new BABYLON.ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 3, boardRadius, nextCameraTarget, scene);
    //     nextCameraPos = new BABYLON.Vector3(camPosValue, boardRadius, camPosValue);
    //     camera.setPosition(nextCameraPos);
    //     configureCameraControls(camera);

    //     /**
    //          * Pointer Input: First we check for a drag behavior, if we don't find that we check for a double-tap (exit zoom).
    //          * Finally, we check if a mesh has been tapped on
    //          */
    //     scene.onPointerObservable.add((eventData) => {
    //         // Only allow pointer input when we're not moving
    //         if (!enableAnim) {
    //             if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN && !zoomEnabled) {
    //                 previousX = eventData.event.clientX;
    //                 previousY = eventData.event.clientY;
    //                 buttonDown = true;
    //             }
    //             else if (eventData.type === BABYLON.PointerEventTypes.POINTERUP && !zoomEnabled) {
    //                 buttonDown = false;
    //             }
    //             // Normally, we could just use the PointerEvent's movementX/Y but since iOS doesn' support that
    //             // We have to be a bit more creative and calculate the movement delta ourselves.
    //             else if (eventData.type === BABYLON.PointerEventTypes.POINTERMOVE && buttonDown) {
    //                 let moveX = 0;
    //                 let moveZ = 0;

    //                 if (previousX - eventData.event.clientX !== 0) {
    //                     moveX = eventData.event.clientX - previousX;
    //                 }

    //                 if (previousY - eventData.event.clientY !== 0) {
    //                     moveZ = eventData.event.clientY - previousY;
    //                 }

    //                 camera.position.x += moveX / 15;
    //                 camera.position.z -= moveZ / 15;
    //                 camera.target.x += moveX / 15;
    //                 camera.target.z -= moveZ / 15;

    //                 previousX = eventData.event.clientX;
    //                 previousY = eventData.event.clientY;
    //             }
    //             else if (eventData.type === BABYLON.PointerEventTypes.POINTERDOUBLETAP && zoomEnabled) {
    //                 camera.inputs.removeByType("ArcRotateCameraPointersInput");
    //                 camera.inputs.attached["KeyboardPan"].activeRotate = false;
    //                 nextCameraPos = new BABYLON.Vector3(nextCameraTarget.x, boardRadius, nextCameraTarget.z + 1);
    //                 nextCameraTarget = new BABYLON.Vector3(nextCameraTarget.x, 0, nextCameraTarget.z);
    //                 enableAnim = true;
    //                 zoomEnabled = false;
    //                 selectedMesh.renderOutline = false;
    //                 selectedMesh = null;
    //             }
    //             // We only care if a non-plane object has been picked.
    //             else if (eventData.type === BABYLON.PointerEventTypes.POINTERPICK) {
    //                 let x = eventData.pickInfo.pickedMesh.position.x;
    //                 let z = eventData.pickInfo.pickedMesh.position.z;
    //                 buttonDown = false;

    //                 if (eventData.pickInfo.pickedMesh.name.search("square") === -1 && eventData.pickInfo.pickedMesh !== selectedMesh) {
    //                     nextCameraTarget = eventData.pickInfo.pickedMesh.position;
    //                     camera.inputs.attached["KeyboardPan"].activeMove = false;
    //                     enableAnim = true;
    //                     zoomEnabled = true;
    //                     nextCameraPos = new BABYLON.Vector3(x, squareSize, z + 10);

    //                     if (selectedMesh) {
    //                         selectedMesh.renderOutline = false;
    //                     }

    //                     selectedMesh = eventData.pickInfo.pickedMesh;
    //                     selectedMesh.renderOutline = true;
    //                 }
    //             }
    //         }
    //     });

    //     // This allows the Escape key to be an additional way to exit the zoomed in view
    //     scene.onKeyboardObservable.add((eventData) => {
    //         if (eventData.type === BABYLON.KeyboardEventTypes.KEYUP && eventData.event.keyCode === 27 && zoomEnabled) {
    //             camera.inputs.removeByType("ArcRotateCameraPointersInput");
    //             camera.inputs.attached["KeyboardPan"].activeRotate = false;
    //             nextCameraPos = new BABYLON.Vector3(nextCameraTarget.x, boardRadius, nextCameraTarget.z + 1);
    //             nextCameraTarget = new BABYLON.Vector3(nextCameraTarget.x, 0, nextCameraTarget.z);
    //             enableAnim = true;
    //             zoomEnabled = false;
    //             selectedMesh.renderOutline = false;
    //             selectedMesh = null;
    //         }
    //     });

    //     // Our "game loop".  If we have new position to move the camera and enableAnim is true, "gracefully" move to
    //     // that position using a lerp
    //     scene.onBeforeRenderObservable.add(() => {
    //         if (enableAnim) {
    //             let deltaX = Math.abs(nextCameraPos.x - camera.position.x);
    //             let deltaY = Math.abs(nextCameraPos.y - camera.position.y);
    //             let deltaZ = Math.abs(nextCameraPos.z - camera.position.z);

    //             if (deltaX > 0.01 || deltaY > 0.01 || deltaZ > 0.01) {
    //                 camera.setPosition(BABYLON.Vector3.Lerp(camera.position, nextCameraPos, 0.05));
    //                 camera.setTarget(BABYLON.Vector3.Lerp(camera.target, nextCameraTarget, 0.05));
    //             }
    //             // If we're close enough, finalize movement and disable animation
    //             else if (camera.target !== nextCameraTarget) {
    //                 camera.position = nextCameraPos;
    //                 camera.target = nextCameraTarget;
    //                 enableAnim = false;

    //                 if (!zoomEnabled) {
    //                     camera.inputs.attached["KeyboardPan"].activeMove = true;
    //                 }
    //                 else if (!camera.inputs.attached["KeyboardPan"].activeRotate) {
    //                     camera.inputs.add(new BABYLON.ArcRotateCameraPointersInput());
    //                     camera.panningSensibility = 0;
    //                     camera.inputs.attached["KeyboardPan"].activeRotate = true;
    //                 }
    //             }
    //         }
    //     });

    //     return camera;
    // }
}