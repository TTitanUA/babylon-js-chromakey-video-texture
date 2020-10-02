
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  MeshBuilder,
  FreeCamera,
  StandardMaterial,
  Color3,
  VideoTexture,
  ShaderMaterial,
  Effect,
  Texture
} from 'babylonjs';

import { parse } from 'query-string';
import { invokeMap } from 'lodash/collection';

import GameWindow from './interfaces/GameWindow';

declare const window: Window;

Effect.ShadersStore["basicVertexShader"] = `
precision highp float;
 
// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
 
// Uniforms
uniform mat4 worldViewProjection;
uniform float time;
 
// Varying
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUV;

varying float noise;
 
void main(void) {
    vec3 v = position;
 
    gl_Position = worldViewProjection * vec4(v, 1.0);
 
    vPosition = position;
    vNormal = normal;
    vUV = uv;
}
`;

Effect.ShadersStore['videoFxFragmentShader'] = `
precision highp float;
 
uniform sampler2D textureSampler;
varying vec2 vUV;
//uniform mat4 worldView;

//recommended 0.24
uniform float thresholdSensitivity;

//recommended 0.3
uniform float smoothing;

vec4 transparentColor = vec4(0.0, 0.0, 0.0, 0.0);

void main(void) {
  vec2 uv = vUV.xy;
  vec4 sample_color = texture2D(textureSampler, uv);
  
  // Get chroma key color
  vec4 chromaColorAuto = texture2D(textureSampler, vec2(1.0, 1.0));
  vec3 newChromaColorAuto = vec3(chromaColorAuto.r, chromaColorAuto.g, chromaColorAuto.b);

  float maskY = 0.2989 * newChromaColorAuto.r + 0.5866 * newChromaColorAuto.g + 0.1145 * newChromaColorAuto.b;
  float maskCr = 0.7132 * (newChromaColorAuto.r - maskY);
  float maskCb = 0.5647 * (newChromaColorAuto.b - maskY);
  float Y = 0.2989 * sample_color.r + 0.5866 * sample_color.g + 0.1145 * sample_color.b;
  float Cr = 0.7132 * (sample_color.r - Y);
  float Cb = 0.5647 * (sample_color.b - Y);
  float blendValue = smoothstep(thresholdSensitivity, thresholdSensitivity + smoothing, distance(vec2(Cr, Cb), vec2(maskCr, maskCb)));
  gl_FragColor = vec4(sample_color.rgb * blendValue, 1.0 * blendValue);
}`;

export function createScene({ engine, canvas }: GameWindow): Scene {
  const scene: Scene = new Scene(engine);

  // This creates and positions a free camera (non-mesh)
  const camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);

  // This targets the camera to scene origin
  camera.setTarget(Vector3.Zero());

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);

  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  const light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

  // Default intensity is 1. Let's dim the light a small amount
  light.intensity = 0.7;

  // Our built-in 'sphere' shape. Params: name, subdivs, size, scene

  // Move the sphere upward 1/2 its height
  // sphere.position.y = 1;
  const plane_bg = MeshBuilder.CreatePlane("blah", {width: 10, height: 6.5}, scene);
  plane_bg.billboardMode = 1;
  plane_bg.position.z += 1;

  const mat1 = new StandardMaterial("mat", scene);
  // mat1.diffuseColor = Color3.Red();
  mat1.diffuseTexture = new Texture("/textures/mercator2.jpg", scene);
  plane_bg.material = mat1;

  const plane =  MeshBuilder.CreatePlane("blah", {width: 8, height: 4.5}, scene);
  plane.billboardMode = 1;

  const videoIndex = parseInt(parse(window.location.search).index as string);

  const videoUrl = [
    '/Flag-44726.mp4',
    '/GreenScreen-17291.mp4',
    '/GreenScreenGangnam.mp4',
    '/ManWalking-21263.mp4',
    '/stock-footage-business-people-talking-together-against-green-background.webm',
    '/SubscribeVideo-30438.mp4',
  ][videoIndex] || '/Flag-44726.mp4';

  // const videoUrl = "/Frau_mit_Alpha.mp4";
  //const videoUrl = "/GreenScreenGangnam.mp4";
  // const videoUrl = "/stock-footage-business-people-talking-together-against-green-background.webm";

  //const videoTexture = new VideoTexture("video", ["http://d2kuauktxs0j0x.cloudfront.net/wp-content/uploads/2018/11/Shockwave_16.mp4"], scene, true, true);
  const videoTexture = new VideoTexture("video", [videoUrl], scene, true, false);

  const shaderMaterial = new ShaderMaterial("shader", scene, {
      vertex: "basic",
      fragment: "videoFx",
    },
    {
      needAlphaBlending : true,
      attributes: ["position", "normal", "uv", "world0", "world1", "world2", "world3"],
      uniforms: ["world", "worldView", "viewProjection", "worldViewProjection", "view", "projection"]
    });

  shaderMaterial.setTexture("textureSampler", videoTexture);
  shaderMaterial.setFloat('thresholdSensitivity', 0.24);
  shaderMaterial.setFloat('smoothing', 0.2);


  plane.material = shaderMaterial;
  plane.setEnabled(false);


  videoTexture.video.autoplay = false;
  videoTexture.video.loop = false;
  videoTexture.video.play();

  let meshes = [plane];

  invokeMap(meshes, 'setEnabled', true);


  scene.onPointerUp = function () {
    if(videoTexture.video.paused) {
      videoTexture.video.currentTime = 0;
      videoTexture.video.play();
    } else {
      videoTexture.video.pause();
    }
  }

  return scene;
}

const gameWindow = window as GameWindow;
gameWindow.engine = new Engine(gameWindow.canvas, true);
const scene: Scene = createScene(gameWindow);

gameWindow.engine.runRenderLoop(() => {
  scene.render();
});
