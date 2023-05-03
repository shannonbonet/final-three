// ThreeJS and Third-party deps
import * as THREE from 'three';
import * as dat from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';

import toonVertexShader from './toon.vert';
import toonFragmentShader from './toon.frag';
import hadesFragmentShader from './hades.frag';

// Core boilerplate code deps
import {
  createCamera,
  createComposer,
  createRenderer,
  runApp,
} from './core-utils';

// Other deps
import Tile from './assets/checker_tile.png';
import Okami from './assets/okami_icewater.png';
import Cracked from './assets/cracked.png';
import Water from './assets/water.png';
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

  lineWeight: 1.02,
  pAmbient: 1.0,
  pDiffuse: 1.0,
  pSpecular: 1.0,
  pBanding: 1,
  pGlossy: 5.0,
  pRimAmount: 0.8,
  pRimThresh: 0.5,
  pColor: new THREE.Color(0x8185c1),
  pDirLightColor: new THREE.Color(0xffffff),
  pHades: false,
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

  // line weight gui
  // _renderer.lineWeight = params.lineWeight;
  // const gui = new dat.GUI();
  // gui.add(params, 'lineWeight',0,2).name('Line Weight').onChange(() => {
  //  _renderer.lineWeight = params.lineWeight;
  // });
});

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 20, 10);
    dirLight.lookAt(0, 5, 0);

    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;

    dirLight.shadow.camera = new THREE.OrthographicCamera(
      -10,
      10,
      10,
      -10,
      0.1,
      100
    );

    scene.add(dirLight);
    // scene.add(new DirectionalLightHelper(dirLight));

    scene.add(new THREE.CameraHelper(dirLight.shadow.camera));
    // Create the floor
    const geoFloor = new THREE.BoxGeometry(200, 0.1, 200);
    const matStdFloor = new THREE.MeshStandardMaterial({
      color: 0x606060,
      roughness: 0.5,
      metalness: 0,
    });
    const mshStdFloor = new THREE.Mesh(geoFloor, matStdFloor);
    // need await to make sure animation starts only after texture is loaded
    // this works because the animation code is 'then-chained' after initScene(), see core-utils.runApp
    // await this.loadTexture(mshStdFloor);
    scene.add(mshStdFloor);
    scene.add(new THREE.AmbientLight(0x888888));
    mshStdFloor.receiveShadow = true;

    var ambient = params.pAmbient;
    var diffuse = params.pDiffuse;
    var specular = params.pSpecular;
    var glossiness = params.pGlossy;
    var rimAmount = params.pRimAmount;
    var rimThresh = params.pRimThresh;
    var bandingNum = params.pBanding;
    var color = params.pColor;
    var hadesShaderOn = params.pHades;

    // toon material
    var toonMaterial = new THREE.ShaderMaterial({
      lights: true,
      flatShading: true,
      uniforms: {
        ...THREE.UniformsLib.lights,
        uColor: { value: color },
        glossiness: { value: glossiness },
        rimAmount: { value: rimAmount },
        rimThresh: { value: rimThresh },
        uSpecular: { value: specular },
        uDiffuse: { value: diffuse },
        uAmbient: { value: ambient },
        uBanding: { value: bandingNum },
        hadesOn: { value: hadesShaderOn },

        //hades shader
        //uColor: { value: new THREE.Color('#d14c2a') },
      },
      // adding the custom shader stuff connected to toon.vert and toon.frag
      vertexShader: toonVertexShader,
      fragmentShader: toonFragmentShader,
    });

    // cheater way of bump mapping, can use Three's toon, phong, or lambert shader (toon looks the worst...)

    var crack = new THREE.TextureLoader().load(Cracked);
    var okami = new THREE.TextureLoader().load(Okami);
    var water = new THREE.TextureLoader().load(Water);

    crack.wrapS = THREE.RepeatWrapping;
    crack.wrapT = THREE.RepeatWrapping;
    crack.repeat.set(2, 2); // denser pattern
    okami.wrapS = THREE.RepeatWrapping;
    okami.wrapT = THREE.RepeatWrapping;
    okami.repeat.set(1, 2); 

    const bumpMaps = ( function () {
      return {
        okami: okami, 
        water: water,
        crack: crack
      };

    } )();

    const diffuseMapKeys = Object.keys( bumpMaps );

    var bumpMaterial = new THREE.MeshToonMaterial({ 
      color: color,
      opacity: 1,
      visible: false,
      bumpMap: bumpMaps[diffuseMapKeys[0]],
      bumpScale: 0.05 // higher values = more textured lines. lower values = cartoonish/smoother effect
    });

    //let outlineWeight = params.lineWeight;
    let scalar = params.lineWeight;

    // more objects! ----------------------------------------

    //

    cone = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 5, 32),
      hadesShaderOn ? hadesMaterial : toonMaterial
    );
    cone.position.set(-5, 2.5, -5);
    scene.add(cone);
    cone.castShadow = true;
    cone.receiveShadow = true;

    ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.5, 16, 50),
      toonMaterial
    );
    ring.position.set(2, 4, 4);
    scene.add(ring);
    ring.castShadow = true;
    ring.receiveShadow = true;

    capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(1, 2, 4, 8),
      toonMaterial
    );
    capsule.position.set(3, 5, -4);
    scene.add(capsule);
    capsule.castShadow = true;
    capsule.receiveShadow = true;


    var cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 5, 32),
      toonMaterial
    );
    cyl.position.set(10, 2.5, 3);
    scene.add(cyl);
    cyl.castShadow = true;
    cyl.receiveShadow = true;

    // sphere object
    var sphereGeo = new THREE.SphereGeometry(2, 24, 24);
    var sphere = new THREE.Mesh(sphereGeo, toonMaterial);
    //var sphere = new THREE.Mesh(sphereGeo, THREE.MeshBasicMaterial({color:0xffffff}));
    sphere.position.set(0, sphere.geometry.parameters.radius * scalar, 0);
    //sphere.position.y.set(sphere.geometry.parameters.radius *outlineWeight);
    scene.add(sphere);
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    var sphereBump = new THREE.SphereGeometry(2, 24, 24);
    var sphere = new THREE.Mesh(sphereBump, bumpMaterial);
    sphere.position.set(0, sphere.geometry.parameters.radius * scalar, 0);
    scene.add(sphere);
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    // torus knot object
    var torusKnotGeo = new THREE.TorusKnotGeometry(1, 0.3);
    var torus = new THREE.Mesh(torusKnotGeo, toonMaterial);
    scene.add(torus);
    torus.position.set(5, sphere.geometry.parameters.radius + 2, 2);
    torus.castShadow = true;
    torus.receiveShadow = true;

    // outline
    var outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
    });
    let outlineMesh = new THREE.Mesh(sphereGeo, outlineMaterial);
    //outlineMesh.position = sphere.position;
    outlineMesh.position.set(0, sphere.geometry.parameters.radius * scalar, 0);
    //outlineMesh.position.set(sphere.position);
    outlineMesh.scale.multiplyScalar(scalar);
    scene.add(outlineMesh);

    //hades shader
    // var outlinematerial1 = new THREE.MeshBasicMaterial({
    //   color: 0x000000,
    //   side: THREE.BackSide,
    // });
    // var outlineMesh = new THREE.Mesh(geometry, outlinematerial1);
    // //outlineMesh.position = sphere.position;
    // outlineMesh.position.set(
    //   0,
    //   (sphere.geometry.parameters.radius + 2) * 1.02,
    //   0
    // );
    // outlineMesh.scale.multiplyScalar(1.02);

    // GUI controls
    const gui = new dat.GUI();
    gui
      .add(params, 'pAmbient', 0, 2, 0.05)
      .name('Ambient')
      .onChange((val) => {
        ambient = val;
        toonMaterial.uniforms.uAmbient.value = ambient;
      });
    gui
      .add(params, 'pDiffuse', 0, 2, 0.05)
      .name('Diffuse')
      .onChange((val) => {
        diffuse = val;
        toonMaterial.uniforms.uDiffuse.value = diffuse;
      });
    gui
      .add(params, 'pSpecular', 0, 2, 0.05)
      .name('Specular')
      .onChange((val) => {
        specular = val;
        toonMaterial.uniforms.uSpecular.value = specular;
      });
    gui
      .add(params, 'lineWeight', 1, 1.1, 0.01)
      .name('Border')
      .onChange((val) => {
        let ratio = val / scalar;

        sphere.position.set(0, sphere.geometry.parameters.radius * val, 0);
        outlineMesh.position.set(0, sphere.geometry.parameters.radius * val, 0);
        outlineMesh.scale.multiplyScalar(ratio);

        scalar = val;
      });
    gui
      .add(params, 'pGlossy', 0, 20, 1)
      .name('Glossiness')
      .onChange((val) => {
        glossiness = val;
        toonMaterial.uniforms.glossiness.value = glossiness;
      });
    gui
      .add(params, 'pRimAmount', 0.7, 1, 0.05)
      .name('Rim Amount')
      .onChange((val) => {
        rimAmount = val;
        toonMaterial.uniforms.rimAmount.value = rimAmount;
      });
    gui
      .add(params, 'pBanding', 1, 4, 1)
      .name('Banding')
      .onChange((val) => {
        bandingNum = val;
        toonMaterial.uniforms.uBanding.value = bandingNum;
      });
    gui
      .addColor(params, 'pDirLightColor')
      .name('Light Color')
      .onChange((val) => {
        dirLight.color.r = val.r / 255;
        dirLight.color.g = val.g / 255;
        dirLight.color.b = val.b / 255;
      });

    const customShader = gui.addFolder('Custom Toon')
    customShader.add( toonMaterial, 'visible' );
    customShader
      .addColor(params, 'pColor')
      .name('Color')
      .onChange((val) => {
        color = val;
        toonMaterial.uniforms.uColor.value.r = color.r / 255;
        toonMaterial.uniforms.uColor.value.g = color.g / 255;
        toonMaterial.uniforms.uColor.value.b = color.b / 255;
      });
    customShader
      .add(params, 'pHades')
      .name('Hades Shader')
      .onChange((val) => {
        hadesShaderOn = val;
        toonMaterial.uniforms.hadesOn.value = val;
      });

    // CUSTOM SHADER CONTROLS 
    const threeShader = gui.addFolder('THREE Toon (Bump Mapping)')

    const data = {
      color: bumpMaterial.color.getHex(),
      map: diffuseMapKeys[0],
      scale: bumpMaterial.bumpScale
    };

    function handleColorChange( color ) {
      return function ( value ) {
        if ( typeof value === 'string') {
          value = value.replace('#', '0');
        }
        color.setHex( value );
      };
    }
    threeShader.add( bumpMaterial, 'visible' );

    threeShader
      .addColor(data, 'color')
      .onChange(handleColorChange(bumpMaterial.color))

    threeShader
      .add(data, 'map', diffuseMapKeys )
      .onChange((textureString) => bumpMaterial.bumpMap = bumpMaps[textureString]);

    threeShader
      .add(data, 'scale', [1, 0.5, 0.05, 0.005])
      .onChange((val) => bumpMaterial.bumpScale = val);
    
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
