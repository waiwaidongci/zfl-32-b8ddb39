const ThreeScene = (function() {
  let scene, camera, renderer, controls;
  let partsGroup = null;
  let groundPlane = null;
  let animationId = null;
  let container = null;
  let raycaster, mouse;
  let onPartClick = null;
  let _isInitialized = false;

  function init(canvasEl, containerEl) {
    if (_isInitialized) return;
    container = containerEl;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8dcbf);
    scene.fog = new THREE.Fog(0xe8dcbf, 400, 1200);

    const rect = containerEl.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 5000);
    camera.position.set(280, 260, 340);
    camera.lookAt(0, 60, 0);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 60, 0);
    controls.minDistance = 100;
    controls.maxDistance = 1200;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.update();

    setupLights();
    setupGround();
    setupAxis();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    renderer.domElement.addEventListener("click", handleClick);
    window.addEventListener("resize", handleResize);

    _isInitialized = true;
    animate();
  }

  function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xfff4e0, 0xd0c0a0, 0.35);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(260, 400, 180);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = -500;
    dirLight.shadow.camera.right = 500;
    dirLight.shadow.camera.top = 500;
    dirLight.shadow.camera.bottom = -500;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffe8c0, 0.25);
    fillLight.position.set(-200, 200, -150);
    scene.add(fillLight);
  }

  function setupGround() {
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xd4c4a5, roughness: 0.95, metalness: 0
    });
    groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.5;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    const gridHelper = new THREE.GridHelper(800, 40, 0xa89070, 0xc8b89a);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
  }

  function setupAxis() {
    const baseGeo = new THREE.CylinderGeometry(12, 18, 6, 24);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x8d3d2d, roughness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, -3, 0);
    base.receiveShadow = true;
    scene.add(base);
  }

  function handleClick(event) {
    if (!partsGroup || !onPartClick) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const meshes = [];
    partsGroup.traverse(function(child) {
      if (child.isMesh) meshes.push(child);
    });

    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && obj !== partsGroup) {
        if (obj.userData && obj.userData.partId) {
          onPartClick(obj.userData.partId, event.shiftKey);
          return;
        }
        obj = obj.parent;
      }
    }
  }

  function handleResize() {
    if (!container || !renderer || !camera) return;
    const rect = container.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function setParts(group) {
    if (partsGroup) {
      scene.remove(partsGroup);
      partsGroup.traverse(function(child) {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
        }
      });
    }
    partsGroup = group;
    if (partsGroup) {
      scene.add(partsGroup);
    }
  }

  function getPartsGroup() {
    return partsGroup;
  }

  function findPartGroup(partId) {
    if (!partsGroup) return null;
    let found = null;
    partsGroup.children.forEach(function(g) {
      if (g.userData && g.userData.partId === partId) found = g;
    });
    return found;
  }

  function setOnPartClick(cb) {
    onPartClick = cb;
  }

  function resetCamera() {
    if (!camera || !controls) return;
    camera.position.set(280, 260, 340);
    controls.target.set(0, 60, 0);
    controls.update();
  }

  function dispose() {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) {
      renderer.dispose();
      renderer.domElement.removeEventListener("click", handleClick);
    }
    window.removeEventListener("resize", handleResize);
    _isInitialized = false;
  }

  function isInitialized() {
    return _isInitialized;
  }

  return {
    init: init,
    setParts: setParts,
    getPartsGroup: getPartsGroup,
    findPartGroup: findPartGroup,
    setOnPartClick: setOnPartClick,
    resetCamera: resetCamera,
    handleResize: handleResize,
    dispose: dispose,
    isInitialized: isInitialized
  };
})();

if (typeof module !== "undefined") module.exports = { ThreeScene };
