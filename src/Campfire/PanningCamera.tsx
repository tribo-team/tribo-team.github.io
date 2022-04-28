import * as BABYLON from '@babylonjs/core';

export class PanningCamera extends BABYLON.ArcRotateCamera {
    private _localDirection: BABYLON.Vector3 | undefined = undefined;

    public override _checkInputs(): void {
        //if (async) collision inspection was triggered, don't update the camera's position - until the collision callback was called.
        if (this._collisionTriggered) {
            return;
        }

        this.inputs.checkInputs();

        // Inertia
        if (this.inertialAlphaOffset !== 0 || this.inertialBetaOffset !== 0 || this.inertialRadiusOffset !== 0) {
            if (this.getScene().useRightHandedSystem) {
                this.alpha -= this.beta <= 0 ? -this.inertialAlphaOffset : this.inertialAlphaOffset;
            }
            else {
                this.alpha += this.beta <= 0 ? -this.inertialAlphaOffset : this.inertialAlphaOffset;
            }
            this.beta += this.inertialBetaOffset;
            this.radius -= this.inertialRadiusOffset;
            this.inertialAlphaOffset *= this.inertia;
            this.inertialBetaOffset *= this.inertia;
            this.inertialRadiusOffset *= this.inertia;
            if (Math.abs(this.inertialAlphaOffset) < BABYLON.Epsilon)
                this.inertialAlphaOffset = 0;
            if (Math.abs(this.inertialBetaOffset) < BABYLON.Epsilon)
                this.inertialBetaOffset = 0;
            if (Math.abs(this.inertialRadiusOffset) < this.speed * BABYLON.Epsilon)
                this.inertialRadiusOffset = 0;
        }

        // Panning inertia
        if (this.inertialPanningX !== 0 || this.inertialPanningY !== 0) {
            if (!this._localDirection) {
                this._localDirection = BABYLON.Vector3.Zero();
                this._transformedDirection = BABYLON.Vector3.Zero();
            }
            this._localDirection.copyFromFloats(this.inertialPanningX, this.inertialPanningY, this.inertialPanningY);
            this._localDirection.multiplyInPlace(this.panningAxis);
            this._viewMatrix.invertToRef(this._cameraTransformMatrix);
            
            //Eliminate y if map panning is enabled (panningAxis == 1,0,1)
            if (!this.panningAxis.y) {
                this._transformNormalToRefForMapPanning(this._localDirection, this._cameraTransformMatrix, this._transformedDirection);
                this._transformedDirection.y = 0;
            }
            else {
                BABYLON.Vector3.TransformNormalToRef(this._localDirection, this._cameraTransformMatrix, this._transformedDirection);
            }

            if (!this._targetHost) {
                if (this.panningDistanceLimit) {
                    this._transformedDirection.addInPlace(this._target);
                    var distanceSquared = BABYLON.Vector3.DistanceSquared(this._transformedDirection, this.panningOriginTarget);
                    if (distanceSquared <= (this.panningDistanceLimit * this.panningDistanceLimit)) {
                        this._target.copyFrom(this._transformedDirection);
                    }
                }
                else {
                    this._target.addInPlace(this._transformedDirection);
                }
            }

            this.inertialPanningX *= this.panningInertia;
            this.inertialPanningY *= this.panningInertia;
            if (Math.abs(this.inertialPanningX) < this.speed * BABYLON.Epsilon)
                this.inertialPanningX = 0;
            if (Math.abs(this.inertialPanningY) < this.speed * BABYLON.Epsilon)
                this.inertialPanningY = 0;
        }

        // Limits
        this._checkLimits();

        // super._checkInputs.call(this);
    }

    private _transformNormalToRefForMapPanning(
        vector: BABYLON.Vector3,
        transformation: BABYLON.Matrix,
        result: BABYLON.Vector3
    ): void {
        var x = (vector.x * transformation.m[0]) + (vector.y * transformation.m[8]) + (vector.z * transformation.m[4]);
        var y = (vector.x * transformation.m[1]) + (vector.y * transformation.m[9]) + (vector.z * transformation.m[5]);
        var z = (vector.x * transformation.m[2]) + (vector.y * transformation.m[10]) + (vector.z * transformation.m[6]);

        result.x = x;
        result.y = y;
        result.z = z;
    };
}
