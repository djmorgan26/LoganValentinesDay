/* hospital.js — Three.js 3D Hospital Scene
   Phase A: Surgery (click 4 glowing spots on Robot-David)
   Phase B: Roaming (WASD/arrows, interact with 4 spots) */

(function () {
  "use strict";

  if (typeof THREE === "undefined") {
    console.warn("Three.js not loaded — hospital scene disabled.");
    return;
  }

  // ============ CONSTANTS ============
  const COLORS = {
    floorTileA: 0x272737,
    floorTileB: 0x2d2d41,
    wall: 0x1e1e2e,
    table: 0x444466,
    robotBody: 0x8899aa,
    robotEye: 0x44aaff,
    robotAntenna: 0xff6644,
    doctorCoat: 0xeeeeee,
    doctorSkin: 0xe8b89d,
    doctorCross: 0xff3333,
    lightGlow: 0xffffcc,
    glowSpot: 0xff7aa2,
    hallwayBoard: 0x7a5d7b,
    bulletinPaper: 0xfde0ef,
    wood: 0x6b4b3f,
    desk: 0x665544,
    plant: 0x3b8054,
    ceiling: 0x151525,
    sign: 0xf5d6ff,
    photoFrame: 0xb66a7d,
    coffeeMachine: 0x3a2a3e,
    mug: 0xffc9a9,
    willowFur: 0x4d2b1c,
    willowEars: 0x3a1c12,
    willowCollar: 0xff6688,
    door: 0x5a4d3a,
    vendingMachine: 0x336655,
  };

  const FLOOR_CONFIG = {
    width: 36,
    depth: 34,
    startZ: -12,
  };
  const FLOOR_CENTER_Z = FLOOR_CONFIG.startZ + FLOOR_CONFIG.depth / 2;

  const SURGERY_SPOTS = [
    { name: "heart", label: "Heart (chest)", offset: { x: 0, y: 1.2, z: 0.35 }, message: "Love module installed. Warning: capacity infinite. Side effect: wanting to be near Logan always." },
    { name: "brain", label: "Brain (head)", offset: { x: 0, y: 2.1, z: 0.3 }, message: "Uploading: 3 years of memories. Switzerland. Barcelona. Every spicy tuna roll. Storage: full." },
    { name: "arm", label: "Arm (left)", offset: { x: -0.7, y: 1.0, z: 0.3 }, message: "Hug pressure calibrated to: never letting go. Skin contact analysis: flawless. Dr. Logan approved." },
    { name: "eyes", label: "Eyes (face)", offset: { x: 0, y: 1.9, z: 0.5 }, message: "Visual target locked: only you. Dermatology scan complete — you're glowing. Literally." },
  ];

  const ROAM_SPOTS = [
    { name: "vending", position: { x: 1.5, z: 9 }, message: "The vending machine spit out Swiss chocolate AND spicy tuna. Destiny tastes like snacks we shared in Barcelona.", icon: "Vending Machine" },
    { name: "window", position: { x: 6, z: -3 }, message: "From this window I can almost see the Alps. Remember clinging to me mid-paraglide? Still my favorite view.", icon: "Observation Window" },
    { name: "desk", position: { x: -4, z: 4 }, message: "Patient chart: Logan ✔, David ✔, Diagnosis: incurable affection. Prognosis: infinite Valentine adventures.", icon: "Nurse's Station" },
    { name: "willow", position: { x: 11, z: 14 }, message: "Woof! (Willow approves of this relationship and requests unlimited belly rubs for both of us.)", icon: "Willow", dynamic: "willow" },
    { name: "photoWall", position: { x: -13, z: 16 }, message: "3 years. 12 countries. 1,000 sushi rolls. Still not enough I love yous.", icon: "Photo Wall" },
    { name: "coffee", position: { x: 13, z: 12 }, message: "Brewing: one cup of 'I love you more than caffeine' with a Switzerland crema swirl.", icon: "Coffee Machine" },
    { name: "door", position: { x: 0, z: 20 }, message: "Happy Valentine's Day, Logan.", icon: "Exit" },
  ];

  const WALKABLE_AREAS = [
    { minX: -7, maxX: 7, minZ: -6.5, maxZ: 6.5 }, // OR room
    { minX: -2.5, maxX: 2.5, minZ: 6.5, maxZ: 21.5 }, // hallway
    { minX: -12, maxX: 12, minZ: 10, maxZ: 14 }, // cross corridor
    { minX: -18, maxX: -6.5, minZ: 10, maxZ: 20 }, // office
    { minX: 6.5, maxX: 18, minZ: 10, maxZ: 20 }, // break room
  ];

  // ============ STATE ============
  let scene, camera, renderer, raycaster, mouse;
  let robot, doctor, robotGroup, doctorGroup;
  let phase = "idle"; // idle | surgery | roaming
  let surgeryCompleted = {};
  let roamCompleted = {};
  let keysDown = {};
  let pairPosition = { x: 0, z: 2 };
  let glowSpots = [];
  let roamMarkers = [];
  let roamMarkerMap = {};
  let animationId = null;
  let msgTimeout = null;
  let joystick = null;
  let joystickThumb = null;
  let joystickVector = { x: 0, z: 0 };
  let joystickTouchId = null;
  let doorPromptActive = false;
  let cameraIntro = null;
  let lastFrameTime = Date.now();
  let doorHeartsShown = false;

  let ambientLight, dirLight, tableLight;
  let hallwayLight, officeLight, breakLight;
  let monitorScreen = null;
  let ceilingFan = null;
  let xrayPlates = [];
  const heartParticles = [];
  let willowGroup = null;
  let willowHeart = null;
  let willowDirection = 1;
  const willowBounds = { minX: 9.5, maxX: 12.5 };
  let doorLight = null;

  const overlay = document.getElementById("hospitalOverlay");
  const canvas = document.getElementById("hospitalCanvas");
  const ui = document.getElementById("hospitalUI");

  // ============ LAUNCH ============
  window.launchHospital = function () {
    overlay.classList.remove("hidden");
    init();
    phase = "surgery";
    setupSurgery();
    animate();
  };

  // ============ SCENE SETUP ============
  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111118);
    scene.fog = new THREE.Fog(0x111118, 15, 25);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 6, 8);
    camera.lookAt(0, 1, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lights
    ambientLight = new THREE.AmbientLight(0x444455, 0.55);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(3, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    tableLight = new THREE.PointLight(COLORS.lightGlow, 1.3, 12);
    tableLight.position.set(0, 4, 0);
    tableLight.castShadow = true;
    scene.add(tableLight);

    // World
    buildHospitalWorld();

    // Characters
    robotGroup = buildRobot();
    robotGroup.position.set(0, 0.8, 0); // on table
    scene.add(robotGroup);

    doctorGroup = buildDoctor();
    doctorGroup.position.set(1.5, 0, 1);
    scene.add(doctorGroup);

    // Events
    window.addEventListener("resize", onResize);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchend", onTouch);
    window.addEventListener("keydown", (e) => { keysDown[e.key.toLowerCase()] = true; });
    window.addEventListener("keyup", (e) => { keysDown[e.key.toLowerCase()] = false; });

    setupJoystick();
    lastFrameTime = Date.now();
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ============ BUILD WORLD ============
  function buildHospitalWorld() {
    buildFloorAndCeiling();
    buildWallsAndDoorways();
    buildOperatingRoomProps();
    buildHallwayProps();
    buildOfficeProps();
    buildBreakRoomProps();
    addRoomLights();
  }

  function buildFloorAndCeiling() {
    const tileSize = 4;
    const startX = -FLOOR_CONFIG.width / 2;
    for (let x = startX; x < startX + FLOOR_CONFIG.width; x += tileSize) {
      for (let z = FLOOR_CONFIG.startZ; z < FLOOR_CONFIG.startZ + FLOOR_CONFIG.depth; z += tileSize) {
        const index = Math.round((x - startX) / tileSize) + Math.round((z - FLOOR_CONFIG.startZ) / tileSize);
        const color = index % 2 === 0 ? COLORS.floorTileA : COLORS.floorTileB;
        const tile = new THREE.Mesh(
          new THREE.PlaneGeometry(tileSize, tileSize),
          new THREE.MeshLambertMaterial({ color })
        );
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x + tileSize / 2, 0, z + tileSize / 2);
        tile.receiveShadow = true;
        scene.add(tile);
      }
    }

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(FLOOR_CONFIG.width, FLOOR_CONFIG.depth),
      new THREE.MeshLambertMaterial({ color: COLORS.ceiling, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 5, FLOOR_CENTER_Z);
    scene.add(ceiling);

    const ceilingGrid = new THREE.GridHelper(FLOOR_CONFIG.width, FLOOR_CONFIG.width / 2, 0x2f2f44, 0x1d1d2c);
    ceilingGrid.position.set(0, 5.02, FLOOR_CENTER_Z);
    scene.add(ceilingGrid);
  }

  function buildWallsAndDoorways() {
    const wallSegments = [
      { x: 0, z: -7.5, width: 16, depth: 0.4, height: 4.5 },
      { x: -8.2, z: 0, width: 0.4, depth: 14, height: 4.5 },
      { x: 8.2, z: 0, width: 0.4, depth: 14, height: 4.5 },
      { x: -5.5, z: 7.5, width: 5, depth: 0.4, height: 4.3 },
      { x: 5.5, z: 7.5, width: 5, depth: 0.4, height: 4.3 },
      { x: -2.4, z: 12.5, width: 0.4, depth: 10, height: 4 },
      { x: 2.4, z: 12.5, width: 0.4, depth: 10, height: 4 },
      { x: 0, z: 21.8, width: 5, depth: 0.4, height: 4 },
      // Office shell
      { x: -12.5, z: 9.8, width: 9, depth: 0.4, height: 4 },
      { x: -12.5, z: 20, width: 9, depth: 0.4, height: 4 },
      { x: -17, z: 15, width: 0.4, depth: 10, height: 4 },
      { x: -8.1, z: 18.2, width: 0.4, depth: 5.6, height: 4 },
      { x: -8.1, z: 10.6, width: 0.4, depth: 3.2, height: 4 },
      // Break room shell
      { x: 12.5, z: 9.8, width: 9, depth: 0.4, height: 4 },
      { x: 12.5, z: 20, width: 9, depth: 0.4, height: 4 },
      { x: 17, z: 15, width: 0.4, depth: 10, height: 4 },
      { x: 8.1, z: 18.2, width: 0.4, depth: 5.6, height: 4 },
      { x: 8.1, z: 10.6, width: 0.4, depth: 3.2, height: 4 },
    ];
    wallSegments.forEach(({ x, z, width, depth, height }) => addWallSegment(x, z, width, depth, height));

    buildDoorFrame(0, 7.35, 0);
    buildDoorFrame(-8.1, 12.5, Math.PI / 2);
    buildDoorFrame(8.1, 12.5, Math.PI / 2);
    buildDoorFrame(0, 20.9, 0);
  }

  function addWallSegment(x, z, width, depth, height = 4) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshLambertMaterial({ color: COLORS.wall })
    );
    wall.position.set(x, height / 2, z);
    wall.castShadow = true;
    scene.add(wall);
  }

  function buildDoorFrame(x, z, rotation = 0) {
    const frameGroup = new THREE.Group();
    const postGeo = new THREE.BoxGeometry(0.2, 3.8, 0.3);
    const mat = new THREE.MeshLambertMaterial({ color: 0x8888aa });
    const left = new THREE.Mesh(postGeo, mat);
    left.position.set(-1.2, 1.9, 0);
    const right = left.clone();
    right.position.x = 1.2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 0.3), mat);
    top.position.set(0, 3.7, 0);
    frameGroup.add(left, right, top);
    frameGroup.position.set(x, 0, z);
    frameGroup.rotation.y = rotation;
    scene.add(frameGroup);
  }

  function buildOperatingRoomProps() {
    const tableMat = new THREE.MeshLambertMaterial({ color: COLORS.table });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 1.3), tableMat);
    tableTop.position.set(0, 0.8, 0);
    tableTop.castShadow = true;
    scene.add(tableTop);

    for (const [lx, lz] of [[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.45], [1.1, 0.45]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), tableMat);
      leg.position.set(lx, 0.4, lz);
      scene.add(leg);
    }

    const fixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.45, 0.15, 12),
      new THREE.MeshLambertMaterial({ color: 0xdedede })
    );
    fixture.position.set(0, 4.6, 0.2);
    scene.add(fixture);

    ceilingFan = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 12), new THREE.MeshLambertMaterial({ color: 0x777777 }));
    ceilingFan.add(hub);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.15), new THREE.MeshLambertMaterial({ color: 0x999999 }));
      blade.rotation.y = (Math.PI / 2) * i;
      blade.position.x = Math.cos((Math.PI / 2) * i) * 1.2;
      blade.position.z = Math.sin((Math.PI / 2) * i) * 1.2;
      ceilingFan.add(blade);
    }
    ceilingFan.position.set(0, 4.9, 0.2);
    scene.add(ceilingFan);

    const monitor = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.5, 0.15),
      new THREE.MeshLambertMaterial({ color: 0x161628 })
    );
    monitor.position.set(-2, 1.6, -0.8);
    scene.add(monitor);

    monitorScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.58, 0.42),
      new THREE.MeshBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.5 })
    );
    monitorScreen.position.set(-2, 1.6, -0.72);
    monitorScreen.userData = {};
    scene.add(monitorScreen);

    const ivPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.3, 12),
      new THREE.MeshLambertMaterial({ color: 0xb9c5d7 })
    );
    ivPole.position.set(-1.4, 1.15, 1);
    scene.add(ivPole);
    const ivTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.04), ivPole.material);
    ivTop.position.set(-1.4, 2.3, 1);
    scene.add(ivTop);
    const ivBag = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.1), new THREE.MeshLambertMaterial({ color: 0xff7aa2, transparent: true, opacity: 0.8 }));
    ivBag.position.set(-1.2, 1.6, 1);
    scene.add(ivBag);

    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.6), new THREE.MeshLambertMaterial({ color: 0x3a4f73 }));
    cart.position.set(2.4, 0.6, -1.2);
    cart.castShadow = true;
    scene.add(cart);
    const cartShelf = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.5), new THREE.MeshLambertMaterial({ color: 0x8aa1cf }));
    cartShelf.position.set(2.4, 0.85, -1.2);
    scene.add(cartShelf);

    const nurseDesk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 0.9), new THREE.MeshLambertMaterial({ color: COLORS.desk || COLORS.wood }));
    nurseDesk.position.set(-4, 0.6, 4);
    scene.add(nurseDesk);
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ color: 0xfff0f3 }));
    chart.position.set(-4.2, 1.2, 4.45);
    chart.rotation.y = Math.PI;
    scene.add(chart);

    const windowPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x4a6c8f, transparent: true, opacity: 0.6 })
    );
    windowPanel.position.set(6.9, 2.2, -2);
    windowPanel.rotation.y = Math.PI / 2;
    scene.add(windowPanel);
    const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 3.4), new THREE.MeshLambertMaterial({ color: 0xccccdd }));
    windowFrame.position.set(6.9, 2.2, -2);
    windowFrame.rotation.y = Math.PI / 2;
    scene.add(windowFrame);

    xrayPlates = [];
    [-3.5, -1.4].forEach((xPos, idx) => {
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.6),
        new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x9bd7ff : 0xfdd7ff, transparent: true, opacity: 0.65 })
      );
      plate.position.set(xPos, 2.5, -6.9);
      plate.rotation.y = Math.PI;
      scene.add(plate);
      xrayPlates.push(plate);
    });

    const exitDoor = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 4.2),
      new THREE.MeshLambertMaterial({ color: COLORS.door })
    );
    exitDoor.position.set(0, 2.1, 21.2);
    exitDoor.rotation.y = Math.PI;
    scene.add(exitDoor);
  }

  function buildHallwayProps() {
    const vending = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.8, 0.8),
      new THREE.MeshLambertMaterial({ color: COLORS.vendingMachine })
    );
    vending.position.set(1.5, 1.4, 9);
    scene.add(vending);
    const vendingPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.3),
      new THREE.MeshBasicMaterial({ color: 0xfaf4ff })
    );
    vendingPanel.position.set(1.85, 1.5, 8.62);
    vendingPanel.rotation.y = -0.2;
    scene.add(vendingPanel);

    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.4),
      new THREE.MeshLambertMaterial({ color: COLORS.hallwayBoard })
    );
    board.position.set(-2.2, 1.5, 12.4);
    board.rotation.y = Math.PI;
    scene.add(board);
    for (let i = 0; i < 4; i++) {
      const note = buildHeartIcon(0xff88a6);
      note.scale.set(0.6, 0.6, 0.6);
      note.position.set(-2.7 + i * 0.4, 1.7 - (i % 2) * 0.4, 12.3);
      scene.add(note);
    }

    const officeSign = createTextSign("→ Logan's Office");
    if (officeSign) {
      officeSign.position.set(-2.3, 2.1, 10.8);
      officeSign.rotation.y = Math.PI / 2;
      scene.add(officeSign);
    }
    const breakSign = createTextSign("Break Room ←");
    if (breakSign) {
      breakSign.position.set(2.3, 2.1, 10.8);
      breakSign.rotation.y = -Math.PI / 2;
      scene.add(breakSign);
    }
  }

  function buildOfficeProps() {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 1.2), new THREE.MeshLambertMaterial({ color: COLORS.wood }));
    desk.position.set(-13, 1, 15.5);
    scene.add(desk);
    for (const offset of [-1.2, 1.2]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2), new THREE.MeshLambertMaterial({ color: COLORS.wood }));
      leg.position.set(-13 + offset, 0.3, 15.1);
      scene.add(leg);
    }

    const bookshelf = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 0.4), new THREE.MeshLambertMaterial({ color: 0x3d2a3b }));
    bookshelf.position.set(-16.4, 1.6, 14);
    scene.add(bookshelf);
    const bookColors = [0xff8da6, 0xffb0c6, 0xffd4e1, 0xfca4b5];
    bookColors.forEach((color, idx) => {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 0.35), new THREE.MeshLambertMaterial({ color }));
      book.position.set(-16.4, 0.8 + idx * 0.55, 13.9);
      scene.add(book);
    });

    const photoWall = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.1, 0.05),
        new THREE.MeshLambertMaterial({ color: COLORS.photoFrame })
      );
      frame.position.set(-13.8 + i * 1.2, 2.4, 17.8);
      frame.rotation.y = Math.PI;
      const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), new THREE.MeshBasicMaterial({ color: 0xfff6fa }));
      photo.position.set(frame.position.x, frame.position.y, 17.82);
      photo.rotation.y = Math.PI;
      photoWall.add(frame, photo);
    }
    scene.add(photoWall);

    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 12), new THREE.MeshLambertMaterial({ color: COLORS.mug }));
    mug.position.set(-12.3, 1.2, 15.4);
    scene.add(mug);
    const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), new THREE.MeshLambertMaterial({ color: COLORS.mug }));
    mugHandle.position.set(-12.1, 1.2, 15.4);
    mugHandle.rotation.z = Math.PI / 2;
    scene.add(mugHandle);
  }

  function buildBreakRoomProps() {
    const counter = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 1), new THREE.MeshLambertMaterial({ color: COLORS.wood }));
    counter.position.set(13, 0.5, 11);
    scene.add(counter);

    const coffeeMachine = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.8), new THREE.MeshLambertMaterial({ color: COLORS.coffeeMachine }));
    coffeeMachine.position.set(13.2, 1.1, 11);
    scene.add(coffeeMachine);
    const coffeeLight = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.3), new THREE.MeshBasicMaterial({ color: 0xff77aa }));
    coffeeLight.position.set(13.2, 1.4, 10.63);
    coffeeLight.rotation.y = Math.PI;
    scene.add(coffeeLight);

    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 16), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    table.position.set(10.5, 0.85, 14.8);
    scene.add(table);
    const tableStem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 12), new THREE.MeshLambertMaterial({ color: 0x444444 }));
    tableStem.position.set(10.5, 0.45, 14.8);
    scene.add(tableStem);

    for (const offset of [-0.8, 0.8]) {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), new THREE.MeshLambertMaterial({ color: 0xffacc9 }));
      chair.position.set(10.5 + offset, 0.4, 15.6 - offset * 0.5);
      scene.add(chair);
    }

    const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 12), new THREE.MeshLambertMaterial({ color: 0x6c4736 }));
    plantPot.position.set(8.4, 0.25, 15.2);
    scene.add(plantPot);
    const plantStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), new THREE.MeshLambertMaterial({ color: COLORS.plant }));
    plantStem.position.set(8.4, 0.95, 15.2);
    scene.add(plantStem);
    const plantLeaves = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), new THREE.MeshLambertMaterial({ color: COLORS.plant }));
    plantLeaves.position.set(8.4, 1.4, 15.2);
    scene.add(plantLeaves);

    willowGroup = buildWillow();
    willowGroup.position.set(11, 0, 14);
    scene.add(willowGroup);
    willowHeart = buildHeartIcon();
    willowHeart.position.set(0, 1.4, 0);
    willowGroup.add(willowHeart);

    doorLight = new THREE.PointLight(0xff77bb, 0.75, 8);
    doorLight.position.set(0, 4.3, 20.5);
    scene.add(doorLight);
  }

  function addRoomLights() {
    hallwayLight = new THREE.PointLight(0x8090ff, 0.45, 16);
    hallwayLight.position.set(0, 4.5, 12);
    scene.add(hallwayLight);

    officeLight = new THREE.PointLight(0xffa060, 1.5, 12);
    officeLight.position.set(-12, 4.3, 15);
    scene.add(officeLight);

    breakLight = new THREE.PointLight(0xffb0c0, 1.2, 12);
    breakLight.position.set(12, 4.3, 15);
    scene.add(breakLight);
  }

  function buildWillow() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: COLORS.willowFur });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 0.5), bodyMat);
    body.position.y = 0.4;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), bodyMat);
    head.position.set(0.9, 0.55, 0);
    group.add(head);

    const earMat = new THREE.MeshLambertMaterial({ color: COLORS.willowEars });
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.4), earMat);
      ear.position.set(0.9, 0.75, side * 0.18);
      group.add(ear);
    }

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.04, 8, 12), new THREE.MeshLambertMaterial({ color: COLORS.willowCollar }));
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0.75, 0.45, 0);
    group.add(collar);

    for (const [lx, lz] of [[-0.6, -0.2], [-0.6, 0.2], [0.6, -0.2], [0.6, 0.2]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), bodyMat);
      leg.position.set(lx, 0.2, lz);
      group.add(leg);
    }

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), bodyMat);
    tail.position.set(-0.85, 0.6, 0);
    tail.rotation.z = Math.PI / 4;
    group.add(tail);

    return group;
  }

  function buildHeartIcon(color = 0xff88c2) {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const left = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), material);
    left.position.set(-0.12, 0, 0);
    const right = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), material);
    right.position.set(0.12, 0, 0);
    const bottom = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.26, 12), material);
    bottom.position.set(0, -0.18, 0);
    bottom.rotation.x = Math.PI;
    group.add(left, right, bottom);
    return group;
  }

  function createTextSign(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "rgba(245,214,255,0.92)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#2a1635";
    ctx.font = "bold 90px 'Arial'";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 40, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.4), mat);
    return plane;
  }

  function setSurgeryLighting(isSurgery) {
    if (ambientLight) ambientLight.intensity = isSurgery ? 0.3 : 0.58;
    if (tableLight) tableLight.intensity = isSurgery ? 1.7 : 0.9;
    if (hallwayLight) hallwayLight.intensity = isSurgery ? 0.12 : 0.45;
    if (officeLight) officeLight.intensity = isSurgery ? 0.2 : 1.5;
    if (breakLight) breakLight.intensity = isSurgery ? 0.2 : 1.2;
  }

  // ============ BUILD ROBOT ============
  function buildRobot() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: COLORS.robotBody });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), bodyMat);
    body.position.y = 0.5;
    group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.45), bodyMat);
    head.position.y = 1.25;
    group.add(head);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: COLORS.robotEye });
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
    leftEye.position.set(-0.12, 1.3, 0.23);
    leftEye.name = "robotLeftEye";
    group.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
    rightEye.position.set(0.12, 1.3, 0.23);
    rightEye.name = "robotRightEye";
    group.add(rightEye);

    // Antenna
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6),
      new THREE.MeshLambertMaterial({ color: COLORS.robotAntenna })
    );
    antenna.position.set(0, 1.65, 0);
    group.add(antenna);

    const antennaBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: COLORS.robotAntenna })
    );
    antennaBall.position.set(0, 1.8, 0);
    group.add(antennaBall);

    // Arms
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), bodyMat);
    leftArm.position.set(-0.6, 0.35, 0);
    leftArm.name = "robotLeftArm";
    group.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), bodyMat);
    rightArm.position.set(0.6, 0.35, 0);
    group.add(rightArm);

    // Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), bodyMat);
    leftLeg.position.set(-0.2, -0.3, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), bodyMat);
    rightLeg.position.set(0.2, -0.3, 0);
    group.add(rightLeg);

    // Lay down for surgery (rotate on side)
    group.rotation.x = -Math.PI / 2;

    return group;
  }

  // ============ BUILD DOCTOR ============
  function buildDoctor() {
    const group = new THREE.Group();

    // Body (white coat)
    const coatMat = new THREE.MeshLambertMaterial({ color: COLORS.doctorCoat });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.4), coatMat);
    body.position.y = 1.05;
    group.add(body);

    // Red cross on coat
    const crossMat = new THREE.MeshBasicMaterial({ color: COLORS.doctorCross });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.01), crossMat);
    crossH.position.set(0, 1.25, 0.21);
    group.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.01), crossMat);
    crossV.position.set(0, 1.25, 0.21);
    group.add(crossV);

    // Head
    const skinMat = new THREE.MeshLambertMaterial({ color: COLORS.doctorSkin });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.35), skinMat);
    head.position.y = 1.85;
    group.add(head);

    // Eyes (small dark)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const le = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), eyeMat);
    le.position.set(-0.1, 1.9, 0.18);
    group.add(le);
    const re = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), eyeMat);
    re.position.set(0.1, 1.9, 0.18);
    group.add(re);

    // Arms
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), coatMat);
    leftArm.position.set(-0.52, 0.85, 0);
    group.add(leftArm);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), coatMat);
    rightArm.position.set(0.52, 0.85, 0);
    group.add(rightArm);

    // Legs
    const legMat = new THREE.MeshLambertMaterial({ color: 0x333344 });
    const ll = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), legMat);
    ll.position.set(-0.15, 0.25, 0);
    group.add(ll);
    const rl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), legMat);
    rl.position.set(0.15, 0.25, 0);
    group.add(rl);

    return group;
  }

  // ============ SURGERY PHASE ============
  function setupSurgery() {
    surgeryCompleted = {};
    glowSpots = [];
    hideJoystick();
    setSurgeryLighting(true);

    // Create glowing clickable spheres on robot
    SURGERY_SPOTS.forEach((spot) => {
      const geo = new THREE.SphereGeometry(0.18, 12, 12);
      const mat = new THREE.MeshBasicMaterial({ color: COLORS.glowSpot, transparent: true, opacity: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);

      // Position relative to robot (which is lying down, rotated -PI/2 on X)
      // The robot group is rotated, so we need world position.
      // Robot is at (0, 0.8, 0) with rotation.x = -PI/2
      // In lying position: robot's local Y becomes world -Z, local Z becomes world Y
      const worldX = spot.offset.x;
      const worldY = 0.8 + spot.offset.z; // local Z → up
      const worldZ = -spot.offset.y + 0.8; // local Y → toward camera, adjusted
      mesh.position.set(worldX, worldY, worldZ);
      mesh.userData = { surgerySpot: spot.name };
      scene.add(mesh);
      glowSpots.push(mesh);
    });

    showUI(`<div class="hospital-hint">Click the glowing spots on Robot-David to repair him</div>
            <div class="hospital-spots-left" id="spotsLeft">Spots: 0 / ${SURGERY_SPOTS.length}</div>`);
  }

  function handleSurgeryClick(spotName) {
    if (surgeryCompleted[spotName]) return;
    surgeryCompleted[spotName] = true;

    const spot = SURGERY_SPOTS.find((s) => s.name === spotName);
    if (!spot) return;

    // Remove glow sphere
    const mesh = glowSpots.find((m) => m.userData.surgerySpot === spotName);
    let burstPosition = null;
    if (mesh) {
      burstPosition = mesh.position.clone();
      scene.remove(mesh);
      glowSpots = glowSpots.filter((m) => m !== mesh);
    }

    // Animate based on spot
    if (spotName === "heart") {
      // Pulse the robot body red briefly
      const bodyMesh = robotGroup.children[0];
      const origColor = bodyMesh.material.color.getHex();
      bodyMesh.material.color.setHex(0xff4466);
      setTimeout(() => bodyMesh.material.color.setHex(origColor), 1500);
      if (burstPosition) {
        spawnHeartBurst(burstPosition, 0xff6688);
      }
    } else if (spotName === "brain") {
      // Sparkle the antenna
      const ball = robotGroup.children.find((c) => c.geometry && c.geometry.type === "SphereGeometry");
      if (ball) {
        ball.material.color.setHex(0xffff00);
        setTimeout(() => ball.material.color.setHex(COLORS.robotAntenna), 1500);
      }
      if (monitorScreen) {
        monitorScreen.userData = monitorScreen.userData || {};
        monitorScreen.userData.flashUntil = Date.now() + 1200;
      }
    } else if (spotName === "arm") {
      // Raise left arm
      const arm = robotGroup.children.find((c) => c.name === "robotLeftArm");
      if (arm) {
        arm.rotation.z = -0.8;
        setTimeout(() => { arm.rotation.z = 0; }, 2000);
      }
    } else if (spotName === "eyes") {
      // Light up eyes
      const eyes = robotGroup.children.filter((c) => c.name && c.name.includes("Eye"));
      eyes.forEach((eye) => {
        eye.material.color.setHex(0xffffff);
        setTimeout(() => eye.material.color.setHex(COLORS.robotEye), 2000);
      });
    }

    // Show message
    showMessage(spot.message);

    // Update counter
    const done = Object.keys(surgeryCompleted).length;
    const counter = document.getElementById("spotsLeft");
    if (counter) counter.textContent = `Spots: ${done} / ${SURGERY_SPOTS.length}`;

    // Check if all done
    if (done >= SURGERY_SPOTS.length) {
      setTimeout(completeSurgery, 3000);
    }
  }

  function completeSurgery() {
    // Robot sits up
    const startRot = robotGroup.rotation.x;
    const targetRot = 0;
    const duration = 800;
    const startTime = Date.now();

    function animateSitUp() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t * (2 - t); // ease out
      robotGroup.rotation.x = startRot + (targetRot - startRot) * eased;
      robotGroup.position.y = 0.8 - 0.8 * eased; // come down to floor
      if (t < 1) requestAnimationFrame(animateSitUp);
    }
    animateSitUp();

    showUI(`<div class="hospital-complete">
      <div class="hospital-complete__text">System fully operational.<br>Primary directive: love Logan. Secondary directive: get a dachshund.</div>
      <button class="hospital-explore-btn" id="exploreBtn">Let's explore</button>
    </div>`);

    setTimeout(() => {
      const btn = document.getElementById("exploreBtn");
      if (btn) btn.addEventListener("click", startRoaming);
    }, 100);
  }

  // ============ ROAMING PHASE ============
  function startRoaming() {
    phase = "roaming";
    roamCompleted = {};
    pairPosition = { x: 0, z: 2 };
    doorPromptActive = false;
     doorHeartsShown = false;
     setSurgeryLighting(false);

    // Reposition characters for walking
    robotGroup.rotation.x = 0;
    robotGroup.position.set(pairPosition.x, 0, pairPosition.z);
    doctorGroup.position.set(pairPosition.x + 0.8, 0, pairPosition.z + 0.2);

    // Camera intro pan
    cameraIntro = {
      start: Date.now(),
      duration: 3200,
      from: new THREE.Vector3(0, 15, 20),
      to: new THREE.Vector3(pairPosition.x, 9, pairPosition.z + 10),
    };
    camera.position.copy(cameraIntro.from);
    camera.lookAt(pairPosition.x, 0, pairPosition.z);

    // Build roam markers
    roamMarkers = [];
    roamMarkerMap = {};
    ROAM_SPOTS.forEach((spot) => {
      const group = new THREE.Group();

      // Base marker
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12),
        new THREE.MeshBasicMaterial({ color: COLORS.glowSpot, transparent: true, opacity: 0.5 })
      );
      group.add(base);

      // Floating indicator
      const indicator = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshLambertMaterial({ color: getSpotColor(spot.name) })
      );
      indicator.position.y = 0.8;
      indicator.name = "indicator";
      group.add(indicator);

      if (spot.dynamic === "willow" && willowGroup) {
        group.position.set(willowGroup.position.x, 0.05, willowGroup.position.z);
      } else {
        group.position.set(spot.position.x, 0.05, spot.position.z);
      }
      group.userData = { roamSpot: spot.name, dynamic: spot.dynamic || null };
      scene.add(group);
      roamMarkers.push(group);
      roamMarkerMap[spot.name] = group;
    });

    showRoamingHint();

    if (isTouchDevice()) {
      showJoystick();
    } else {
      hideJoystick();
    }
  }

  function getSpotColor(name) {
    switch (name) {
      case "vending": return 0x33aa66;
      case "window": return 0x4488cc;
      case "desk": return 0xcc8844;
      case "willow": return 0xff88bb;
      case "photoWall": return 0xff99aa;
      case "coffee": return 0xffc47e;
      case "door": return 0x66cc44;
      default: return 0xffffff;
    }
  }

  function attemptMove(dx, dz) {
    const candidate = { x: pairPosition.x + dx, z: pairPosition.z + dz };
    if (isWalkable(candidate.x, candidate.z)) {
      pairPosition = candidate;
      return true;
    }

    let moved = false;
    if (dx) {
      const tryX = pairPosition.x + dx;
      if (isWalkable(tryX, pairPosition.z)) {
        pairPosition.x = tryX;
        moved = true;
      }
    }
    if (dz) {
      const tryZ = pairPosition.z + dz;
      if (isWalkable(pairPosition.x, tryZ)) {
        pairPosition.z = tryZ;
        moved = true;
      }
    }
    return moved;
  }

  function isWalkable(x, z) {
    return WALKABLE_AREAS.some((area) => (
      x >= area.minX &&
      x <= area.maxX &&
      z >= area.minZ &&
      z <= area.maxZ
    ));
  }

  function updateRoaming() {
    if (phase !== "roaming") return;

    const speed = 0.08;
    let inputX = 0;
    let inputZ = 0;
    if (keysDown["w"] || keysDown["arrowup"]) inputZ -= 1;
    if (keysDown["s"] || keysDown["arrowdown"]) inputZ += 1;
    if (keysDown["a"] || keysDown["arrowleft"]) inputX -= 1;
    if (keysDown["d"] || keysDown["arrowright"]) inputX += 1;

    if (joystickVector.x || joystickVector.z) {
      inputX += joystickVector.x;
      inputZ += joystickVector.z;
    }

    if (inputX || inputZ) {
      const mag = Math.hypot(inputX, inputZ) || 1;
      const dx = (inputX / mag) * speed;
      const dz = (inputZ / mag) * speed;
      attemptMove(dx, dz);
    }

    robotGroup.position.set(pairPosition.x, 0, pairPosition.z);
    doctorGroup.position.set(pairPosition.x + 0.8, 0, pairPosition.z);

    if (inputX || inputZ) {
      const angle = Math.atan2(inputX, inputZ);
      robotGroup.rotation.y = angle;
      doctorGroup.rotation.y = angle;
      const time = Date.now() * 0.01;
      robotGroup.position.y = Math.abs(Math.sin(time)) * 0.1;
      doctorGroup.position.y = Math.abs(Math.sin(time + 1)) * 0.1;
    } else {
      robotGroup.position.y = 0;
      doctorGroup.position.y = 0;
    }

    updateCameraFollow();

    // Check proximity to roam spots
    roamMarkers.forEach((marker) => {
      if (marker.userData.dynamic === "willow" && willowGroup) {
        marker.position.x = willowGroup.position.x;
        marker.position.z = willowGroup.position.z;
      }
      const dist = Math.sqrt(
        Math.pow(pairPosition.x - marker.position.x, 2) +
        Math.pow(pairPosition.z - marker.position.z, 2)
      );
      // Rotate indicator
      const ind = marker.children.find((c) => c.name === "indicator");
      if (ind) ind.rotation.y += 0.02;

      if (dist < 1.5 && !roamCompleted[marker.userData.roamSpot]) {
        handleRoamInteraction(marker.userData.roamSpot);
      }

      if (
        marker.userData.roamSpot === "door" &&
        dist < 2.3 &&
        !doorHeartsShown
      ) {
        spawnHeartBurst(getSpotPosition("door"));
        doorHeartsShown = true;
      }

      if (
        marker.userData.roamSpot === "door" &&
        dist > 2 &&
        !roamCompleted.door &&
        doorPromptActive
      ) {
        doorPromptActive = false;
        showRoamingHint();
      }
    });
  }

  function updateCameraFollow() {
    if (!camera) return;
    if (cameraIntro) {
      const elapsed = Date.now() - cameraIntro.start;
      const t = Math.min(elapsed / cameraIntro.duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      if (cameraIntro.to) {
        cameraIntro.to.set(pairPosition.x, 9, pairPosition.z + 10);
      }
      const target = cameraIntro.to;
      camera.position.x = cameraIntro.from.x + (target.x - cameraIntro.from.x) * eased;
      camera.position.y = cameraIntro.from.y + (target.y - cameraIntro.from.y) * eased;
      camera.position.z = cameraIntro.from.z + (target.z - cameraIntro.from.z) * eased;
      camera.lookAt(pairPosition.x, 0, pairPosition.z);
      if (t >= 1) {
        cameraIntro = null;
      }
      return;
    }

    const camTargetX = pairPosition.x;
    const camTargetZ = pairPosition.z + 9.5;
    const camTargetY = 8.5;
    camera.position.x += (camTargetX - camera.position.x) * 0.12;
    camera.position.y += (camTargetY - camera.position.y) * 0.08;
    camera.position.z += (camTargetZ - camera.position.z) * 0.12;
    camera.lookAt(pairPosition.x, 0, pairPosition.z);
  }

  function handleRoamInteraction(spotName) {
    if (spotName === "door") {
      if (roamCompleted[spotName] || doorPromptActive) return;
      promptDoorExit();
      return;
    }

    if (roamCompleted[spotName]) return;
    roamCompleted[spotName] = true;

    const spot = ROAM_SPOTS.find((s) => s.name === spotName);
    if (!spot) return;

    // Remove marker
    const marker = roamMarkerMap[spotName];
    if (marker) {
      scene.remove(marker);
      roamMarkers = roamMarkers.filter((m) => m !== marker);
      delete roamMarkerMap[spotName];
    }

    showMessage(spot.message);
    spawnHeartBurst(getSpotPosition(spotName));
  }

  function getSpotPosition(name) {
    const spot = ROAM_SPOTS.find((s) => s.name === name);
    if (!spot) return new THREE.Vector3(pairPosition.x, 0.2, pairPosition.z);
    if (spot.dynamic === "willow" && willowGroup) {
      return new THREE.Vector3(willowGroup.position.x, 0.2, willowGroup.position.z);
    }
    return new THREE.Vector3(spot.position.x, 0.2, spot.position.z);
  }

  function spawnHeartBurst(position, color = 0xff88c2) {
    if (!scene || !position) return;
    const base = position.clone ? position.clone() : new THREE.Vector3(position.x || 0, position.y || 0, position.z || 0);
    const count = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
      mesh.position.copy(base);
      scene.add(mesh);
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        0.8 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.6
      );
      const life = 1.8 + Math.random() * 0.5;
      heartParticles.push({ mesh, velocity, life, maxLife: life });
    }
  }

  function updateHeartParticles(delta) {
    for (let i = heartParticles.length - 1; i >= 0; i--) {
      const particle = heartParticles[i];
      particle.life -= delta;
      if (particle.life <= 0 || !particle.mesh) {
        if (particle.mesh) scene.remove(particle.mesh);
        heartParticles.splice(i, 1);
        continue;
      }
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.material.opacity = Math.max(particle.life / particle.maxLife, 0);
      const scale = 0.6 + (1 - particle.life / particle.maxLife) * 0.5;
      particle.mesh.scale.set(scale, scale, scale);
    }
  }

  function updateWillow(delta) {
    if (!willowGroup) return;
    willowGroup.position.x += willowDirection * delta * 0.9;
    if (willowGroup.position.x > willowBounds.maxX) {
      willowDirection = -1;
    } else if (willowGroup.position.x < willowBounds.minX) {
      willowDirection = 1;
    }
    willowGroup.rotation.y = willowDirection > 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  function updateAmbientAnimations(delta) {
    const now = Date.now();
    if (monitorScreen && monitorScreen.material) {
      if (monitorScreen.userData && monitorScreen.userData.flashUntil && monitorScreen.userData.flashUntil > now) {
        monitorScreen.material.opacity = 1;
      } else {
        const blinkPhase = (now % 3000) / 3000;
        monitorScreen.material.opacity = blinkPhase > 0.8 ? 0.95 : 0.25;
      }
    }
    xrayPlates.forEach((plate, idx) => {
      if (plate) plate.rotation.z = Math.sin(now * 0.0015 + idx) * 0.08;
    });
    if (ceilingFan) {
      ceilingFan.rotation.y += delta * 2.5;
    }
    if (willowHeart) {
      willowHeart.position.y = 1.4 + Math.sin(now * 0.004) * 0.15;
    }
    if (doorLight) {
      doorLight.intensity = 0.65 + Math.sin(now * 0.003) * 0.15;
    }
  }

  // ============ CLICK HANDLING ============
  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    handleRaycast();
  }

  function onTouch(event) {
    if (!event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    handleRaycast();

    // Touch-to-move for roaming: move toward tap direction
    if (phase === "roaming") {
      const stepSize = 1.5;
      attemptMove(mouse.x * stepSize, -mouse.y * stepSize);
    }
  }

  function handleRaycast() {
    raycaster.setFromCamera(mouse, camera);

    if (phase === "surgery") {
      const intersects = raycaster.intersectObjects(glowSpots);
      if (intersects.length > 0) {
        const name = intersects[0].object.userData.surgerySpot;
        if (name) handleSurgeryClick(name);
      }
    }
  }

  // ============ UI HELPERS ============
  function showUI(html) {
    ui.innerHTML = html;
  }

  function showMessage(text) {
    if (msgTimeout) clearTimeout(msgTimeout);
    // Remove existing message
    const existing = ui.querySelector(".hospital-msg");
    if (existing) existing.remove();

    const div = document.createElement("div");
    div.className = "hospital-msg";
    div.textContent = text;
    ui.appendChild(div);

    msgTimeout = setTimeout(() => div.remove(), 4000);
  }

  function showRoamingHint() {
    const moveText = isTouchDevice()
      ? "Drag the joystick to move."
      : "Use WASD or Arrow keys to move.";
    showUI(`<div class="hospital-hint">
      <div>${moveText} Explore the OR, hallway, office, and break room glowing markers.</div>
      <div class="hospital-hint__exit">🚪 The EXIT door at the far hallway sends you back when you're ready.</div>
    </div>`);
  }

  // ============ ANIMATION LOOP ============
  function animate() {
    animationId = requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;
    const now = Date.now();
    const delta = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // Pulsate glow spots
    glowSpots.forEach((spot) => {
      const t = Date.now() * 0.003;
      spot.material.opacity = 0.4 + Math.sin(t) * 0.3;
      spot.scale.setScalar(1 + Math.sin(t) * 0.15);
    });

    updateWillow(delta);
    updateAmbientAnimations(delta);
    updateHeartParticles(delta);
    updateRoaming();
    renderer.render(scene, camera);
  }

  // ============ CLEANUP ============
  function cleanup() {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
    keysDown = {};
    while (heartParticles.length) {
      const particle = heartParticles.pop();
      if (particle && particle.mesh && scene) {
        scene.remove(particle.mesh);
      }
    }
    if (renderer) renderer.dispose();
    scene = null;
    camera = null;
    renderer = null;
    ui.innerHTML = "";
    hideJoystick();
  }

  // ============ JOYSTICK ============
  function setupJoystick() {
    if (joystick || !overlay) return;
    joystick = document.createElement("div");
    joystick.className = "hospital-joystick hidden";
    joystickThumb = document.createElement("div");
    joystickThumb.className = "hospital-joystick__thumb";
    joystick.appendChild(joystickThumb);
    overlay.appendChild(joystick);

    joystick.addEventListener("touchstart", handleJoystickStart, { passive: false });
    joystick.addEventListener("touchmove", handleJoystickMove, { passive: false });
    joystick.addEventListener("touchend", handleJoystickEnd);
    joystick.addEventListener("touchcancel", handleJoystickEnd);
  }

  function handleJoystickStart(event) {
    if (!isTouchDevice()) return;
    event.preventDefault();
    const touch = event.changedTouches[0];
    joystickTouchId = touch.identifier;
    updateJoystickVector(touch);
  }

  function handleJoystickMove(event) {
    const touch = Array.from(event.changedTouches).find((t) => t.identifier === joystickTouchId);
    if (!touch) return;
    event.preventDefault();
    updateJoystickVector(touch);
  }

  function handleJoystickEnd(event) {
    const ended = Array.from(event.changedTouches).some((t) => t.identifier === joystickTouchId);
    if (!ended) return;
    resetJoystick();
  }

  function updateJoystickVector(touch) {
    if (!joystick) return;
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const maxDistance = rect.width / 2;
    const distance = Math.min(Math.hypot(dx, dy), maxDistance);
    const angle = Math.atan2(dy, dx);
    const limitedX = Math.cos(angle) * distance;
    const limitedY = Math.sin(angle) * distance;
    joystickVector.x = limitedX / maxDistance;
    joystickVector.z = limitedY / maxDistance;
    if (joystickThumb) {
      joystickThumb.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
    }
  }

  function resetJoystick() {
    joystickTouchId = null;
    joystickVector = { x: 0, z: 0 };
    if (joystickThumb) joystickThumb.style.transform = "translate(0, 0)";
  }

  function showJoystick() {
    if (!joystick) setupJoystick();
    if (!joystick) return;
    joystick.classList.remove("hidden");
    resetJoystick();
  }

  function hideJoystick() {
    if (!joystick) return;
    joystick.classList.add("hidden");
    resetJoystick();
  }

  function isTouchDevice() {
    return (
      ("ontouchstart" in window) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
    );
  }

  function promptDoorExit() {
    doorPromptActive = true;
    showUI(`<div class="hospital-exit-confirm">
      <div class="hospital-exit-confirm__title">Exit Door</div>
      <p>The glowing door pours hearts into the hallway and returns you to the love letter finale.</p>
      <div class="hospital-exit-confirm__actions">
        <button class="hospital-exit-confirm__btn" id="doorStayBtn">Keep exploring</button>
        <button class="hospital-exit-confirm__btn hospital-exit-confirm__btn--accent" id="doorExitBtn">Leave hospital</button>
      </div>
    </div>`);

    setTimeout(() => {
      const stayBtn = document.getElementById("doorStayBtn");
      const exitBtn = document.getElementById("doorExitBtn");
      if (stayBtn) stayBtn.addEventListener("click", () => {
        showRoamingHint();
      });
      if (exitBtn) exitBtn.addEventListener("click", confirmDoorExit);
    }, 50);
  }

  function confirmDoorExit() {
    doorPromptActive = false;
    roamCompleted.door = true;
    const marker = roamMarkers.find((m) => m.userData.roamSpot === "door");
    if (marker) {
      scene.remove(marker);
      roamMarkers = roamMarkers.filter((m) => m !== marker);
      delete roamMarkerMap["door"];
    }

    showUI(`<div class="hospital-exit-screen">
      <div class="hospital-exit-screen__text">Happy Valentine's Day, Logan.</div>
      <p>I'll follow you anywhere — hospital wings, Swiss mountains, forever.</p>
    </div>`);
    spawnHeartBurst(getSpotPosition("door"));
    setTimeout(() => {
      cleanup();
      if (typeof window.returnFromHospital === "function") {
        window.returnFromHospital();
      }
    }, 4000);
  }
})();
