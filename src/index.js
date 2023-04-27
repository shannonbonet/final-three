// ThreeJS and Third-party deps
import * as THREE from 'three';
import * as dat from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';

import toonVertexShader from './toon.vert';
import toonFragmentShader from './toon.frag';

// Core boilerplate code deps
import {
  createCamera,
  createComposer,
  createRenderer,
  runApp,
} from './core-utils';

// Other deps
import Tile from './assets/checker_tile.png';
import { DirectionalLightHelper } from 'three';

global.THREE = THREE;
// previously this feature is .legacyMode = false, see https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
// turning this on has the benefit of doing certain automatic conversions (for hexadecimal and CSS colors from sRGB to linear-sRGB)
THREE.ColorManagement.enabled = true;

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  speed: 1,
  lightOneSwitch: true,
  lightTwoSwitch: true,
  lightThreeSwitch: true,

  lineWeight : 1.02,
  pGlossy : 5.0,
  pRimAmount : 0.8,
  pRimThresh : 0.5,
  // Bokeh pass properties
  focus: 0.0,
  aperture: 0,
  maxblur: 0.0,
};

/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene();

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  // best practice: ensure output colorspace is in sRGB, see Color Management documentation:
  // https://threejs.org/docs/#manual/en/introduction/Color-management
  _renderer.outputEncoding = THREE.sRGBEncoding;

  // _renderer.lineWeight = params.lineWeight;

  // const gui = new dat.GUI();

  // gui.add(params, 'lineWeight',0,2).name('Line Weight').onChange(() => {
  //  _renderer.lineWeight = params.lineWeight;
  // });

});

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(45, 1, 1000, { x: 0, y: 5, z: 15 });

// The RenderPass is already created in 'createComposer'
let composer = createComposer(renderer, scene, camera, (comp) => {
  // comp.addPass(bokehPass);
});

/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;

    // Scene setup taken from https://threejs.org/examples/#webgl_lights_rectarealight
    // Create rect area lights
    RectAreaLightUniformsLib.init();



    // Create directional light
    let dirLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight1.position.set(5, 5, 5);
    dirLight1.lookAt(0, 5, 0);
    scene.add(dirLight1);

    scene.add(new DirectionalLightHelper(dirLight1));

    // Create the floor
    const geoFloor = new THREE.BoxGeometry(200, 0.1, 200);
    const matStdFloor = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.5,
      metalness: 0,
    });
    const mshStdFloor = new THREE.Mesh(geoFloor, matStdFloor);
    // need await to make sure animation starts only after texture is loaded
    // this works because the animation code is 'then-chained' after initScene(), see core-utils.runApp
    await this.loadTexture(mshStdFloor);
    scene.add(mshStdFloor);

    scene.add(new THREE.AmbientLight(0x888888));

    // the sphere stuff!
    // i discovered a "meshtoonmaterial" that should be built in and looks really good
    // but i can't seem to implement it LOL
    // and i also can't seem to find anything interesting in its source code
    // see here for the articles and source codes respectively
    // https://threejs.org/docs/#api/en/materials/MeshToonMaterial
    // https://threejs.org/examples/#webgl_materials_variations_toon
    // https://github.com/mrdoob/three.js/blob/master/src/materials/MeshToonMaterial.js
    // https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_variations_toon.html

    var glossiness = params.pGlossy;
    var rimAmount = params.pRimAmount;
    var rimThresh = params.pRimThresh;

    var geo = new THREE.SphereGeometry(2, 24, 24);
    var material = new THREE.ShaderMaterial({
      lights: true,
      flatShading: true,
      uniforms: {
        ...THREE.UniformsLib.lights,
        uColor: { value: new THREE.Color('#6495ED') },
        glossiness: {value: glossiness},
        rimAmount: {value: rimAmount},
        rimThresh: {value: rimThresh},

      },
      // adding the custom shader stuff connected to toon.vert and toon.frag
      vertexShader: toonVertexShader,
      fragmentShader: toonFragmentShader,
    });

    //let outlineWeight = params.lineWeight;
    let scalar = params.lineWeight;

    var sphere = new THREE.Mesh(geo, material);
    //var sphere = new THREE.Mesh(geo, THREE.MeshBasicMaterial({color:0xffffff}));
    sphere.position.set(0,(sphere.geometry.parameters.radius* scalar ),0);
    //sphere.position.y.set(sphere.geometry.parameters.radius *outlineWeight);
    scene.add(sphere);
    //sphere.position.set(0,phere.geometry.parameters.radius,0);

    //Trying to add outline
    var outlinematerial1 = new THREE.MeshBasicMaterial({color:0x000000, side: THREE.BackSide});
    let outlineMesh = new THREE.Mesh(geo, outlinematerial1);
    //outlineMesh.position = sphere.position;
    outlineMesh.position.set(0,sphere.geometry.parameters.radius * scalar,0);
    //outlineMesh.position.set(sphere.position);
    outlineMesh.scale.multiplyScalar(scalar);
    scene.add(outlineMesh);
    //scene.add(new RectAreaLightHelper(outlineMesh));

    // GUI controls
    const gui = new dat.GUI();
    gui
      .add(params, 'lineWeight', 1, 2, 0.01)
      .name("Border")
      .onChange((val) => {
        let ratio = val / scalar;

        sphere.position.set(0,(sphere.geometry.parameters.radius* val),0);
        outlineMesh.position.set(0,sphere.geometry.parameters.radius * val,0);
        outlineMesh.scale.multiplyScalar(ratio)

        scalar = val;
      });
    gui
      .add(params,'pGlossy',0,20,1)
      .name("Glossiness")
      .onChange((val) => {
        glossiness = val;
        material.uniforms.glossiness.value = glossiness;
      });
      gui
      .add(params,'pRimAmount',0.7,1,0.05)
      .name("rim amount")
      .onChange((val) => {
        rimAmount = val;
        material.uniforms.rimAmount.value = rimAmount;
      });


    // Stats - show fps
    this.stats1 = new Stats();
    this.stats1.showPanel(0); // Panel 0 = fps
    this.stats1.domElement.style.cssText =
      'position:absolute;top:0px;left:0px;';
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement);
  },
  // load a texture for the floor
  // returns a promise so the caller can await on this function
  loadTexture(mshStdFloor) {
    return new Promise((resolve, reject) => {
      var loader = new THREE.TextureLoader();
      loader.load(
        Tile,
        function (texture) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(40, 40);
          mshStdFloor.material.map = texture;
          resolve();
        },
        undefined,
        function (error) {
          console.log(error);
          reject(error);
        }
      );
    });
  },
};

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/


runApp(app, scene, renderer, camera, true, undefined, composer);
