const canvas = document.getElementById("gl");
const errorEl = document.getElementById("error");

const camera = {
  distance: 28,
  azimuth: 0.55,
  elevation: 0.42,
  minDistance: 12,
  maxDistance: 55,
  velAzimuth: 0,
  velElevation: 0,
};

const pointer = {
  active: false,
  id: null,
  x: 0,
  y: 0,
};

let gl;
let program;
let vao;
let uniforms = {};
let startTime = performance.now();
let lastFrame = performance.now();
let diskBrightness = 1.35;

function showError(message) {
  errorEl.hidden = false;
  errorEl.textContent = message;
}

async function loadText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.text();
}

function compileShader(type, source, label) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || "unknown compile error";
    gl.deleteShader(shader);
    throw new Error(`${label} shader compile failed:\n${info}`);
  }
  return shader;
}

function createProgram(vertexSource, fragmentSource) {
  const vert = compileShader(gl.VERTEX_SHADER, vertexSource, "Vertex");
  const frag = compileShader(gl.FRAGMENT_SHADER, fragmentSource, "Fragment");
  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog) || "unknown link error";
    gl.deleteProgram(prog);
    throw new Error(`Program link failed:\n${info}`);
  }
  return prog;
}

function getUniforms(prog, names) {
  const map = {};
  for (const name of names) {
    map[name] = gl.getUniformLocation(prog, name);
  }
  return map;
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(window.innerWidth * dpr));
  const height = Math.max(1, Math.floor(window.innerHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function onPointerDown(event) {
  if (pointer.active) return;
  pointer.active = true;
  pointer.id = event.pointerId;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  camera.velAzimuth = 0;
  camera.velElevation = 0;
  canvas.classList.add("is-dragging");
  canvas.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!pointer.active || event.pointerId !== pointer.id) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  pointer.x = event.clientX;
  pointer.y = event.clientY;

  const sens = 0.0055;
  camera.azimuth += dx * sens;
  camera.elevation = Math.max(-1.2, Math.min(1.2, camera.elevation - dy * sens));
  camera.velAzimuth = dx * sens * 12;
  camera.velElevation = -dy * sens * 12;
}

function onPointerUp(event) {
  if (!pointer.active || event.pointerId !== pointer.id) return;
  pointer.active = false;
  pointer.id = null;
  canvas.classList.remove("is-dragging");
}

function onWheel(event) {
  event.preventDefault();
  const factor = Math.exp(event.deltaY * 0.0012);
  camera.distance = Math.max(
    camera.minDistance,
    Math.min(camera.maxDistance, camera.distance * factor)
  );
}

function bindInput() {
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", resize);
}

function updateCamera(dt) {
  if (!pointer.active) {
    camera.azimuth += camera.velAzimuth * dt;
    camera.elevation = Math.max(
      -1.2,
      Math.min(1.2, camera.elevation + camera.velElevation * dt)
    );
    const damping = Math.exp(-3.5 * dt);
    camera.velAzimuth *= damping;
    camera.velElevation *= damping;
    if (Math.abs(camera.velAzimuth) < 1e-4) camera.velAzimuth = 0;
    if (Math.abs(camera.velElevation) < 1e-4) camera.velElevation = 0;
  }
}

function render(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  updateCamera(dt);
  resize();

  const time = (now - startTime) / 1000;
  gl.useProgram(program);
  gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
  gl.uniform1f(uniforms.uTime, time);
  gl.uniform1f(uniforms.uCamDistance, camera.distance);
  gl.uniform1f(uniforms.uCamAzimuth, camera.azimuth);
  gl.uniform1f(uniforms.uCamElevation, camera.elevation);
  gl.uniform1f(uniforms.uDiskBrightness, diskBrightness);

  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  requestAnimationFrame(render);
}

async function init() {
  gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    showError("WebGL2 is required for this simulation. Try a recent Chrome, Firefox, or Edge build.");
    return;
  }

  try {
    const [vertexSource, fragmentSource] = await Promise.all([
      loadText("shaders/vertex.glsl"),
      loadText("shaders/fragment.glsl"),
    ]);

    program = createProgram(vertexSource, fragmentSource);
    uniforms = getUniforms(program, [
      "uResolution",
      "uTime",
      "uCamDistance",
      "uCamAzimuth",
      "uCamElevation",
      "uDiskBrightness",
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0.02, 0.03, 0.05, 1);

    bindInput();
    resize();
    requestAnimationFrame(render);
  } catch (err) {
    console.error(err);
    const hint =
      window.location.protocol === "file:"
        ? " Open this folder with a local server, e.g. python3 -m http.server 8080"
        : "";
    showError(`${err.message}.${hint}`);
  }
}

init();
