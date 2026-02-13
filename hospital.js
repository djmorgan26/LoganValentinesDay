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
    floor: 0x2a2a3a,
    wall: 0x1e1e2e,
    table: 0x444466,
    robotBody: 0x8899aa,
    robotEye: 0x44aaff,
    robotAntenna: 0xff6644,
    doctorCoat: 0xeeeeee,
    doctorSkin: 0xe8b89d,
    doctorCross: 0xff3333,
    lightGlow: 0xffffcc,
    glowSpot: 0x00ffaa,
    vendingMachine: 0x336655,
    window: 0x445566,
    desk: 0x665544,
    door: 0x445533,
  };

  const SURGERY_SPOTS = [
    { name: "heart", label: "Heart (chest)", offset: { x: 0, y: 1.2, z: 0.35 }, message: "Love module installed. Warning: capacity infinite. Side effect: wanting to be near Logan always." },
    { name: "brain", label: "Brain (head)", offset: { x: 0, y: 2.1, z: 0.3 }, message: "Uploading: 3 years of memories. Switzerland. Barcelona. Every spicy tuna roll. Storage: full." },
    { name: "arm", label: "Arm (left)", offset: { x: -0.7, y: 1.0, z: 0.3 }, message: "Hug pressure calibrated to: never letting go. Skin contact analysis: flawless. Dr. Logan approved." },
    { name: "eyes", label: "Eyes (face)", offset: { x: 0, y: 1.9, z: 0.5 }, message: "Visual target locked: only you. Dermatology scan complete — you're glowing. Literally." },
  ];

  const ROAM_SPOTS = [
    { name: "vending", position: { x: -5, z: -4 }, message: "It dispensed a spicy tuna roll. Of course it did. Everything reminds me of you.", icon: "Vending Machine" },
    { name: "window", position: { x: 5, z: -4 }, message: "Remember paragliding in Switzerland? Every adventure is better with you next to me.", icon: "Window" },
    { name: "desk", position: { x: -4, z: 3 }, message: "Patient chart reads: 'Prognosis — happily ever after. Attending physician: Dr. Logan.'", icon: "Nurse's Station" },
    { name: "door", position: { x: 0, z: 6 }, message: "Happy Valentine's Day, Logan.", icon: "Exit" },
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
  let animationId = null;
  let msgTimeout = null;

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
    const ambient = new THREE.AmbientLight(0x444455, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const tableLight = new THREE.PointLight(COLORS.lightGlow, 1.2, 10);
    tableLight.position.set(0, 4, 0);
    scene.add(tableLight);

    // Room
    buildRoom();

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
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ============ BUILD ROOM ============
  function buildRoom() {
    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshLambertMaterial({ color: COLORS.floor })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    const wallMat = new THREE.MeshLambertMaterial({ color: COLORS.wall });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 0.2), wallMat);
    backWall.position.set(0, 2.5, -7);
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 16), wallMat);
    leftWall.position.set(-8, 2.5, 0);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 16), wallMat);
    rightWall.position.set(8, 2.5, 0);
    scene.add(rightWall);

    // Operating table
    const tableMat = new THREE.MeshLambertMaterial({ color: COLORS.table });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 1.2), tableMat);
    tableTop.position.set(0, 0.75, 0);
    tableTop.castShadow = true;
    scene.add(tableTop);

    // Table legs
    for (const [lx, lz] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), tableMat);
      leg.position.set(lx, 0.375, lz);
      scene.add(leg);
    }

    // Overhead light fixture
    const fixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 0.15, 8),
      new THREE.MeshLambertMaterial({ color: 0xcccccc })
    );
    fixture.position.set(0, 4.5, 0);
    scene.add(fixture);

    // Monitor
    const monitor = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.5, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x222244 })
    );
    monitor.position.set(-1.8, 1.5, -0.5);
    scene.add(monitor);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x33ff66 })
    );
    screen.position.set(-1.8, 1.5, -0.44);
    scene.add(screen);
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
    if (mesh) {
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
    } else if (spotName === "brain") {
      // Sparkle the antenna
      const ball = robotGroup.children.find((c) => c.geometry && c.geometry.type === "SphereGeometry");
      if (ball) {
        ball.material.color.setHex(0xffff00);
        setTimeout(() => ball.material.color.setHex(COLORS.robotAntenna), 1500);
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

    // Reposition characters for walking
    robotGroup.rotation.x = 0;
    robotGroup.position.set(0, 0, 2);
    doctorGroup.position.set(0.8, 0, 2);

    // Camera higher, following
    camera.position.set(0, 10, 12);
    camera.lookAt(0, 0, 2);

    // Build roam markers
    roamMarkers = [];
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

      group.position.set(spot.position.x, 0.05, spot.position.z);
      group.userData = { roamSpot: spot.name };
      scene.add(group);
      roamMarkers.push(group);
    });

    showUI(`<div class="hospital-hint">WASD or Arrow keys to move. Walk to glowing spots to interact.</div>`);
  }

  function getSpotColor(name) {
    switch (name) {
      case "vending": return 0x33aa66;
      case "window": return 0x4488cc;
      case "desk": return 0xcc8844;
      case "door": return 0x66cc44;
      default: return 0xffffff;
    }
  }

  function updateRoaming() {
    if (phase !== "roaming") return;

    const speed = 0.08;
    let dx = 0, dz = 0;
    if (keysDown["w"] || keysDown["arrowup"]) dz = -speed;
    if (keysDown["s"] || keysDown["arrowdown"]) dz = speed;
    if (keysDown["a"] || keysDown["arrowleft"]) dx = -speed;
    if (keysDown["d"] || keysDown["arrowright"]) dx = speed;

    if (dx || dz) {
      pairPosition.x = Math.max(-7, Math.min(7, pairPosition.x + dx));
      pairPosition.z = Math.max(-6, Math.min(7, pairPosition.z + dz));

      robotGroup.position.set(pairPosition.x, 0, pairPosition.z);
      doctorGroup.position.set(pairPosition.x + 0.8, 0, pairPosition.z);

      // Face movement direction
      const angle = Math.atan2(dx, dz);
      robotGroup.rotation.y = angle;
      doctorGroup.rotation.y = angle;

      // Simple walking animation (bob)
      const time = Date.now() * 0.01;
      robotGroup.position.y = Math.abs(Math.sin(time)) * 0.1;
      doctorGroup.position.y = Math.abs(Math.sin(time + 1)) * 0.1;
    }

    // Camera follows tightly — fixed offset above and behind
    const camTargetX = pairPosition.x;
    const camTargetZ = pairPosition.z + 8;
    camera.position.x += (camTargetX - camera.position.x) * 0.12;
    camera.position.z += (camTargetZ - camera.position.z) * 0.12;
    camera.lookAt(pairPosition.x, 0, pairPosition.z);

    // Check proximity to roam spots
    roamMarkers.forEach((marker) => {
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
    });
  }

  function handleRoamInteraction(spotName) {
    if (roamCompleted[spotName]) return;
    roamCompleted[spotName] = true;

    const spot = ROAM_SPOTS.find((s) => s.name === spotName);
    if (!spot) return;

    // Remove marker
    const marker = roamMarkers.find((m) => m.userData.roamSpot === spotName);
    if (marker) {
      scene.remove(marker);
      roamMarkers = roamMarkers.filter((m) => m !== marker);
    }

    if (spotName === "door") {
      // Exit sequence
      showUI(`<div class="hospital-exit-screen">
        <div class="hospital-exit-screen__text">Happy Valentine's Day, Logan.</div>
      </div>`);
      setTimeout(() => {
        cleanup();
        if (typeof window.returnFromHospital === "function") {
          window.returnFromHospital();
        }
      }, 4000);
      return;
    }

    showMessage(spot.message);
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
      pairPosition.x = Math.max(-7, Math.min(7, pairPosition.x + mouse.x * stepSize));
      pairPosition.z = Math.max(-6, Math.min(7, pairPosition.z - mouse.y * stepSize));
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

  // ============ ANIMATION LOOP ============
  function animate() {
    animationId = requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;

    // Pulsate glow spots
    glowSpots.forEach((spot) => {
      const t = Date.now() * 0.003;
      spot.material.opacity = 0.4 + Math.sin(t) * 0.3;
      spot.scale.setScalar(1 + Math.sin(t) * 0.15);
    });

    updateRoaming();
    renderer.render(scene, camera);
  }

  // ============ CLEANUP ============
  function cleanup() {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
    keysDown = {};
    if (renderer) renderer.dispose();
    scene = null;
    camera = null;
    renderer = null;
    ui.innerHTML = "";
  }
})();
