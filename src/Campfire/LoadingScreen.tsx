import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { ILoadingScreen } from "@babylonjs/core";

export class LoadingScreen implements ILoadingScreen {
  private _loadingContainer: GUI.Container;

  constructor(
    public scene: BABYLON.Scene,
    public loadingUIText: string,
    public loadingUIBackgroundColor: string,
  ) {
    this._loadingContainer = new GUI.Container();
    this._loadingContainer.zIndex = 1000;

    const opaqueBG = new GUI.Rectangle();
    opaqueBG.width = 1.0;
    opaqueBG.height = 1.0;
    opaqueBG.thickness = 0.0;
    opaqueBG.background = this.loadingUIBackgroundColor;
    this._loadingContainer.addControl(opaqueBG);

    const fullscreenGUI = GUI.AdvancedDynamicTexture.CreateFullscreenUI(
      "FullscreenUI",
      true,
    );
    fullscreenGUI.addControl(this._loadingContainer);
  }

  public displayLoadingUI = (): void => {
    this._loadingContainer.alpha = 1.0;
  };

  public hideLoadingUI = (): void => {
    this.scene.registerBeforeRender(this.fadeLoadingScreen);
  };

  fadeLoadingScreen = (): void => {
    const deltaTime = this.scene.getEngine().getDeltaTime();
    this._loadingContainer.alpha -= 0.0025 * deltaTime;

    console.log("fade", this._loadingContainer.alpha);

    if (this._loadingContainer.alpha <= 0.0) {
      this._loadingContainer.alpha = 0.0;
      this.scene.unregisterBeforeRender(this.fadeLoadingScreen);
    }
  };
}
