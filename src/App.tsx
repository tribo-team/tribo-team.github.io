import "./App.css";
import { CampfireScene } from "./Campfire/CampfireScene";
import { useState } from "react";

function App(): JSX.Element {
  const initialAmount = 5000;
  const [flameyAmount] = useState(initialAmount);
  // const [selectedIdx, setSelectedIdx] = useState(-1);
  // const [showModal, setShowModal] = useState(false);
  //
  // const campfireSceneRef = useRef<CampfireScene>(null);
  //
  // const onNewAmount = (e: ChangeEvent<HTMLInputElement>): void => {
  //   const newAmount = +e.target.value;
  //   if (newAmount !== flameyAmount) {
  //     setFlameyAmount(newAmount);
  //     setSelectedIdx(-1);
  //     campfireSceneRef.current?.setNewAmount(flameyAmount);
  //     campfireSceneRef.current?.centerCamera();
  //   }
  // };

  return (
    <div className="vh-100" style={{ flex: 1, display: "flex" }}>
      <CampfireScene
        flameyAmount={flameyAmount}
        // ref={campfireSceneRef}
        // onFlameyPicked={() => {
        // setSelectedIdx(idx);
        // setShowModal(true);
        // }}
      />
    </div>
  );
}

export default App;
