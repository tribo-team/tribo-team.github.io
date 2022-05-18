import logo from "./logo.png";
import "./App.css";
import { CampfireScene } from "./Campfire/CampfireScene";
import { Card, Col, Container, Modal, Nav, Navbar, Row } from "react-bootstrap";
import { useState, useRef, ChangeEvent } from "react";
import RangeSlider from "react-bootstrap-range-slider";

function App(): JSX.Element {
  const initialAmount = 200;
  const [flameyAmount, setFlameyAmount] = useState(initialAmount);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [showModal, setShowModal] = useState(false);

  const campfireSceneRef = useRef<CampfireScene>(null);

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
    <div className="vh-100">
      <CampfireScene
        ref={campfireSceneRef}
        flameyAmount={flameyAmount}
        onFlameyPicked={(idx) => {
          setSelectedIdx(idx);
          setShowModal(true);
        }}
      />
    </div>
  );
}

export default App;
