#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform float uCamDistance;
uniform float uCamAzimuth;
uniform float uCamElevation;
uniform float uDiskBrightness;

// Geometric units with M = 1. Schwarzschild radius rs = 2M = 2.
const float M = 1.0;
const float RS = 2.0 * M;
const float PHOTON_SPHERE = 3.0 * M;
const float DISK_INNER = 6.0 * M;   // ISCO
const float DISK_OUTER = 18.0 * M;
const int MAX_STEPS = 260;
const float ESCAPE_R = 70.0;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 starField(vec3 dir) {
  vec3 d = normalize(dir);
  float n = hash21(floor(d.xy * 180.0 + d.z * 37.0));
  float sparkle = smoothstep(0.995, 1.0, n);
  float warm = hash21(floor(d.yz * 90.0));
  vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.88, 0.7), warm);
  float milky = pow(max(0.0, 1.0 - abs(d.y) * 1.8), 3.0) * 0.035;
  return tint * sparkle * 1.35 + vec3(0.04, 0.05, 0.08) * milky;
}

vec3 diskColor(float r, float angle) {
  float t = clamp((r - DISK_INNER) / (DISK_OUTER - DISK_INNER), 0.0, 1.0);
  // Hot white-gold near ISCO, cooling through amber into deep copper.
  vec3 hot = vec3(1.35, 1.15, 0.85);
  vec3 mid = vec3(1.1, 0.55, 0.18);
  vec3 cool = vec3(0.35, 0.08, 0.02);
  vec3 base = mix(hot, mid, smoothstep(0.0, 0.45, t));
  base = mix(base, cool, smoothstep(0.4, 1.0, t));

  float spiral = 0.5 + 0.5 * sin(angle * 6.0 - log(r) * 8.0 - uTime * 1.4);
  float bands = 0.72 + 0.28 * spiral;
  float brightness = uDiskBrightness * bands * pow(1.0 - t, 1.35) / (r * 0.18);
  return base * brightness;
}

// Null-geodesic acceleration from the Schwarzschild curvature term that
// produces the photon sphere at r = 3M. L = r × v is specific angular momentum.
vec3 geodesicAccel(vec3 pos, vec3 vel) {
  float r2 = dot(pos, pos);
  float r = sqrt(max(r2, 1e-6));
  vec3 L = cross(pos, vel);
  float L2 = max(dot(L, L), 1e-8);
  return -1.5 * RS * L2 * pos / (r2 * r2 * r);
}

void rk2Step(inout vec3 pos, inout vec3 vel, float h) {
  vec3 a1 = geodesicAccel(pos, vel);
  vec3 posMid = pos + vel * (h * 0.5);
  vec3 velMid = vel + a1 * (h * 0.5);
  vec3 a2 = geodesicAccel(posMid, velMid);
  pos += velMid * h;
  vel += a2 * h;
}

vec3 cameraRay(vec2 uv, out vec3 origin) {
  float az = uCamAzimuth;
  float el = clamp(uCamElevation, -1.25, 1.25);
  float dist = uCamDistance;

  vec3 target = vec3(0.0);
  origin = target + vec3(
    dist * cos(el) * cos(az),
    dist * sin(el),
    dist * cos(el) * sin(az)
  );

  vec3 forward = normalize(target - origin);
  vec3 worldUp = abs(forward.y) > 0.95 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(forward, worldUp));
  vec3 up = cross(right, forward);

  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float fov = 1.05;
  vec2 ndc = uv * 2.0 - 1.0;
  ndc.x *= aspect;
  return normalize(forward + right * ndc.x * fov + up * ndc.y * fov);
}

vec3 trace(vec3 origin, vec3 dir) {
  vec3 pos = origin;
  vec3 vel = dir;
  vec3 color = vec3(0.0);
  float transmittance = 1.0;
  float prevY = pos.y;
  float glow = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    float r = length(pos);

    if (r < RS * 1.02) {
      // Absorbed by the event horizon.
      color += vec3(0.0);
      transmittance = 0.0;
      break;
    }

    if (r > ESCAPE_R) {
      color += starField(vel) * transmittance;
      break;
    }

    // Soft photon-sphere glow from tightly wound null geodesics.
    float nearPhoton = smoothstep(0.8, 0.0, abs(r - PHOTON_SPHERE));
    glow += nearPhoton * 0.012 * transmittance;

    float h = clamp(r * 0.045, 0.025, 0.4);
    vec3 nextPos = pos;
    vec3 nextVel = vel;
    rk2Step(nextPos, nextVel, h);

    // Detect equatorial-plane crossings for the thin accretion disk.
    if (prevY * nextPos.y < 0.0) {
      float tHit = prevY / (prevY - nextPos.y);
      vec3 hit = mix(pos, nextPos, clamp(tHit, 0.0, 1.0));
      float hitR = length(hit.xz);

      if (hitR > DISK_INNER && hitR < DISK_OUTER) {
        float angle = atan(hit.z, hit.x);
        vec3 emit = diskColor(hitR, angle);
        // Mild gravitational redshift-ish falloff closer to the hole.
        float redshift = clamp((hitR - RS) / (DISK_OUTER - RS), 0.15, 1.0);
        emit *= redshift;

        color += emit * transmittance;
        transmittance *= 0.35;

        if (transmittance < 0.02) {
          break;
        }
      }
    }

    prevY = nextPos.y;
    pos = nextPos;
    vel = nextVel;
  }

  // Horizon silhouette softness from leftover glow.
  color += vec3(1.0, 0.72, 0.42) * glow * 0.55;
  return color;
}

vec3 ACESFilm(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  // Fixed sub-pixel offset softens geodesic edges without temporal sparkle.
  vec2 texel = 1.0 / uResolution;
  float j = hash21(gl_FragCoord.xy) - 0.5;
  vec2 offset = vec2(j, fract(j * 12.9898) - 0.5) * texel * 0.85;

  vec3 origin;
  vec3 dir = cameraRay(vUv + offset, origin);
  vec3 color = trace(origin, dir);

  color = ACESFilm(color * 1.15);
  color = pow(color, vec3(1.0 / 2.2));

  // Subtle vignette to keep the hole as the visual anchor.
  vec2 q = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(q, q) * 0.18;
  color *= clamp(vignette, 0.7, 1.0);

  fragColor = vec4(color, 1.0);
}
