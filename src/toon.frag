#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

uniform vec3 uColor;
uniform float glossiness;
uniform float rimAmount;
uniform float rimThreshold;
uniform float uAmbient;
uniform float uDiffuse;
uniform float uSpecular;
uniform int uBanding;
uniform bool hadesOn;


varying vec3 vNormal;
varying vec3 vViewDir;


void main() {
  // shadow map 
  DirectionalLightShadow directionalShadow = directionalLightShadows[0];

  float shadow = getShadow(
    directionalShadowMap[0],
    directionalShadow.shadowMapSize,
    directionalShadow.shadowBias,
    directionalShadow.shadowRadius,
    vDirectionalShadowCoord[0]
  );

  if (hadesOn) {

        // directional light
    float NdotL = dot(vNormal, directionalLights[0].direction);
    float lightIntensity = smoothstep(0.0, 0.01, NdotL);
    vec3 directionalLight;
    
    if (abs(NdotL) > 0.6) {
      if (NdotL > 0.64) {
        directionalLight = directionalLights[0].color * lightIntensity;
      } else {
        directionalLight = (directionalLights[0].color + vec3(10.0 - directionalLights[0].color[0], 1.0 - directionalLights[0].color[1], 10.0 - directionalLights[0].color[2]))  *  0.5 * lightIntensity;
      }

    } else if (NdotL > 0.15) {
      directionalLight = directionalLights[0].color  * lightIntensity * 0.5;
    }

    // specular reflection
    vec3 halfVector = normalize(directionalLights[0].direction + vViewDir);
    float NdotH = dot(vNormal, halfVector);

    // adjust to preference, could be a GUI feature
    float glossiness = 5.0;

    float specularIntensity = pow(NdotH * lightIntensity, 1000.0 / glossiness);
    float specularIntensitySmooth = smoothstep(0.05, 0.1, specularIntensity);

    vec3 specular = specularIntensitySmooth * (directionalLights[0].color) * 2.0;

    // // rim lighting but it seems like a cheese way to do it, can prob improve
    float rimDot = 1.0 - dot(vViewDir, vNormal);
    float rimAmount = 0.6;

    float rimThreshold = 0.1;
    float rimIntensity = rimDot * pow(0.5, rimThreshold);
    rimIntensity = smoothstep(rimAmount - 0.01, rimAmount + 0.01, rimIntensity);

    vec3 rim = rimIntensity * directionalLights[0].color;

    gl_FragColor = vec4(uColor  * (rim + directionalLight + specular), 1.0);
    // gl_FragColor = vec4(uColor + rim + specular +, 1.0);



  } else {
      // directional light
    float NdotL = dot(vNormal, directionalLights[0].direction);
    float lightIntensity = smoothstep(0.0, 0.01, NdotL * shadow);
    vec3 directionalLight;

    // no additional banding
    // directionalLight = directionalLights[0].color * lightIntensity;

    if (uBanding == 4) {
      // with banding, 4 bands 
    if (NdotL < 0.40) {
      directionalLight = directionalLights[0].color * lightIntensity * 0.1;
    } else if (abs(NdotL) < 0.70) {
      directionalLight = directionalLights[0].color * lightIntensity * 0.3;
    } else if (abs(NdotL) < 0.90) {
      directionalLight = directionalLights[0].color * lightIntensity * 0.6;
    } else if (NdotL < 1.0) {
      directionalLight = directionalLights[0].color * lightIntensity;
    }

    } else if (uBanding == 3) {
          // with banding, 3 bands 
    if (NdotL < 0.60) {
      directionalLight = directionalLights[0].color * lightIntensity * 0.2;
    } else if (abs(NdotL) < 0.90) {
      directionalLight = directionalLights[0].color * lightIntensity * 0.5;
    } else if (NdotL < 1.0) {
      directionalLight = directionalLights[0].color * lightIntensity;
    }

    } else if (uBanding == 2) {
          // with banding, 2 bands 
    if (NdotL < 0.60) {
      directionalLight = directionalLights[0].color * lightIntensity * 0.6;
    } else if (NdotL < 1.0) {
      directionalLight = directionalLights[0].color * lightIntensity;
    }

    } else {


      directionalLight = directionalLights[0].color * lightIntensity;


    }
    

    // with banding alternate
    //   if (NdotL < 0.40) {
    //   directionalLight = (directionalLights[0].color + vec3(0.0, 7.0, -0.5))  * lightIntensity * 0.1;
    // } else if (abs(NdotL) < 0.70) {
    //   directionalLight = (directionalLights[0].color + vec3(0.5, 5.0, -1.0)) * lightIntensity * 0.3;
    // } else if (abs(NdotL) < 0.90) {
    //   directionalLight = (directionalLights[0].color + vec3(1.0, 3.0, -1.5))  * lightIntensity * 0.6;
    // } else if (NdotL < 1.0) {
    //   directionalLight = (directionalLights[0].color + vec3(2.0, 2.0, -2.0)) * lightIntensity;
    // }

    // specular reflection
    vec3 halfVector = normalize(directionalLights[0].direction + vViewDir);
    float NdotH = dot(vNormal, halfVector);
    float specularIntensity = pow(NdotH * lightIntensity, 1000.0 / glossiness);
    float specularIntensitySmooth = smoothstep(0.05, 0.1, specularIntensity);
    vec3 specular = specularIntensitySmooth * directionalLights[0].color;

    // // rim lighting 
    float rimDot = 1.0 - dot(vViewDir, vNormal);
    float rimIntensity = rimDot * pow(0.5, rimThreshold);
    rimIntensity = smoothstep(rimAmount - 0.01, rimAmount + 0.01, rimIntensity);
    vec3 rim = rimIntensity * directionalLights[0].color;

    gl_FragColor = vec4(uColor  * (ambientLightColor * uAmbient + directionalLight * uDiffuse + specular * uSpecular + rim), 1.0);


  }



}