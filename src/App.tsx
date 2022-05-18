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

  const onNewAmount = (e: ChangeEvent<HTMLInputElement>): void => {
    const newAmount = +e.target.value;
    if (newAmount !== flameyAmount) {
      setFlameyAmount(newAmount);
      setSelectedIdx(-1);
      campfireSceneRef.current?.setNewAmount(flameyAmount);
      campfireSceneRef.current?.centerCamera();
    }
  };

  return (
    <>
      <Navbar collapseOnSelect expand="lg" bg="dark" variant="dark">
        <Container>
          <Navbar.Brand href="#home">
            <img
              alt="logo"
              src={logo}
              width="70"
              height="70"
              className="d-inline-block align-center"
            />{" "}
            Tribo
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="responsive-navbar-nav" />
          <Navbar.Collapse id="responsive-navbar-nav">
            {/* hack to align the rest of navs to the right */}
            <Nav className="me-auto"></Nav>
            <Nav>
              <Nav.Link href="#mint">Mint</Nav.Link>
              <Nav.Link href="#about">About</Nav.Link>
              <Nav.Link href="#jobs">Jobs</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        <Row className="mt-3">
          <h1>Minting</h1>
        </Row>
        <Row>
          <Col sm={10}>
            <CampfireScene
              ref={campfireSceneRef}
              flameyAmount={flameyAmount}
              onFlameyPicked={(idx) => {
                setSelectedIdx(idx);
                setShowModal(true);
              }}
            />
          </Col>
          <Col sm={2}>
            <Card bg={"dark"} text={"white"}>
              <Card.Body>
                <Card.Title>Minting stuff</Card.Title>
                <Card.Text>Some instructions?</Card.Text>
                {selectedIdx != -1 && (
                  <Card.Footer>last picked flamey: #{selectedIdx}</Card.Footer>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col sm={12}>
            <RangeSlider
              value={flameyAmount}
              onChange={onNewAmount}
              tooltip="auto"
              step={10}
              min={10}
              max={3010}
            />
          </Col>
        </Row>

        <Modal centered show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Look at this flamey!</Modal.Title>
          </Modal.Header>
          <Modal.Body>You've selected flamey #{selectedIdx}</Modal.Body>
        </Modal>

        <Row className="mt-3">
          <h1>About</h1>
          Long description of what we're trying to do, company mission etc I
          guess.
        </Row>

        <Row className="mt-3">
          <h1>Jobs</h1>
          We're looking for people, etc, link to Notion page or something.
        </Row>
      </Container>
    </>
  );
}

export default App;
