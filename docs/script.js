// Code by Louise Lessél, www.louiselessel.com
// Image sampling voronoi for Gloria, Mass For The Endangered, by Sarah Kirkland Snider www.sarahkirklandsnider.com
// Based on this shader: https://www.shadertoy.com/view/WltfzB
// Voronoi based on original shader https://www.shadertoy.com/view/4sK3WK by stb
// Three.js code adapted from https://discourse.threejs.org/t/help-porting-shadertoy-to-threejs/2441 by milewski

 //'use strict';
 // ------ SHADERS
const VERTEX_SHADER = `
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
`;
const BUFFER_A_FRAG = `
uniform vec2 iResolution;	//The width and height of our screen
uniform sampler2D bufferTexture;	//Our input texture
uniform sampler2D imgTexture;
varying vec2 vUv;

vec4 fragColor;
uniform sampler2D iChannel0; // takes buffer of self
uniform float iTime;
uniform int iFrame;
uniform vec4 iMouse;
uniform vec2 sound;
uniform float soundFade;
uniform float soundTriggered;


//Based on https://www.shadertoy.com/view/4sK3WK by stb - thank you for your help!
//Simplified drawing only, no deleting cells, no moving cells. See original for that.

#define t2D(o) texture2D(iChannel0, uv-o/res)               // in 0-1 range
//#define isKeyHeld(key) texture2D(iChannel3, vec2(key, .2)).r > 0.
#define dataAt(x) texture2D(iChannel0, vec2(x+.5, .5)/res)
//#define dataAt(x) texture2D(iChannel0, vec2(x, 0.)/res)     // check if halfpoint is necessary

// hash without sine
// https://www.shadertoy.com/view/4djSRW
#define MOD3 vec3(443.8975,397.2973, 491.1871)
float hash12(vec2 p) {
    vec3 p3  = fract(vec3(p.xyx) * MOD3);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

//void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
void main() {
    vec2 vUv_ = vUv;
    vec2 res = iResolution.xy;
    vec2 fc = gl_FragCoord.xy;
    vec2 uv = fc / res;
    vec3 o = vec3(1., -1., 0.);
    vec2 p = (fc-res/2.)/res.y;
    
    // set up neighborhood filter size 3
    vec2 dirs[8];
    dirs[0] = o.xz; dirs[1] = o.yz; dirs[2] = o.zx; dirs[3] = o.zy;
    dirs[4] = o.xx; dirs[5] = o.yx; dirs[6] = o.xy; dirs[7] = o.yy;
    
    // get current pixel position from last frame - (uv-(0.,0)/res)
    vec2 pos = t2D(o.zz).rg;  // current position, processed from last frame, stored in RG
    
    // get data about mouse from previous frame - savedPosition
    //vec2 sPos = dataAt(2.).ba;  // moving frame - if mouse hold BA - at (2.5, .5)/res;
    vec2 mOld = dataAt(0.).ba;  // mouseOld BA - at (0., 0.5)/res
    
    // is the mouse being held? - if so there would be data in z/b channel of previous frame
    float isMHeld;  // = dataAt(1.).b;  
    
    // NEIGHBORHOOD PROCESSING
    for(int i=0; i<8; i++) {
        // neighbor's stored position
        vec2 iPos = t2D(dirs[i]).rg;
        
        // if circle produced by neighbor is less than the current one, take its position
        if(length(fc-iPos) < length(fc-pos))
            pos = iPos;
    }
    
    // If mouse is held
    bool mouseHeld = true;
    mouseHeld = iMouse.z> 0.;
    
    if(mouseHeld) {
        // cell position under mouse
        // uses t-input as a way to map coordinate - not necessary!
        //vec2 posUnderMouse = iMouse.xy/res;  //texture(iChannel0, iMouse.xy/res).rg; 
        
        // add cell on mouse
        if(length(fc.xy-iMouse.xy) < length(fc.xy-pos.xy) ){
            pos = iMouse.xy;
        }
        isMHeld = 1.; // mouse was held this frame - will get stored and passed to next frame        
    }

    // add cell on sound
    if (soundTriggered > 0.) {
      if(length(fc.xy-sound.xy) < length(fc.xy-pos.xy) ){
        pos = sound;
      }
    }
    
    else {
    isMHeld = 0.; // mouse was not held this frame 
    }
    
    mOld = iMouse.xy;  // mouse on screen - not normalized
    

    // initialize values first frame
    // this is where it makes a sphere at first 
    float sphereShape = 64.;
    if(iFrame == 0) {
        if(pow(length(fc/res.y-vec2(.5*res.x/res.y, 0.)), sphereShape) > hash12(uv)) {
        //if(pow(length(p), 16.)*512.+.01*cos(5.*atan(res.x/res.y)) > hash12(uv)) {
            pos = fc;  // multiplying a scalar here is dope
        }
        else {
            //pos = vec2(-10000.); 
        }
        isMHeld = 0.;
    }
    
    // ------- CLEAR FRAMEBUFFER --------
    // clear stored positions when R is pressed    // ---------------- REPLACE WITH EXTERNAL UNIFORM
    //if(isKeyHeld(Key_R))
    //  pos = vec2(-10000.);
    // or could also be done on frame
    //if(iFrame == 100)
    //    pos = vec2(-10000.);
    
    
    
    
    // ------- STORE OUTPUTS --------
    
    // save cell position(s) - RG
    fragColor.rg = floor(pos);                  // IS CORRECT
    
    
    // STORE MOUSE POS
    // save old mouse position - if current pixel (o.zz) is this fragcoord - put in BA
    if(floor(fc)==o.zz) {      // floor(fc) gives only integer coords, not #.5 coords
        //fragColor.ba = mOld;   // store straight mouse.xy in BA
    }

    
    // STORE BUTTON STATES - NOT IN USE    
    /*
    else
        // save button held state in this coordinate, right of current - B
        if(floor(fc)==o.xz)
            fragColor.b = isMHeld; // float, if mouse was held in this frame, in B
    */        
    

    // SANITY CHECKS

    // Sanity check -  remember straight reading of texture in image
    //fragColor = vec4(1.,0.,0.,1); 
    
    // DEBUG CHECKS
    //fragColor = vec4(vec3(isMHeld),1); // float check
    //fragColor = vec4(mOld,0.,1);  // yellow - straight mouse.xy
    //fragColor = vec4(sPos,0.,1);  // green
    //fragColor = vec4(floor(fc), 0., 1.); // yellow with green and red line at left and bottom

    //fragColor = vec4(texture2D(imgTexture, vUv));
    //fragColor = vec4(texture2D(bufferTexture, vUv));

    // check that my storing works
    if(floor(fc) == vec2(10.,10.)) {  // make a red pixel at this coordinate
        //fragColor = vec4(1.,0.,0.,1);
    }
    // Does mouse get read?
    //fragColor.rg = mOld/res; 

    gl_FragColor = fragColor;
}


`;
const BUFFER_B_FRAG = `
uniform vec2 iResolution;	//The width and height of our screen
uniform sampler2D bufferTexture;	//Our input texture
uniform sampler2D imgTexture;
varying vec2 vUv;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;

uniform float iTime;
uniform int iFrame;
uniform vec4 iMouse;
vec4 fragColor;
uniform vec2 sound;
uniform float soundFade;
uniform float soundTriggered;
uniform float fader;
uniform vec3 sColor;

//Based on https://www.shadertoy.com/view/4sK3WK by stb - thank you for your help!
// hit R to remove clear buffer and remove all voronoi, then resample by drawing with mouse.

#define t2D(o) texture2D(iChannel0, uv-(o/res))
//#define plane(p, n) 1. - abs(dot(p, n))*res.y
#define plane(p, n) smoothstep(0.0, 1.5/res.y, 1. - abs(dot(p, n))*res.y)
#define dataAt(x,y) texture2D(iChannel0, vec2(x+.5, y+.5)/res)
//#define dataAt(x,y) texture2D(iChannel0, vec2(x, y)/res)
//#define t2D(o) texture2D( iChannel0, (0.5+o) / res, -0.0 )

//void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
void main() {
    vec2 vUv_ = vUv;
    vec2 res = iResolution.xy;
    vec2 uv = gl_FragCoord.xy / res;
    vec2 p = gl_FragCoord.xy / res.y;
    vec3 o = vec3(1., -1., 0.);
    
    // cross neighborhood processing
    vec2 dirs[4];
    dirs[0] = o.xz; dirs[1] = o.yz; dirs[2] = o.zx; dirs[3] = o.zy;
    
    // current position from the buffer iChannel0
    vec2 pos = t2D(o.zz).rg;    // mouse coordinates mouse.xy stored
    
    // cell and wall
    float c, w = 0.; 
    
    // distance from center of cell to walls
    float dist = length(p-pos/res.y);
    
    
    // COLOR SETTINGS
    
    // overall cell gradients - these will have different effects
    // depending on the color effects used below
    c = pos.y*0.004;  // overall gradient
    //c = pos.y*0.003;  // overall gradient
    //c = pos.y*0.0023;  // overall gradient
    //c = pos.y*0.0015;  // overall gradient
    
    // helpfull other cell based gradients
    // c = 5. * dist; // gradient from center
    // c += 1.-step(0.005, dist); // draw cell centers    
    
    // Get texture colors
    vec4 tc;
    vec4 tc1 = texture2D(iChannel1, pos/res.xy);
    // tc1 = texture2D(iChannel1, uv); // for debugging
    vec4 tc2 = texture2D(iChannel2, pos/res.xy);

    // tc = mix(tc1,tc2,pos.x/res.x);   // mix in x-axis
    tc = mix(tc1,tc2,fader);


    
    // Make cell walls
    for(int i=0; i<4; i++) {
        vec2 iPos = t2D(dirs[i]).rg; // sampling from iChannel0 - RG 
        if(pos!=iPos)
            w = max(w, plane(p-mix(pos, iPos, .5)/res.y, normalize(pos-iPos)));
            //w = 1.-w;
    }
    
    // SOME OTHER FUN EFFECTS TO TRY OUT WHEN BLENDING
    // original color with white walls and + colored base (r,g,b)
     //vec4 col = vec4(vec3(c) * vec3(.7, .6, .5) + w , 1.);
    
    // grayscale and white walls
    // vec4 col = vec4(vec3(c) + w , 1.);
    
    // grayscale
    //vec4 col = vec4(vec3(c), 1.);
    
    // gradient on individual tiles (bump mappy look) + texture sampling (uncomment both)
    //c = (p-pos/res.y).r; // gradient from left side, or try .g from below, or res.x
    //vec4 col = vec4(vec3(c) + w , 1.) + tc;
    
    // gradient + texture sampling
    //vec4 col = vec4(vec3(c)*tc.rgb + w, 1.);
    
    // gradient + texture sampling + colored base (r,g,b)
    // vec4 col = vec4(vec3(c)*tc.rgb * vec3(.7, .6, .5) + w, 1.);

    // Soundfade in bottom 
    vec3 shade = vec3(.7, .6, .5);
    shade = shade * (soundFade) * 6.;
    if (pos.y < res.y / 6.) {             //        || pos.y > res.y - (res.y / 6.)) {
      shade = shade * soundFade *10.;
    }
    
    vec4 col = vec4(vec3(c)*tc.rgb * shade + w, 1.);

    // SOUND HARP LIGHT UP  // 20 is a good number for maxTile
    float maxTile = (iResolution.x / 100.) * 4.;
    //if (pos.x > sound.x && pos.y > sound.y && (pos.x < sound.x + dist && pos.y < sound.y + dist)) {
    if (pos.x > sound.x && pos.y > sound.y && (pos.x < sound.x + maxTile && pos.y < sound.y + maxTile)) {
      col = col + vec4(sColor,1.) * soundFade+ 0.1;
      //col = vec4(1.); // DEBUG
    }


    /*
    // turn to alpha in case of layering
    float threshold = 0.99;
    if (col.r > threshold && col.g > threshold && col.b > threshold) {
        //col.rgb= vec3(0.);
        col.a = 0.; 
    }    
    */
    

    fragColor = col;



    //  ------- SANITY CHECKS - Show whats in the buffer ------- 
    //fragColor = texture2D(iChannel0, uv);
    //fragColor = texture2D(iChannel0, vUv);

                
    //fragColor = tc; // show texture sampler
    //fragColor = vec4(texture2D(iChannel0, pos/res.xy).ba, 0, 1); // show texture sampler
    //fragColor = vec4(pos.rg, 0, 1); // show texture sampler

    // IF THESE CHECKS DON'T WORK, DATA PASSING DOESN'T WORK
    // get that red pixel at coordinate vec2(10.,10.))
    // - color half the image
    if (uv.x > 0.5) {
        //fragColor = texture2D(iChannel0, vec2(10,10.)/res);    // get red pixel 1,0,0,1 at coordinate.
        //fragColor = vec4( texture2D(iChannel0, vec2(10,10.)/res).ba,  0., 1.); // get the ba component - draws green
        //fragColor = vec4(dataAt(10.,10.));
    }
    // test position data storing
    if (uv.x > 0.5) {
        // fragColor = vec4( texture2D(iChannel0, uv/res).rgb, 1.); // base color
        //fragColor = texture2D(iChannel0, pos.xy);        // get color in position
    }
    // test mouse data storing 
    if (uv.x > 0.5) {
        //fragColor = vec4( texture2D(iChannel0, iMouse.xy).rg,  0., 1.); // 0->res Yellow
        //fragColor = vec4( texture2D(iChannel0, iMouse.xy/res)); // 0->1 sample mouse straight from texture
    }
    if (uv.x > 0.5) {
      //fragColor = vec4(soundFade, 0., 0.,1.);
      //fragColor = vec4(soundTriggered, 0., 0.,1.);
    }

    gl_FragColor = fragColor;
}
`;
const BUFFER_FINAL_FRAG = `
    uniform sampler2D iChannel0;
    uniform sampler2D iChannel1;
    varying vec2 vUv;
    
    void main() {
        vec2 uv = vUv;
        //vec2 a = texture2D(iChannel1,uv).xy;
        //gl_FragColor = vec4(texture2D(iChannel0,a).rgb,1.0);
        gl_FragColor = texture2D(iChannel0, vUv);
        
    }
`;

// ------ BUFFER APP
class App {
  constructor(inwidth, inheight, canvas) {
    this.width = inwidth;
    this.height = inheight;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.loader = new THREE.TextureLoader();
    this.mousePosition = new THREE.Vector4();
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.counter = 0;

    this.soundXY = new THREE.Vector2(0., 0.);
    this.soundFade = 1.0;
    this.soundTriggered = 0.0;
    this.iTime = 0.0;
    this.fader = 0.0;
    this.fadeTime = 0.002;
    this.timing = 51000.0; // song is 6 mins, each animal gets 51 seconds
    this.sColor = new THREE.Vector3(0., 0., 0.);
    this.takeShot = false;

    this.inputIMAGE = this.loader.load('textures/butterfly.png');
    this.inputIMAGE2 = this.loader.load('textures/bird.png');
    this.inputIMAGE3 = this.loader.load('textures/sabertooth.png');
    this.inputIMAGE4 = this.loader.load('textures/wolf.png');
    this.inputIMAGE5 = this.loader.load('textures/mammoth_alt.png');
    this.inputIMAGE6 = this.loader.load('textures/dolphin.png');
    this.inputIMAGE7 = this.loader.load('textures/turtle.png');
    this.inputIMAGE8 = this.loader.load('textures/black.png');

    document.querySelector('#screenshot').addEventListener('click', () => {
      this.takeScreenshot(this.width, this.height);
    });

    // RENDER BUFFERS
    this.targetA = new BufferManager(this.renderer, {
      width: this.width,
      height: this.height
    });
    this.targetB = new BufferManager(this.renderer, {
      width: this.width,
      height: this.height
    });
    this.targetC = new BufferManager(this.renderer, {
      width: this.width,
      height: this.height
    });
    // MOUSE
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.domElement.addEventListener('mousedown', () => {
      this.mousePosition.setZ(1);
      this.counter = 0;
    });
    this.renderer.domElement.addEventListener('mouseup', () => {
      this.mousePosition.setZ(0);
    });
    //this.renderer.domElement.addEventListener('mousemove', event => {
    this.canvas.addEventListener('mousemove', event => {
      //this.mousePosition.setX(event.clientX);
      //this.mousePosition.setY(this.height - event.clientY);
      /*
      let box = document.querySelector('div');
      let twidth = box.offsetWidth;
      let theight = box.offsetHeight;
      //console.log(twidth);
      //console.log(box);
      */
      const rect = canvas.getBoundingClientRect();
      //this.mousePosition.setX((event.clientX - rect.left) * canvas.width  / rect.width);
      //this.mousePosition.setY(((this.height - event.clientY )- rect.top ) * canvas.height / rect.height);
      this.mousePosition.setX((event.clientX - rect.left));
      this.mousePosition.setY(((this.height - event.clientY) + rect.top));
    });
  }
/*
  // needed if setting up responsive design - add in change in render buffers, targets and uniforms
  resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }
  */

  takeScreenshot(width, height) {
    // This resizing wont work with our shader, so the resolution is locked to the display ratio user is drawing at
    // set camera and renderer to desired screenshot dimension
    //this.orthoCamera.aspect = width / height;
    //orthoCamera.updateProjectionMatrix();
    //this.renderer.setSize(  width, height );
    //this.renderer.render( scene, camera, null, false );
    //this.targetC.render(this.bufferImage.scene, this.orthoCamera, true);
    //const dataURL = this.renderer.domElement.toDataURL('image/png');
    // save
    //this.saveDataURI(this.defaultFileName('.png'), dataURL);
    // reset to old dimensions (cheat version)
    //onWindowResize();
    this.takeShot = true;
  }

  dataURIToBlob(dataURI) {
    const binStr = window.atob(dataURI.split(',')[1]);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }
    return new window.Blob([arr]);
  }

  saveDataURI(name, dataURI) {
    const blob = this.dataURIToBlob(dataURI);

    // force download
    const link = document.createElement('a');
    link.download = name;
    link.href = window.URL.createObjectURL(blob);
    link.onclick = () => {
      window.setTimeout(() => {
        window.URL.revokeObjectURL(blob);
        link.removeAttribute('href');
      }, 500);

    };
    link.click();
  }

  defaultFileName(ext) {
    const str = `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}${ext}`;
    return str.replace(/\//g, '-').replace(/:/g, '.');
  }

  // set up uniforms
  start() {
    const resolution = new THREE.Vector3(this.width, this.height, window.devicePixelRatio);
    //console.log("res");
    //console.log(resolution);
    //const inputIMAGE = this.loader.load('https://res.cloudinary.com/di4jisedp/image/upload/v1523722553/wallpaper.jpg');
    this.loader.setCrossOrigin('');
    
    this.bufferA = new BufferShader(BUFFER_A_FRAG, {
      iFrame: {
        value: 0
      },
      iResolution: {
        value: resolution
      },
      iMouse: {
        value: this.mousePosition
      },
      iChannel0: {
        value: this.inputIMAGE
      },
      iChannel1: {
        value: this.inputIMAGE
      },
      sound: { value: new THREE.Vector2(0., 0.) },
      soundFade: { value: 0. },
      soundTriggered: { value: 0. }
    });
    this.bufferB = new BufferShader(BUFFER_B_FRAG, {
      iFrame: {
        value: 0
      },
      iResolution: {
        value: resolution
      },
      iMouse: {
        value: this.mousePosition
      },
      iChannel0: {
        value: this.inputIMAGE
      },
      iChannel1: {
        value: this.inputIMAGE
      },
      iChannel2: {
        value: this.inputIMAGE2
      },
      sound: { value: new THREE.Vector2(0., 0.) },
      soundFade: { value: 0. },
      soundTriggered: { value: 0. },
      fader: { value: 0. },
      sColor: { value: new THREE.Vector3(0., 0., 0.) }
    });
    this.bufferImage = new BufferShader(BUFFER_FINAL_FRAG, {
      iResolution: {
        value: resolution
      },
      iMouse: {
        value: this.mousePosition
      },
      iChannel0: {
        value: null
      },
      iChannel1: {
        value: null
      }
    });
    //this.animate();
  }

  setSound(x, y, s, sT, t, c) {
    this.soundXY.x = x;
    this.soundXY.y = y;
    this.soundFade = s;
    this.soundTriggered = sT;
    this.iTime = t;
    this.sColor = c;
    //console.log(this.soundFade);
    //console.log(this.soundXY);
    //console.log(this.soundTriggered);
  }

  // run update loop
  animate() {
    requestAnimationFrame(() => {
      this.bufferA.uniforms['sound'].value = this.soundXY;
      this.bufferA.uniforms['soundFade'].value = this.soundFade;
      this.bufferA.uniforms['soundTriggered'].value = this.soundTriggered;
      this.bufferA.uniforms['iFrame'].value = this.counter++;
      this.bufferA.uniforms['iChannel0'].value = this.targetA.readBuffer.texture;
      this.targetA.render(this.bufferA.scene, this.orthoCamera);
      this.bufferB.uniforms['sound'].value = this.soundXY;
      this.bufferB.uniforms['soundFade'].value = this.soundFade;
      this.bufferB.uniforms['soundTriggered'].value = this.soundTriggered;
      this.bufferB.uniforms['fader'].value = this.fader;
      //this.bufferB.uniforms['iChannel1'].value = this.inputIMAGE5;

      // fader starts at 0.0 inputting iChannel 1
      if (iTime < this.timing){
        this.bufferB.uniforms['iChannel1'].value = this.inputIMAGE;
        this.fader = 0.0;
      }
      if (iTime > this.timing * 1. && iTime < this.timing * 2.) {
        if (this.fader < 1.0) {
          this.fader = Math.min(1., this.fader + this.fadeTime);
          this.bufferB.uniforms['iChannel1'].value = this.inputIMAGE;
          this.bufferB.uniforms['iChannel2'].value = this.inputIMAGE2;
          //console.log("2");
        }
      }
      if (iTime > this.timing * 2. && iTime < this.timing * 3.) {
        if (this.fader > 0.0) {
          this.fader = Math.max(0., this.fader - this.fadeTime);
          this.bufferB.uniforms['iChannel1'].value = this.inputIMAGE3;
          this.bufferB.uniforms['iChannel2'].value = this.inputIMAGE2;
          //console.log("3");
        }
      }
      if (iTime > this.timing * 3. && iTime < this.timing * 4.) {
        if (this.fader < 1.0) {
          this.fader = Math.min(1., this.fader + this.fadeTime);
          this.bufferB.uniforms['iChannel1'].value = this.inputIMAGE3;
          this.bufferB.uniforms['iChannel2'].value = this.inputIMAGE4;
          //console.log("4");
        }
      }
      if (iTime > this.timing * 4. && iTime < this.timing * 5.) {
        if (this.fader > 0.0) {
          this.fader = Math.max(0., this.fader - this.fadeTime);
          this.bufferB.uniforms['iChannel1'].value = this.inputIMAGE5;
          this.bufferB.uniforms['iChannel2'].value = this.inputIMAGE4;
          //console.log("5");
        }
      }
      if (iTime > this.timing * 5. && iTime < this.timing * 6.) {
        if (this.fader < 1.0) {
          this.fader = Math.min(1., this.fader + this.fadeTime);
          this.bufferB.uniforms['iChannel1'].value = this.inputIMAGE5;
          this.bufferB.uniforms['iChannel2'].value = this.inputIMAGE6;
          //console.log("6");
        }
      }
      if (iTime > this.timing * 6. && iTime < 340000.) {
        if (this.fader > 0.0) {
          this.fader = Math.max(0., this.fader - this.fadeTime);
          this.bufferB.uniforms['iChannel1'].value = this.inputIMAGE7;
          this.bufferB.uniforms['iChannel2'].value = this.inputIMAGE6;
          //console.log("6");
        }
      }
      // FADE TO NOTHING
      //if (iTime > this.timing * 7.) {
      if (iTime > 340000.) {
        if (this.fader < 1.0) {
          this.fader = Math.min(1., this.fader + this.fadeTime);
          this.bufferB.uniforms['iChannel1'].value = this.inputIMAGE7;
          this.bufferB.uniforms['iChannel2'].value = this.inputIMAGE8;
          //sColor = sColor * new THREE.Vector3(this.fader);
          //console.log("6");
        }
      }


      this.bufferB.uniforms['sColor'].value = this.sColor;
      this.bufferB.uniforms['iFrame'].value = this.counter++;
      this.bufferB.uniforms['iChannel0'].value = this.targetA.readBuffer.texture;
      this.targetB.render(this.bufferB.scene, this.orthoCamera);
      this.bufferImage.uniforms['iChannel0'].value = this.targetB.readBuffer.texture;
      this.bufferImage.uniforms['iChannel1'].value = this.targetA.readBuffer.texture;
      this.targetC.render(this.bufferImage.scene, this.orthoCamera, true);
      //console.log(this.mousePosition);
      if (this.takeShot) {
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        // save
        this.saveDataURI(this.defaultFileName('.png'), dataURL);
        this.takeShot = false;
      }
      /*
      if (this.resizeRendererToDisplaySize(this.renderer)) {
        const canvas = this.renderer.domElement;
        //camera.aspect = canvas.clientWidth / canvas.clientHeight;
        //camera.updateProjectionMatrix();
      }
      */
    });
  }
}
// ------ SHADER HANDLING

class BufferShader {
  constructor(fragmentShader, uniforms = {}) {
    this.uniforms = uniforms;
    this.material = new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader: VERTEX_SHADER,
      uniforms
    });
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.material));
  }
}
class BufferManager {
  constructor(renderer, {
    width,
    height
  }) {
    this.renderer = renderer;
    this.readBuffer = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false
    });
    this.writeBuffer = this.readBuffer.clone();
    this.composer1;
  }
  swap() {
    const temp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = temp;
  }
  render(scene, camera, toScreen = false) {
    if (toScreen) {
      this.renderer.render(scene, camera);
      
      /*
      // With effectcomposer antialias it runs heavier and looks worse
      this.renderer.autoClear = false;
      //this.renderer.setPixelRatio( window.devicePixelRatio );
      //const pixelRatio = this.renderer.getPixelRatio();

      this.renderPass = new THREE.RenderPass( scene,camera );
      this.fxaaPass = new THREE.ShaderPass( THREE.FXAAShader );

      const canvas = document.querySelector('#c');
      let cwidth = canvas.clientWidth;
      let cheight = canvas.clientHeight;
			// this.fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( container.offsetWidth * pixelRatio );
			// this.fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( container.offsetHeight * pixelRatio );
      this.fxaaPass.material.uniforms[ 'resolution' ].value.x = 1/ cwidth;
			this.fxaaPass.material.uniforms[ 'resolution' ].value.y = 1/ cheight;
      
      this.composer1 = new THREE.EffectComposer( this.renderer);
      this.composer1.addPass(this.renderPass);
      this.composer1.addPass(this.fxaaPass);
      this.fxaaPass.renderToScreen = true;
      this.composer1.render();
      */
    } else {
      this.renderer.render(scene, camera, this.writeBuffer, true);
    }
    this.swap();
  }
}

//document.addEventListener('DOMContentLoaded', () => {
//(new App()).start();
//});


// ------ SCRIPT

const canvas = document.querySelector('#c');
let a = window.innerWidth / window.innerHeight;

let width = canvas.clientWidth;
let height = canvas.clientHeight;
//console.log('width');
//console.log(width);

// SOUND
let audio;
let analyser;
let data;
const fftSize = 64;
const file = './Audio/MFTE_ 02_Gloria_96k_24b.m4a';

// TIMING
var iTime;
var iFrame;
var startTime = Date.now();
var timeScalar = 1.;
var sound = new THREE.Vector2(1., 1.);
var last_highesti;
var soundFade = 0.;
var last_soundFade = 0.;
var last_trigger;
var triggerTiming = 10;
var soundTriggered = 0.0;

// shader color
var sColor = new THREE.Vector3(0., 0., 0);
var id = new THREE.Vector2(0, 0);
var last_highesti;
// color palette
var c1 = new THREE.Vector3(126 / 255, 161 / 255, 74 / 255);
var c2 = new THREE.Vector3(78 / 255, 165 / 255, 166 / 255);
var c3 = new THREE.Vector3(236 / 255, 115 / 255, 34 / 255);
var c4 = new THREE.Vector3(230 / 255, 180 / 255, 0 / 255);
var c5 = new THREE.Vector3(193 / 255, 62 / 255, 62 / 255);

function toggleError(button) {
  if (button.className === 'visible') {
    //alert('play!');
    button.className = '';
    button.innerHTML = 'Play';
    location.reload();
    return false;

  } else {
    //alert('reset!');
    init();
    button.className = 'visible';
    button.innerHTML = 'Reload';
  }
}

// create texture handling
let app = new App(width, height, canvas);

// random function, t is integer if 0, any other num is float
function rand(min, max, t) {
  if (t == 0) { var n = Math.floor((Math.random() * max) + min); }
  else { var n = Math.random() * max + min; }
  return n;
}

function initVars() {
  startTime = Date.now();
  var elapsedMilliseconds = Date.now() - startTime;
  //var elapsedSeconds = elapsedMilliseconds / 1000.;
  iTime = elapsedMilliseconds * timeScalar;
  iFrame = 0;
  last_trigger = 0;
}

// initiate on button press
function init() {
  //console.log('initializing');
  initVars()
  // animate();
  // app.start();
  app.fader = 0.0;
  // only start sound from a computer
  if (!isMobile()) {
    gloriaSound();
  }
}

function gloriaSound() {
  const listener = new THREE.AudioListener();
  audio = new THREE.Audio(listener);
  //console.log(file);

  //if (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) {
  const loader = new THREE.AudioLoader();
  loader.load(file, function (buffer) {
    audio.setBuffer(buffer);
    audio.play();
  });
  //}
  //else {
  // const mediaElement = new Audio(file);
  // mediaElement.loop = true;
  // mediaElement.play();
  // audio.setMediaElementSource(mediaElement);
  //}
  analyser = new THREE.AudioAnalyser(audio, fftSize);
  //console.log(analyser);
  //console.log(audio.isPlaying);
}

function analyzeAudio() {
  //console.log('updateAudio');  
  data = analyser.getFrequencyData();
  //console.log(data);


  // find highest energy frequency
  var highestf = 0;
  var highesti = 0;

  soundFade = analyser.getAverageFrequency() / 255.0; // get the average frequency of the sound
  //console.log(soundFade);
  //soundFade = 1.;
  soundFade = (soundFade + last_soundFade) / 2.;
  /*
    if (iTime % 1000 < 2) {
      console.log(data);
      //console.log(data[3]);
    }
  */

  // random new pos - further into the song, set to less tiles -> higher triggerTiming number
  soundTriggered = 0.0;
  if (iFrame > last_trigger + triggerTiming) {
    if (data[5] > 80) {
      sound.x = rand(0., width, 1);
      sound.y = rand(0., height, 1);
      last_trigger = iFrame;
      soundTriggered = 1.0;
      highesti = rand(0., 5., 0.);
      //console.log(highesti);
      if (highesti == 0) sColor = c1;
      if (highesti == 1) sColor = c2;
      if (highesti == 2) sColor = c3;
      if (highesti == 3) sColor = c4;
      else if (highesti > 3) sColor = c5;
    }
  }

  // store so we can check if it changed
  last_highesti = highesti;
  last_soundFade = soundFade;
}


function updateVars() {
  //console.log('update');
  app.setSound(sound.x, sound.y, soundFade, soundTriggered, iTime, sColor);
}

function isMobile(){
  // credit to Timothy Huang for this regex test: 
  // https://dev.to/timhuang/a-simple-way-to-detect-if-browser-is-on-a-mobile-device-with-javascript-44j3
  if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
    alert('This experience may not play on your device. Please visit on a computer.');  
    return true
 }
 else{
      return false
 }
} 

function animate() {
  requestAnimationFrame(animate);
  updateVars();
  if (analyser != null) {
    analyzeAudio();
  }
  app.animate();

  // if (iTime % 1000 < 2) {
  //   console.log(iTime);
  // }

  var elapsedMilliseconds = Date.now() - startTime;
  //var elapsedSeconds = elapsedMilliseconds / 1000.;
  iTime = elapsedMilliseconds * timeScalar;
  iFrame++;
}

// initiate before button press
initVars()
animate();
app.start();
console.log("Code by Louise Lessél, www.louiselessel.com - For Candystations, www.candystations.com - Image sampling voronoi for Gloria, Mass For The Endangered, by Sarah Kirkland Snider www.sarahkirklandsnider.com. - Based on this shader: https://www.shadertoy.com/view/WltfzB - Voronoi based on original shader https://www.shadertoy.com/view/4sK3WK by stb - Three.js code adapted from https://discourse.threejs.org/t/help-porting-shadertoy-to-threejs/2441 by milewski");
