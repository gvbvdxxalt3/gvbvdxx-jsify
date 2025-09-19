(function () {
  try {
    if (window.wavefile) {
      var WaveFile = window.wavefile.WaveFile;
    }
    const terserOptions = {
      // Top-level options
      toplevel: true, // Crucial for best size reduction
      module: true, // Treat as ES Module for better optimization

      // Compression options
      compress: {
        drop_console: true, // Remove console.* statements
        passes: 2, // Run compressor twice for better results
      },

      // Mangling options (variable/function renaming)
      mangle: true, // Enable all mangling
    };
    function debugDiv(text) {
      var div = document.createElement("div");
      div.textContent = text;
      setTimeout(() => {
        div.remove();
      }, 400);
      document.body.append(div);
    }
    //end collison script.

    var cvs = document.getElementById("scratchCanvas");
    if (!cvs) {
      window.alert("Can't find scratchCanvas!");
      return;
    }
    var cvs2 = document.createElement("canvas");
    var renderer = new window.GRender.Render(cvs, true);
    function wrapClamp(n, min, max) {
      const range = max - min + 1;
      return n - Math.floor((n - min) / range) * range;
    }
    function setMaskPositionsToMousePositions(mask) {
      mask.x = Math.round(renderer.mousePos[0]) * 2; //Sprites are scaled to 2x on collision masks, so account for the scale up.
      mask.y = Math.round(renderer.mousePos[1]) * 2;
      mask.scalex = 1;
      mask.scaley = 1;
      mask.angle = 0;
      mask.flipX = false;
      mask.flipY = false;
    }
    function warpAngle(angle) {
      return ((angle % 360) + 360) % 360; // Normalizes angle to 0–359 range
    }

    function warpDirection(direction) {
      const adjustedAngle = direction - 90; // Convert Scratch direction to angle
      return warpAngle(adjustedAngle) + 90; // Convert back to Scratch system
    }
    function showAsyncPrompt(message) {
      return new Promise((resolve) => {
        // Create a container for the dialog
        const dialog = document.createElement("div");
        dialog.style.position = "fixed";
        dialog.style.top = "50%";
        dialog.style.left = "50%";
        dialog.style.transform = "translate(-50%, -50%)";
        dialog.style.padding = "20px";
        dialog.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
        dialog.style.backgroundColor = "#fff";
        dialog.style.borderRadius = "8px";
        dialog.style.zIndex = "1000";

        // Create the message text
        const messageElem = document.createElement("p");
        messageElem.textContent = message;
        messageElem.style.marginBottom = "10px";

        // Create the input field
        const input = document.createElement("input");
        input.type = "text";
        input.style.width = "100%";
        input.style.padding = "10px";
        input.style.marginBottom = "10px";
        input.style.boxSizing = "border-box";

        // Create the submit button
        const button = document.createElement("button");
        button.textContent = "OK";
        button.style.padding = "10px 20px";
        button.style.backgroundColor = "#007BFF";
        button.style.color = "#fff";
        button.style.border = "none";
        button.style.borderRadius = "4px";
        button.style.cursor = "pointer";

        // Add elements to the dialog
        dialog.appendChild(messageElem);
        dialog.appendChild(input);
        dialog.appendChild(button);

        // Append the dialog to the document body
        document.body.appendChild(dialog);

        // Handle the button click event
        button.addEventListener("click", () => {
          resolve(input.value); // Resolve the promise with the input value
          document.body.removeChild(dialog); // Remove the dialog
        });

        // Focus on the input field when the dialog appears
        input.focus();
      });
    }
    function transformMaskToSprite(sprite, mask) {
      mask.x = sprite.x * 2;
      mask.y = sprite.y * -1 * 2;
      mask.scalex = sprite.size / 100;
      mask.scaley = sprite.size / 100;
      mask.angle = sprite.direction - 90;
      mask.flipX = false;
      mask.centerX = mask.costumeCenterX * 2;
      mask.centerY = mask.costumeCenterY * 2;
      if (sprite.rotationStyle == "left-right") {
        mask.angle = 0;
        if (sprite.getDirection() > 0) {
          mask.flipX = false;
        } else {
          mask.flipX = true;
        }
      }
      if (sprite.rotationStyle == "don't rotate") {
        mask.angle = 0;
      }
    }
    function generateMouseCollisionMask() {
      var cvs = document.createElement("canvas");
      var ctx = cvs.getContext("2d");
      cvs.width = 2;
      cvs.height = 2;

      ctx.fillStyle = "black"; //supports color hex, though you would not see anything because its just for the collision mask.
      ctx.fillRect(0, 0, 2, 2); //x,y,width,height

      var mask = new window.CollisionSprite(ctx.getImageData(0, 0, 2, 2));

      return mask;
    }
    var spriteCursorMask = generateMouseCollisionMask();
    renderer.gameScreenWidth = 480;
    renderer.gameScreenHeight = 360;
    var audioCTX = new AudioContext();

    // Function to initialize or reset the AudioContext
    function initializeAudioContext() {
      if (audioCTX.state == "running") {
        return;
      }
      if (audioCTX) {
        audioCTX.close().catch(() => {}); // Close existing context if needed
      }
      audioCTX = new AudioContext();
      console.log("AudioContext initialized.");

      // Attach the statechange event listener
      audioCTX.onstatechange = () => {
        console.log(`AudioContext state: ${audioCTX.state}`);
        if (audioCTX.state !== "running") {
          console.log("AudioContext is not running. Attempting to resume...");
          audioCTX.resume().catch((error) => {
            console.error("Failed to resume AudioContext:", error);
          });
        }
      };
    }

    // Attach event listeners for user interaction
    document.addEventListener("click", initializeAudioContext);
    document.addEventListener("keydown", initializeAudioContext);
    var maskCVS = document.createElement("canvas");
    var mctx = maskCVS.getContext("2d");
    renderer.addEventListener("mousedown", () => {
      window.JSIfy.mdown = true;
    });
    renderer.addEventListener("mouseup", () => {
      window.JSIfy.mup = false;
    });
    function tweenValues(
      obj,
      targetValues,
      duration,
      { fps = 60, onend = () => {}, ontick = () => {} } = {}
    ) {
      let stopRequested = false;
      let stopped = false;
      const interval = 1000 / fps; // Interval for FPS
      let lastTime = Date.now();

      return {
        stop: function () {
          stopRequested = true;
          stopped = true;
        },
        stopped: false,
        tween: new Promise((resolve) => {
          const startValues = {
            ...obj,
          }; // Initial object values
          const startTime = Date.now(); // Time when the tween starts

          // Function to perform the animation
          function animate() {
            if (stopRequested) return; // If stop was requested, exit the animation loop

            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1); // Calculate progress (0 to 1)

            // Update the object properties based on the progress
            for (let key in targetValues) {
              if (targetValues.hasOwnProperty(key)) {
                const start = startValues[key];
                const target = targetValues[key];
                obj[key] = start + (target - start) * progress; // Linear interpolation
              }
            }

            // Call the ontick function with the updated object and progress
            ontick(obj, progress);

            // If the progress is less than 1, continue the animation
            if (progress < 1) {
              const timeDiff = currentTime - lastTime;
              if (timeDiff >= interval) {
                lastTime = currentTime; // Update lastTime to control the frame rate
                requestAnimationFrame(animate); // Continue animation at the specified FPS
              } else {
                // If the interval isn't met, continue looping to maintain FPS
                requestAnimationFrame(animate);
              }
            } else {
              resolve(); // Resolve the promise once the animation completes
              if (!stopped) {
                onend(obj); // Call the onend function when the tween is complete
              }
            }
          }

          // Start the animation loop
          requestAnimationFrame(animate);
        }),
      };
    }
    const isNotActuallyZero = (val) => {
      if (typeof val !== "string") return false;
      for (let i = 0; i < val.length; i++) {
        const code = val.charCodeAt(i);
        // '0'.charCodeAt(0) === 48
        // '\t'.charCodeAt(0) === 9
        // We include tab for compatibility with scratch-www's broken trim() polyfill.
        // https://github.com/TurboWarp/scratch-vm/issues/115
        // https://scratch.mit.edu/projects/788261699/
        if (code === 48 || code === 9) {
          return false;
        }
      }
      return true;
    };
    class Color {
      /**
       * @typedef {object} RGBObject - An object representing a color in RGB format.
       * @property {number} r - the red component, in the range [0, 255].
       * @property {number} g - the green component, in the range [0, 255].
       * @property {number} b - the blue component, in the range [0, 255].
       */

      /**
       * @typedef {object} HSVObject - An object representing a color in HSV format.
       * @property {number} h - hue, in the range [0-359).
       * @property {number} s - saturation, in the range [0,1].
       * @property {number} v - value, in the range [0,1].
       */

      /** @type {RGBObject} */
      static get RGB_BLACK() {
        return {
          r: 0,
          g: 0,
          b: 0,
        };
      }

      /** @type {RGBObject} */
      static get RGB_WHITE() {
        return {
          r: 255,
          g: 255,
          b: 255,
        };
      }

      /**
       * Convert a Scratch decimal color to a hex string, #RRGGBB.
       * @param {number} decimal RGB color as a decimal.
       * @return {string} RGB color as #RRGGBB hex string.
       */
      static decimalToHex(decimal) {
        if (decimal < 0) {
          decimal += 0xffffff + 1;
        }
        let hex = Number(decimal).toString(16);
        hex = `#${"000000".substr(0, 6 - hex.length)}${hex}`;
        return hex;
      }

      /**
       * Convert a Scratch decimal color to an RGB color object.
       * @param {number} decimal RGB color as decimal.
       * @return {RGBObject} rgb - {r: red [0,255], g: green [0,255], b: blue [0,255]}.
       */
      static decimalToRgb(decimal) {
        const a = (decimal >> 24) & 0xff;
        const r = (decimal >> 16) & 0xff;
        const g = (decimal >> 8) & 0xff;
        const b = decimal & 0xff;
        return {
          r: r,
          g: g,
          b: b,
          a: a > 0 ? a : 255,
        };
      }

      /**
       * Convert a hex color (e.g., F00, #03F, #0033FF) to an RGB color object.
       * @param {!string} hex Hex representation of the color.
       * @return {RGBObject} null on failure, or rgb: {r: red [0,255], g: green [0,255], b: blue [0,255]}.
       */
      static hexToRgb(hex) {
        if (hex.startsWith("#")) {
          hex = hex.substring(1);
        }
        const parsed = parseInt(hex, 16);
        if (isNaN(parsed)) {
          return null;
        }
        if (hex.length === 6) {
          return {
            r: (parsed >> 16) & 0xff,
            g: (parsed >> 8) & 0xff,
            b: parsed & 0xff,
          };
        } else if (hex.length === 3) {
          const r = (parsed >> 8) & 0xf;
          const g = (parsed >> 4) & 0xf;
          const b = parsed & 0xf;
          return {
            r: (r << 4) | r,
            g: (g << 4) | g,
            b: (b << 4) | b,
          };
        }
        return null;
      }

      /**
       * Convert an RGB color object to a hex color.
       * @param {RGBObject} rgb - {r: red [0,255], g: green [0,255], b: blue [0,255]}.
       * @return {!string} Hex representation of the color.
       */
      static rgbToHex(rgb) {
        return Color.decimalToHex(Color.rgbToDecimal(rgb));
      }

      /**
       * Convert an RGB color object to a Scratch decimal color.
       * @param {RGBObject} rgb - {r: red [0,255], g: green [0,255], b: blue [0,255]}.
       * @return {!number} Number representing the color.
       */
      static rgbToDecimal(rgb) {
        return (rgb.r << 16) + (rgb.g << 8) + rgb.b;
      }

      /**
       * Convert a hex color (e.g., F00, #03F, #0033FF) to a decimal color number.
       * @param {!string} hex Hex representation of the color.
       * @return {!number} Number representing the color.
       */
      static hexToDecimal(hex) {
        return Color.rgbToDecimal(Color.hexToRgb(hex));
      }

      /**
       * Convert an HSV color to RGB format.
       * @param {HSVObject} hsv - {h: hue [0,360), s: saturation [0,1], v: value [0,1]}
       * @return {RGBObject} rgb - {r: red [0,255], g: green [0,255], b: blue [0,255]}.
       */
      static hsvToRgb(hsv) {
        let h = hsv.h % 360;
        if (h < 0) h += 360;
        const s = Math.max(0, Math.min(hsv.s, 1));
        const v = Math.max(0, Math.min(hsv.v, 1));

        const i = Math.floor(h / 60);
        const f = h / 60 - i;
        const p = v * (1 - s);
        const q = v * (1 - s * f);
        const t = v * (1 - s * (1 - f));

        let r;
        let g;
        let b;

        switch (i) {
          default:
          case 0:
            r = v;
            g = t;
            b = p;
            break;
          case 1:
            r = q;
            g = v;
            b = p;
            break;
          case 2:
            r = p;
            g = v;
            b = t;
            break;
          case 3:
            r = p;
            g = q;
            b = v;
            break;
          case 4:
            r = t;
            g = p;
            b = v;
            break;
          case 5:
            r = v;
            g = p;
            b = q;
            break;
        }

        return {
          r: Math.floor(r * 255),
          g: Math.floor(g * 255),
          b: Math.floor(b * 255),
        };
      }

      /**
       * Convert an RGB color to HSV format.
       * @param {RGBObject} rgb - {r: red [0,255], g: green [0,255], b: blue [0,255]}.
       * @return {HSVObject} hsv - {h: hue [0,360), s: saturation [0,1], v: value [0,1]}
       */
      static rgbToHsv(rgb) {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;
        const x = Math.min(Math.min(r, g), b);
        const v = Math.max(Math.max(r, g), b);

        // For grays, hue will be arbitrarily reported as zero. Otherwise, calculate
        let h = 0;
        let s = 0;
        if (x !== v) {
          const f = r === x ? g - b : g === x ? b - r : r - g;
          const i = r === x ? 3 : g === x ? 5 : 1;
          h = ((i - f / (v - x)) * 60) % 360;
          s = (v - x) / v;
        }

        return {
          h: h,
          s: s,
          v: v,
        };
      }

      /**
       * Linear interpolation between rgb0 and rgb1.
       * @param {RGBObject} rgb0 - the color corresponding to fraction1 <= 0.
       * @param {RGBObject} rgb1 - the color corresponding to fraction1 >= 1.
       * @param {number} fraction1 - the interpolation parameter. If this is 0.5, for example, mix the two colors equally.
       * @return {RGBObject} the interpolated color.
       */
      static mixRgb(rgb0, rgb1, fraction1) {
        if (fraction1 <= 0) return rgb0;
        if (fraction1 >= 1) return rgb1;
        const fraction0 = 1 - fraction1;
        return {
          r: fraction0 * rgb0.r + fraction1 * rgb1.r,
          g: fraction0 * rgb0.g + fraction1 * rgb1.g,
          b: fraction0 * rgb0.b + fraction1 * rgb1.b,
        };
      }
    }

    var cast = {
      isSafe: function (value) {
        //Is safe to convert?
        //Undefined, null, and other things that can possibly cause errors would return false.
        //Anything else like booleans, numbers, and strings would return true.
        var types = ["boolean", "number", "string"];
        for (var type of types) {
          if (typeof value == type) {
            return true;
          }
        }
        return false;
      },
      compare: function (v1, v2) {
        let n1 = Number(v1);
        let n2 = Number(v2);
        if (n1 === 0 && isNotActuallyZero(v1)) {
          n1 = NaN;
        } else if (n2 === 0 && isNotActuallyZero(v2)) {
          n2 = NaN;
        }
        if (isNaN(n1) || isNaN(n2)) {
          // At least one argument can't be converted to a number.
          // Scratch compares strings as case insensitive.
          const s1 = String(v1).toLowerCase();
          const s2 = String(v2).toLowerCase();
          if (s1 < s2) {
            return -1;
          } else if (s1 > s2) {
            return 1;
          }
          return 0;
        }
        // Handle the special case of Infinity
        if (
          (n1 === Infinity && n2 === Infinity) ||
          (n1 === -Infinity && n2 === -Infinity)
        ) {
          return 0;
        }
        // Compare as numbers.
        return n1 - n2;
      },
      toNumber: function (value) {
        // If value is already a number we don't need to coerce it with
        // Number().
        if (typeof value === "number") {
          // Scratch treats NaN as 0, when needed as a number.
          // E.g., 0 + NaN -> 0.
          if (Number.isNaN(value)) {
            return 0;
          }
          return value;
        }
        const n = Number(value);
        if (Number.isNaN(n)) {
          // Scratch treats NaN as 0, when needed as a number.
          // E.g., 0 + NaN -> 0.
          return 0;
        }
        return n;
      },
      toString: function (value) {
        if (!cast.isSafe(value)) {
          return ""; //empty string
        }

        return String(value);
      },
      toBoolean: function (value) {
        if (!cast.isSafe(value)) {
          return false;
        }

        // Already a boolean?
        if (typeof value === "boolean") {
          return value;
        }
        if (typeof value === "string") {
          // These specific strings are treated as false in Scratch.
          if (
            value === "" ||
            value === "0" ||
            value.toLowerCase() === "false"
          ) {
            return false;
          }
          // All other strings treated as true.
          return true;
        }
        // Coerce other values and numbers.
        return Boolean(value);
      },
      toRgbColorObject(value) {
        let color;
        if (typeof value === "string" && value.substring(0, 1) === "#") {
          color = Color.hexToRgb(value);

          // If the color wasn't *actually* a hex color, cast to black
          if (!color)
            color = {
              r: 0,
              g: 0,
              b: 0,
              a: 255,
            };
        } else {
          color = Color.decimalToRgb(cast.toNumber(value));
        }
        return color;
      },
      toRgbColorList(value) {
        const color = cast.toRgbColorObject(value);
        return [color.r, color.g, color.b];
      },
      getSpritePosAsTopLeftPos(width, height, x, y) {
        var sx = Math.round(x);
        var sy = Math.round(y);
        var x = renderer.xToLeft(sx, width);
        var y = renderer.yToTop(sy * -1, height);

        return {
          width: width,
          height: height,
          x: x,
          y: y,
        };
      },
    };
    var penCanvas = document.createElement("canvas");
    var penrenderer = new window.GRender.Render(penCanvas, true);
    var penContext = penCanvas.getContext("2d");
    var penSprite = new window.GRender.Sprite(0, 0, penCanvas, 480, 360);
    penCanvas.width = renderer.gameScreenWidth;
    penCanvas.height = renderer.gameScreenHeight;
    penrenderer.gameScreenWidth = penCanvas.width;
    penrenderer.gameScreenHeight = penCanvas.height;
    penSprite.width = penCanvas.width;
    penSprite.height = penCanvas.height;
    penSprite.rotateOffsetX = penSprite.width / 2;
    penSprite.rotateOffsetY = penSprite.height / 2;

    //console.log(cast.toRgbColorList(66.66));

    var pen = {
      size: 1,
      color: "rgb(0,0,66.66)",
      setColor: function (color) {
        var rgba = cast.toRgbColorObject(color);
        var color = `rgb(${rgba.r},${rgba.g},${rgba.b})`;
        pen.color = color;
        penContext.strokeStyle = pen.color;
      },
      penDown: function (sprite) {
        sprite.onPenUpdate = function (ox, oy, nx, ny) {
          //oldX,oldY,newX,newY
          if (ox == nx && oy == ny) {
            return; //No new position, no pen line drawn.
          }

          var ctx = penContext;
          var size = pen.size;
          var newPos = cast.getSpritePosAsTopLeftPos(size, size, nx, ny);
          var oldPos = cast.getSpritePosAsTopLeftPos(size, size, ox, oy);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(oldPos.x, oldPos.y);
          ctx.lineTo(newPos.x, newPos.y);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        };
      },
      stamp: function (spr) {
        try {
          var distanceX = spr.x - spr.rsprite.x;
          var distanceY = spr.y * -1 - spr.rsprite.y;
          var distanceDirection = spr.direction - spr.rsprite.direction;
          var interplotateAmount = 1;
          spr.rsprite.x = spr.x;
          spr.rsprite.y = spr.y * -1;
          if (isNaN(spr.x)) {
            //window.JSIfy.onlog(`Sprite has NAN x value`);
          }
          if (isNaN(spr.y)) {
            //window.JSIfy.onlog(`Sprite has NAN y value`);
          }
          spr.rsprite.direction = spr.direction;
          spr.rsprite.flipH = false;
          if (spr.rotationStyle == "left-right") {
            spr.rsprite.direction = 90;
            if (spr.getDirection() > 0) {
              spr.rsprite.flipH = false;
            } else {
              spr.rsprite.flipH = true;
            }
          }
          if (spr.rotationStyle == "don't rotate") {
            spr.rsprite.direction = 90;
          }
          var cosimage = spr.costume.renderimage;
          var costume = spr.costume;

          spr.rsprite.image = spr.updateSpriteEffects();
          spr.rsprite.trs = 1;
          spr.rsprite.trs -= spr.effects.ghost / 100;
          var r = 1;
          if (spr.costume.res) {
            r = spr.costume.res;
          }
          spr.rsprite.width =
            (costume.image.width * (spr.size / 100)) / spr.costume.res;
          spr.rsprite.height =
            (costume.image.height * (spr.size / 100)) / spr.costume.res;
          spr.rsprite.rotateOffsetX =
            (spr.costume.offsetx / 1) * (spr.size / 100);
          spr.rsprite.rotateOffsetY =
            (spr.costume.offsety / 1) * (spr.size / 100) * 1;
          spr.rsprite.sclayer = spr.layer;
          spr.rsprite.x = Math.round(spr.rsprite.x);
          spr.rsprite.y = Math.round(spr.rsprite.y);
          spr.rsprite.direction = Math.round(spr.rsprite.direction);

          penrenderer.drawSprite(spr.rsprite);
        } catch (e) {
          //window.alert(e);
        }
      },
      penUp: function (sprite) {
        sprite.onPenUpdate = function () {};
      },
      updateSize: function () {
        penContext.lineWidth = pen.size;
      },
      limitSize: function () {
        if (pen.size < 1) {
          //I think its the minimal, did not check scratch source so...
          pen.size = 1;
        }
      },
      setSize: function (size) {
        pen.size = cast.toString(size);
        pen.limitSize();
        pen.updateSize();
      },
      changeSize: function (size) {
        pen.size += cast.toString(size);
        pen.limitSize();
        pen.updateSize();
      },
      clear: function () {
        var cvs = penCanvas;
        var ctx = penContext;
        ctx.clearRect(0, 0, cvs.width, cvs.height);
      },
      //Plan on adding more later when I figure out HOW scratch does this stuff.
      /*setColorParam: function (p,value) {
            var param = cast.toString(p);
            if (param.toLowerCase() == "color") {
            pen.setColor(value);
            return;
            }
            },
            changeColorParam: function (p,by) {
            var param = cast.toString(p);
            if (param.toLowerCase() == "color") {
            pen.setColor(value);
            return;
            }
            },*/
    };

    window.JSIfy = {
      cloneCount: 0,
      disableRendering: false,
      maxClones: Infinity,
      debugLogs: false, //Set to true to enable debug logs, like log clones and when costumes are set, etc.
      frameSync: true, //Allows sprites to sync through things like forever loop, this can prevent some tearing in older/lower level scrolling games.
      RunningThreads: 0,
      cloudEngine: false,
      moreEffects: false,
      cloudVariables: [],
      _lastCloudValues: [],
      renderer: renderer,
      penCanvas: penCanvas,
      pen: pen,
      penSprite: penSprite,
      setStageSize: function (width, height) {
        renderer.gameScreenWidth = width;
        renderer.gameScreenHeight = height;
        penCanvas.width = width;
        penCanvas.height = height;
        penSprite.width = penCanvas.width;
        penSprite.height = penCanvas.height;
        penSprite.rotateOffsetX = penSprite.width / 2;
        penSprite.rotateOffsetY = penSprite.height / 2;
      },
      getStageSize: function () {
        return [renderer.gameScreenWidth, renderer.gameScreenHeight];
      },
      cloudEngine: null,
      checkCloudVariables: function () {
        //Check for changes in variable values and set any of them if they need to be updated.
        var cv = this.cloudVariables;
        var cl = this.cloudEngine;
        if (!cl) {
          return; //No cloud engine - do nothing.
        }
        for (var name of cv) {
          var value = this.variables[name];
          if (this._lastCloudValues[name] !== value) {
            this._lastCloudValues[name] = value;
            cl.setVariable(name, value);
          }
          var cloudValue = cl.getVariable(name);
          if (cast.isSafe(cloudValue)) {
            //Make sure that the cloud variable is at least something.
            this.variables[name] = cloudValue;
          }
        }
      },
      username: "gvbvdxx",
      setUsername: function (v) {
        this.username = v;
      },
      getMouseX: function () {
        return renderer.mousePos[0];
      },
      getMouseY: function () {
        return renderer.mousePos[1] * -1;
      },
      getStage: function () {
        for (var spr of window.JSIfy.sprites) {
          if (spr.isStage) {
            return spr;
          }
        }
        return null; //Most likley project not loaded.
      },
      getAllSpritesSorted: function (noClones, noReverse) {
        var sprites = [];
        var stage = null;
        for (var spr of this.sprites) {
          if (spr.isStage) {
            stage = spr;
          } else {
            sprites.push(spr);
            if (!noClones) {
              for (var clone of spr.clones) {
                sprites.push(clone);
              }
            }
          }
        }
        sprites = sprites.sort((a, b) => {
          return a.layer - b.layer;
        });
        if (stage) {
          sprites = [stage].concat(sprites);
        }
        if (!noReverse) {
          sprites = sprites.reverse(); //sprites are ordered in render order. (back to front) reverse to get sprite execution order (front to back).
        }
        return sprites;
      },
      findBigLayerNumber: function (ignoreLayer) {
        var big = 0;
        function check(spr) {
          if (spr.isStage) {
            return;
          }
          if (spr.layer == ignoreLayer) {
            return;
          }
          if (spr.layer > big) {
            big = spr.layer;
          }
        }
        for (var spr of window.JSIfy.sprites) {
          check(spr);
          for (var clone of spr.clones) {
            check(clone);
          }
        }
        return big;
      },
      findSmallLayerNumber: function () {
        var small = 0;
        function check(spr) {
          if (spr.isStage) {
            return;
          }
          if (spr.layer < small) {
            small = spr.layer;
          }
        }
        for (var spr of window.JSIfy.sprites) {
          check(spr);
          for (var clone of spr.clones) {
            check(clone);
          }
        }
        return small;
      },
      NumberValue: function (v) {
        return cast.toNumber(v);
        if (typeof v == "number") {
          return v;
        }
        var n = Number(v);
        if (isNaN(n)) {
          return 0;
        }
        return n;
      },
      organizeSpriteLayers: function () {
        var sprites = this.getAllSpritesSorted(false, true);
        var layerind = 0;
        for (var sprite of sprites) {
          //Stage is always first, so subtract 1.
          layerind += 1;
          sprite.layer = layerind - 1;
        }
      },
      mdown: false,
      mouseMask: generateMouseCollisionMask(),
      saveImages: [],
      project: null,
      startTime: Date.now(),
      daysSince2000: function () {
        const msPerDay = 24 * 60 * 60 * 1000;
        const start = new Date(2000, 0, 1); // Months are 0-indexed.
        const today = new Date();
        const dstAdjust = today.getTimezoneOffset() - start.getTimezoneOffset();
        let mSecsSinceStart = today.valueOf() - start.valueOf();
        mSecsSinceStart += (today.getTimezoneOffset() - dstAdjust) * 60 * 1000;
        return mSecsSinceStart / msPerDay;
      },
      curTime: 0,
      getTimer: function () {
        return this.curTime;
      },
      resetTimer: function () {
        this.startTime = Date.now();
      },
      answer: "",
      askAndWait: async function (message) {
        var response = await showAsyncPrompt(message);
        window.JSIfy.answer = response;
      },
      sprites: [],
      stopAll: function () {
        for (var spr of this.sprites) {
          function rmSprite() {
            spr.runscript = false;
            for (var s of spr.scriptRunInfo) {
              s.running = false;
              //REALLY make sure that we stop everything.
              //otherwise this might cause code running even when stopping the project
              //that is not intentional. (like the hat block workaround for scratch's stop sign)
              s.extraChecks = true;
              s.stopSign = true;
            }
            spr.scriptRunInfo = [];
            for (var t of spr.timeouts) {
              clearTimeout(t);
            }
            spr.stopAllSounds();
            spr.timeouts = [];
            for (var effectName of Object.keys(spr.effects)) {
              spr.effects[effectName] = 0;
            }
          }
          rmSprite(spr);
          for (var clonespr of spr.clones) {
            rmSprite(clonespr);
          }
          window.JSIfy.sprites.forEach((a) => {
            a.clones.forEach((b) => {
              b.deleteClone();
            });
          });
        }
      },
      onlog: function () {},
      onprogress: function () {},
      variables: {},
      lists: {},
      spriteID: 0,
      onprogress: function () {},
      ScratchSprite: class ScratchSprite {
        constructor() {
          this.x = 0;
          this.volume = 100;
          this.y = 0;
          this.direction = 90;
          this.costume = null;
          this.variables = {};
          this.lists = {};
          this.saymessage = "";
          this.timeouts = [];
          this.customBlocks = {};
          this.customBlockReporterNames = {};
          this.costumes = {};
          this.showing = true;
          this.whenIStartAsAClone = [];
          this.clones = [];
          this.blocks = [];
          this.scriptRunId = 0;
          this.scriptRunInfo = [];
          this.soundsPlaying = [];
          this.parentSprite = null;
          this.messageFunctions = {};
          this.messageThreads = {};
          this.isAClone = false;
          this.rotationStyle = "all around";
          this.soundIDCount = 0;
          window.JSIfy.spriteID += 1;
          this.id = window.JSIfy.spriteID;
          this.effects = {
            ghost: 0,
            brightness: 0,
          };
          this.effectCaps = [
            {
              name: "ghost",
              min: 0,
              max: 100,
            },
            {
              name: "brightness",
              min: -100,
              max: 100,
            },
          ];
          this.keyPressedHats = {};
          this.clickFunctions = [];
          this.runscript = false;
          this.flagHats = [];
          this.rsprite = new window.GRender.Sprite(32, 32, 32, 32, 32, 32);
          this.rspriteSpeech = new window.GRender.Sprite(
            32,
            32,
            32,
            32,
            32,
            32
          );
          this.glideTo = async function (target, speed, sinfo) {
            if (target == "_random_") {
              var tx = window.JSIfy.proAPI.random(-300, 300);
              var ty = window.JSIfy.proAPI.random(-300, 300);
              await this.glideToXY(tx, ty, speed, sinfo);
              return;
            }
            var sprite = window.JSIfy.getTarget(target);
            if (!sprite) {
              return;
            }
            await this.glideToXY(sprite.x, sprite.y, speed, sinfo);
          };
          this.costumeNumber = 0;
          this.updateEffectsNow = false;

          this.currentSpeechMessage = "";
          this.speechBubble = null;
          this._lastEffects = {};
          this._lastSize = {};
          this.onPenUpdate = function () {};
          this.effectCanvas = document.createElement("canvas");
          this.effectContext = this.effectCanvas.getContext("2d");

          this._lastPenX = this.x;
          this._lastPenY = this.y;

          this.glideToXY = async function (x, y, speed, sinfo) {
            var t = this;
            return new Promise((accept) => {
              var tween = tweenValues(
                t,
                {
                  x: x,
                  y: y,
                },
                speed * 1000,
                {
                  onend: function () {
                    accept();
                  },
                  ontick: function () {
                    if (!sinfo.running) {
                      tween.stop();
                    }
                  },
                }
              );
            });
          };
        }

        hasEffectApplied(effect) {
          if (this.effects[effect] !== 0) {
            return true;
          }
          return false;
        }

        getUpscaledSize(width, height) {
          return {
            width: renderer.scaleX * width,
            height: renderer.scaleY * height,
          };
        }

        getRenderableCostumeImage() {
          var ogImage = this.costume.image;
          var rImage = this.costume.renderimage;
          var size = this.getUpscaledSize(
            ogImage.width * (Math.round(this.size / 200) * 2),
            ogImage.height * (Math.round(this.size / 200) * 2)
          );
          size.width = Math.round(size.width);
          size.height = Math.round(size.height);
          if (size.width < ogImage.width) {
            size.width = ogImage.width;
          }
          if (size.height < ogImage.width) {
            size.height = ogImage.height;
          }
          if (!(rImage.width == size.width && rImage.height == size.height)) {
            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = false;

            canvas.width = size.width;
            canvas.height = size.height;

            ctx.drawImage(ogImage, 0, 0, canvas.width, canvas.height);

            rImage = canvas;
            this.costume.renderimage = rImage;
            return rImage;
          } else {
            return rImage;
          }
        }

        updateSpriteEffects() {
          //Returns something renderable by an Canvas2D context used for final rendering of sprite.
          var image = this.getRenderableCostumeImage();
          if (!window.JSIfy.moreEffects) {
            return image;
          }
          var useEffectCanvas = false;
          var cvs = this.effectCanvas;
          var ctx = this.effectContext;
          ctx.save();
          var applyEffects = false;
          if (this.updateEffectsNow) {
            applyEffects = true;
            this.updateEffectsNow = false;
          }
          var realSize = this.size * (renderer.scaleX / 1.3);
          if (realSize < 1) {
            realSize = 1;
          }
          if (realSize > 350) {
            //350 seems like a good limit.
            realSize = 350;
          }
          if (this._lastSize !== realSize) {
            this._lastSize = realSize;
            applyEffects = true;
          }
          if (this.hasEffectApplied("brightness")) {
            useEffectCanvas = true;
            if (this._lastEffects.brightness !== this.effects.brightness) {
              this._lastEffects.brightness = this.effects.brightness;
              applyEffects = true;
            }
          }
          if (applyEffects) {
            var scale = realSize / 100;
            var cwidth = this.costume.image.width * scale;
            var cheight = this.costume.image.height * scale;
            if (cwidth < 1) {
              cwidth = 1;
            }
            if (cheight < 1) {
              cheight = 1;
            }
            cvs.width = cwidth;
            cvs.height = cheight;
            ctx.drawImage(image, 0, 0, cvs.width, cvs.height);
            //Ghost effect is applied by main rendering script.
            //Apply brightness effect.
            if (this.effects.brightness > 100) {
              //Ensure the effect is in proper range.
              this.effects.brightness = 100;
            }
            if (this.effects.brightness < -100) {
              this.effects.brightness = -100;
            }
            var bright = this.effects.brightness / 100;
            bright += 1; //brightness 0 = normal brightness

            ctx.filter = `brightness(${bright})`;
            ctx.drawImage(cvs, 0, 0, cvs.width, cvs.height);
            ctx.filter = "";
          }
          ctx.restore();
          if (useEffectCanvas) {
            return this.effectCanvas;
          } else {
            return image;
          }
        }

        setEffect(name, value) {
          var eName = cast.toString(name);
          if (typeof this.effects[eName] !== "undefined") {
            this.effects[eName] = cast.toNumber(value);
          }
          this.fixValues();
        }

        changeEffectBy(name, value) {
          var eName = cast.toString(name);
          if (typeof this.effects[eName] !== "undefined") {
            this.effects[eName] += cast.toNumber(value);
          }
          this.fixValues();
        }

        findCustomBlock(name) {
          if (this.customBlocks[name]) {
            return this.customBlocks[name];
          } else {
            return function () {}; //return a empty function to prevent errors.
          }
        }

        joinStrings(a, b) {
          return cast.toString(a) + cast.toString(b);
        }

        callKeyPressedHats(keyName) {
          var key = cast.toString(keyName).toLowerCase();
          if (this.keyPressedHats[key]) {
            for (var funct of this.keyPressedHats[key]) {
              funct();
            }
          }
        }

        addKeyPressedFunction(keyName, func) {
          var key = cast.toString(keyName).toLowerCase();
          var running = false;
          if (!this.keyPressedHats[key]) {
            this.keyPressedHats[key] = [];
          }
          this.keyPressedHats[key].push(async function () {
            if (!running) {
              running = true;
              await func();
              running = false;
            }
          });
        }

        booleanNot(a) {
          return !cast.toBoolean(a);
        }
        booleanOr(a, b) {
          return cast.toBoolean(a) || cast.toBoolean(b);
        }
        booleanAnd(a, b) {
          return cast.toBoolean(a) && cast.toBoolean(b);
        }

        drawSpeechBubble(ctx, x, y, text) {
          const fontSize = 16;
          const lineHeight = 20;
          const padding = 15;
          const maxLineWidth = 200; // Maximum width before wrapping text
          const tailHeight = 20; // Height of the tail

          ctx.font = `${fontSize}px Arial`;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";

          const words = text.split(" ");
          const lines = [];
          let currentLine = "";

          // Word wrapping logic
          for (let word of words) {
            const testLine = currentLine + word + " ";
            const testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxLineWidth && currentLine !== "") {
              lines.push(currentLine.trim());
              currentLine = word + " ";
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine.trim());

          // Calculate bubble dimensions (without the tail)
          const bubbleWidth =
            Math.max(...lines.map((line) => ctx.measureText(line).width)) +
            padding * 2;
          const bubbleHeight = lines.length * lineHeight + padding * 2;

          // Calculate final bubble dimensions including the tail
          const finalWidth = bubbleWidth + tailHeight; // Tail adds extra width on the left
          const finalHeight = bubbleHeight + tailHeight; // Tail adds extra height below the bubble

          // Start drawing the bubble (rounded rectangle with a tail)
          const radius = 10;
          ctx.beginPath();

          // Top-left corner
          ctx.moveTo(x + radius, y);
          // Top edge
          ctx.lineTo(x + bubbleWidth - radius, y);
          // Top-right corner
          ctx.arcTo(x + bubbleWidth, y, x + bubbleWidth, y + radius, radius);
          // Right edge
          ctx.lineTo(x + bubbleWidth, y + bubbleHeight - radius);
          // Bottom-right corner
          ctx.arcTo(
            x + bubbleWidth,
            y + bubbleHeight,
            x + bubbleWidth - radius,
            y + bubbleHeight,
            radius
          );

          // Bottom-left corner
          ctx.lineTo(x + radius, y + bubbleHeight);
          // Bottom-left arc
          ctx.arcTo(x, y + bubbleHeight, x, y + bubbleHeight - radius, radius);
          // Left edge
          ctx.lineTo(x, y + radius);
          // Top-left arc
          ctx.arcTo(x, y, x + radius, y, radius);

          ctx.closePath();

          // Fill the bubble
          ctx.fillStyle = "#fff";
          ctx.fill();
          // Stroke the bubble outline
          ctx.strokeStyle = "#000";
          ctx.stroke();

          // Draw the text inside the bubble
          ctx.fillStyle = "#000";
          lines.forEach((line, i) => {
            ctx.fillText(line, x + padding, y + padding + i * lineHeight);
          });

          // Return the final width and height, including the tail
          return {
            bubbleWidth: finalWidth,
            bubbleHeight: finalHeight,
          };
        }

        setSpeechBubble(text) {
          try {
            //We only need to redraw every time its changed to something else,
            //this way we can prevent possible lag from simply using say blocks from the same text.
            if (this.currentSpeechMessage !== text) {
              this.currentSpeechMessage = text;
            } else {
              return;
            }
            if (text.length < 1) {
              this.speechBubble = null;
              return;
            }

            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");

            var size = this.drawSpeechBubble(ctx, 0, 0, text);

            canvas.width = size.bubbleWidth;
            canvas.height = size.bubbleHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            this.drawSpeechBubble(ctx, 0, 0, text);

            this.speechBubble = canvas;
          } catch (e) {
            window.alert(e);
          }
        }

        async askAndWait(message) {
          var messageString = cast.toString(message);
          await window.JSIfy.askAndWait(messageString);
        }
        addtoMessageList(funct) {
          return new Promise((accept) => {
            var obj = {
              funct: async function () {
                await funct();
                accept();
              },
            };
            window.JSIfy.messageList.push(obj);
          });
        }

        distanceTo(other) {
          if (this.isStage) {
            return 10000;
          }
          var otherSprite = window.JSIfy.getTarget(other);

          let targetX = 0;
          let targetY = 0;
          if (other === "_mouse_") {
            targetX = renderer.mousePos[0];
            targetY = renderer.mousePos[1] * -1;
          } else {
            if (!otherSprite) return 10000;
            targetX = otherSprite.x;
            targetY = otherSprite.y;
          }

          const dx = this.x - targetX;
          const dy = this.y - targetY;
          return Math.sqrt(dx * dx + dy * dy);
        }
        getListItemNumber(ListIndex, ListName) {
          var index = cast.toNumber(ListIndex);
          var indexString = cast.toString(ListIndex);
          var list = this.getList(ListName);
          if (!list) {
            return Math.round(index);
          }
          var length = list.length;
          if (indexString.toLowerCase() == "last") {
            index = length; //Very last of list.
          }
          if (indexString.toLowerCase() == "first") {
            index = 1; //Very front of list.
          }
          if (
            indexString.toLowerCase() == "random" ||
            indexString.toLowerCase() == "any"
          ) {
            return 1 + Math.floor(Math.random() * length);
          }
          return Math.round(index);
        }

        letterOf(text, number) {
          const index = cast.toNumber(number) - 1;
          const str = cast.toString(text);
          // Out of bounds?
          if (index < 0 || index >= str.length) {
            return "";
          }
          return str.charAt(index);
        }
        lengthOf(text) {
          return cast.toString(text).length;
        }
        doesContain(str1, str2) {
          const format = function (string) {
            return cast.toString(string).toLowerCase();
          };
          return format(str1).includes(format(str2));
        }

        getListString(ListName) {
          var name = cast.toString(ListName);
          var list = this.getList(name);

          if (!list) {
            //No such list exists, return an empty string.
            return "";
          }

          // Determine if the list is all single letters.
          // If it is, report contents joined together with no separator.
          // If it's not, report contents joined together with a space.
          let allSingleLetters = true;
          for (let i = 0; i < list.length; i++) {
            const listItem = cast.toString(list[i]);
            if (!(typeof listItem === "string" && listItem.length === 1)) {
              allSingleLetters = false;
              break;
            }
          }
          if (allSingleLetters) {
            return list.join("");
          }
          return list.join(" ");
        }
        addToList(ListName, AddValue) {
          var name = cast.toString(ListName);
          var list = this.getList(name);

          if (!list) {
            //No such list exists.
            return;
          }

          if (!cast.isSafe(AddValue)) {
            return;
          }

          //No need to convert, the value is a safe type.
          //It would be handled from where ever the value is being gotten from.

          list.push(AddValue);

          this.setList(ListName, list); //Make sure the list is updated.
        }
        deleteOfList(ListName, ListIndex) {
          var name = cast.toString(ListName);
          var index = this.getListItemNumber(ListIndex, ListName);
          index = Math.round(index);

          var list = this.getList(name);

          if (!list) {
            //No such list exists.
            return;
          }

          if (cast.toString(ListIndex).toLowerCase() == "all") {
            this.deleteAllOfList(ListName);
            return;
          }

          list.splice(index - 1, 1);

          this.setList(ListName, list); //Update the list.
        }
        deleteAllOfList(ListName) {
          var name = cast.toString(ListName);

          var list = this.getList(name);

          if (!list) {
            //No such list exists.
            return;
          }

          list.length = 0;

          this.setList(name, list);
        }
        insertAtList(ListName, Item, ListIndex) {
          var name = cast.toString(ListName);
          var index = this.getListItemNumber(ListIndex, ListName);
          index = Math.round(index);

          var list = this.getList(name);

          if (!list) {
            //No such list exists, exit out of function.
            return;
          }

          if (!cast.isSafe(Item)) {
            return;
          }

          if (index - 1 < 0) {
            return;
          }
          if (index - 1 > list.length) {
            return;
          }

          list.splice(index - 1, 0, Item);

          this.setList(ListName, list); //Update the list.
        }
        replaceItemOfList(ListName, ListIndex, Item) {
          var name = cast.toString(ListName);
          var index = this.getListItemNumber(ListIndex, ListName);
          index = Math.round(index);

          var list = this.getList(name);

          if (!list) {
            //No such list exists, exit out of function.
            return;
          }

          var indexString = cast.toString(ListIndex);
          //Scratch has some weird stuff where Scratch 2.0 compatibility importer
          //uses the index as a way for last and stuff.
          if (indexString.toLowerCase() == "last") {
            index = list.length; //Very last of list.
          }
          if (indexString.toLowerCase() == "first") {
            index = 1; //Very front of list.
          }

          if (!cast.isSafe(Item)) {
            return;
          }

          if (index - 1 < 0) {
            return;
          }
          if (index - 1 > list.length) {
            return;
          }

          list[index - 1] = Item;

          this.setList(ListName, list); //Update the list.
        }
        itemOfList(ListName, ListIndex) {
          var name = cast.toString(ListName);
          var index = this.getListItemNumber(ListIndex, ListName);
          index = Math.round(index);

          var list = this.getList(name);

          if (!list) {
            //No such list exists, exit out of function.
            return "";
          }

          if (index - 1 < 0) {
            return "";
          }
          if (index - 1 > list.length) {
            return "";
          }

          return list[index - 1];
        }
        itemNumberOfList(ListName, ItemValue) {
          var name = cast.toString(ListName);
          var value = cast.toString(ItemValue);
          var index = Math.round(index);

          var list = this.getList(name);

          if (!list) {
            //No such list exists, exit out of function.
            return 0;
          }

          // Go through the list items one-by-one using Cast.compare. This is for
          // cases like checking if 123 is contained in a list [4, 7, '123'] --
          // Scratch considers 123 and '123' to be equal.
          for (let i = 0; i < list.length; i++) {
            if (cast.compare(list[i], value) === 0) {
              return i + 1;
            }
          }

          // We don't bother using .indexOf() at all, because it would end up with
          // edge cases such as the index of '123' in [4, 7, 123, '123', 9].
          // If we use indexOf(), this block would return 4 instead of 3, because
          // indexOf() sees the first occurence of the string 123 as the fourth
          // item in the list. With Scratch, this would be confusing -- after all,
          // '123' and 123 look the same, so one would expect the block to say
          // that the first occurrence of '123' (or 123) to be the third item.

          // Default to 0 if there's no match. Since Scratch lists are 1-indexed,
          // we don't have to worry about this conflicting with the "this item is
          // the first value" number (in JS that is 0, but in Scratch it's 1).
          return 0;
        }
        lengthOfList(ListName) {
          var name = cast.toString(ListName);

          var list = this.getList(name);

          if (!list) {
            //No such list exists, exit out of function.
            return 0;
          }

          return list.length;
        }
        listContainsItem(ListName, Item) {
          var name = cast.toString(ListName);

          var list = this.getList(name);

          if (!list) {
            //No such list exists, exit out of function.
            return 0;
          }

          if (list.indexOf(Item) >= 0) {
            return true;
          }
          // Try using Scratch comparison operator on each item.
          // (Scratch considers the string '123' equal to the number 123).
          for (let i = 0; i < list.length; i++) {
            if (cast.compare(list[i], Item) === 0) {
              return true;
            }
          }
          return false;
        }

        startFlagHats() {
          for (var funct of this.flagHats) {
            funct();
          }
        }
        warpLayer() {
          window.JSIfy.organizeSpriteLayers();
        }
        setToFrontOrBack(mode) {
          if (typeof mode !== "string") {
            return;
          }
          if (mode.toLowerCase() == "front") {
            this.layer = Infinity;
          }
          if (mode.toLowerCase() == "back") {
            this.layer = -Infinity;
          }
          this.warpLayer();
        }
        goForwardBackLayers(FORWARDBACK, BYLAYERS) {
          var layers = cast.toNumber(BYLAYERS);
          if (FORWARDBACK.toString() == "backward") {
            this.layer -= layers;
          }
          if (FORWARDBACK.toString() == "forward") {
            this.layer += layers;
          }
          this.warpLayer();
        }
        clearEffects() {
          this.effects.ghost = 0;
        }
        addFlagFunction(flagFunction) {
          if (!this.isAClone) {
            this.flagHats.push(flagFunction);
          }
        }
        setRotationStyle(newStyle) {
          if (typeof newStyle !== "string") {
            return;
          }
          if (newStyle.toLowerCase() == "all around") {
            this.rotationStyle = "all around";
          }
          if (newStyle.toLowerCase() == "left-right") {
            this.rotationStyle = "left-right";
          }
          if (newStyle.toLowerCase() == "don't rotate") {
            this.rotationStyle = "don't rotate";
          }
        }
        doErrorHandler(error) {
          console.error(error);
        }
        doValueThing(value) {
          if (typeof value == "number") {
            return value;
          }
          try {
            var out = value;
            out = value.toString();
            out = out.toLowerCase();
            return out;
          } catch (e) {
            return value;
          }
        }
        doesEqual(v1, v2) {
          return this.doValueThing(v1) == this.doValueThing(v2);
        }
        getOtherSpriteOf(targetName, valueName, variableMode) {
          var target = window.JSIfy.getTarget(targetName);
          if (!target) {
            return 0;
          }
          if (valueName == "x position") {
            return target.x;
          }
          if (valueName == "y position") {
            return target.y;
          }
          if (valueName == "direction") {
            return target.direction;
          }
          if (valueName == "size") {
            return target.size;
          }
          if (valueName == "costume #") {
            return target.costumeNumber + 1;
          }
          if (valueName == "costume name") {
            return target.costume.name;
          }
          if (valueName == "volume") {
            return target.volume;
          }
          var value = target.getVariable(valueName, true);
          if (typeof value == "undefined") {
            return 0;
          } else {
            return value;
          }
        }
        async waitUntil(con, b, warp) {
          if (con()) {
            return; //Condition already passed.
          }
          while (!con()) {
            if (!b.running) {
              break;
            }
            await window.JSIfy.proAPI.foreverLoopAsync();
          }
        }
        addMessageFunction(msg2, funct) {
          var msg = msg2.toLowerCase();
          if (!this.messageFunctions[msg]) {
            this.messageFunctions[msg] = [];
          }
          if (!this.messageThreads[msg]) {
            this.messageThreads[msg] = [];
          }
          this.messageFunctions[msg].push(funct);
        }
        addClickFunction(funct) {
          this.clickFunctions.push(funct);
        }
        startClickHats() {
          for (var funct of this.clickFunctions) {
            funct();
          }
        }
        setStageCostume(n) {
          var stage = window.JSIfy.getStage();
          if (stage) {
            if (typeof n == "string") {
              if (n == "next backdrop") {
                this.nextStageCostume();
                return;
              }
              if (n == "previous backdrop") {
                this.backStageCostume();
                return;
              }
              if (n == "random backdrop") {
                stage.setCostumeNumber(
                  Math.round(Math.random() * Object.keys(stage.costumes).length)
                );
                return;
              }
            }
            stage.setCostume(n);
          }
        }
        nextStageCostume() {
          var stage = window.JSIfy.getStage();
          if (stage) {
            stage.changeCostumeNumber(1);
          }
        }
        backStageCostume() {
          var stage = window.JSIfy.getStage();
          if (stage) {
            stage.changeCostumeNumber(1);
          }
        }
        makeScriptInfo() {
          this.scriptRunId += 1;
          var s = {
            id: this.scriptRunId,
            running: true,
            messageThreadRemove: function () {},
          };
          this.scriptRunInfo.push(s);
          window.JSIfy.RunningThreads += 1;
          return s;
        }
        removeScriptInfo(sinfo) {
          if (!sinfo) {
            return;
          }
          setTimeout(() => {
            var scripts = [];
            for (var s of this.scriptRunInfo) {
              if (!(s.id == sinfo.id)) {
                scripts.push(s);
              } else {
                if (false) {
                  for (var thread of s.customBlockThreads) {
                    thread.running = false;
                  }
                  s.customBlockThreads = [];
                }
                s.customBlockThreads = [];
                s.running = false;
                s.messageThreadRemove();
                window.JSIfy.RunningThreads -= 1;
              }
            }
            this.scriptRunInfo = scripts;
          }, 1);
        }
        addMessageThread(msg2, sinfo) {
          var t = this;
          var msg = msg2.toLowerCase();
          if (!sinfo) {
            return;
          }
          if (!t.messageThreads[msg]) {
            t.messageThreads[msg] = [];
          }
          sinfo.messageThreadRemove = function () {
            try {
              if (!sinfo) {
                return;
              }
              var m = t.messageThreads[msg];
              var threads = [];
              if (m.customBlockThreads) {
                for (var thread of m.customBlockThreads) {
                  thread.running = false;
                }
              }
              for (var thread of m) {
                if (thread.id !== t.findFirstExecuter(sinfo).id) {
                  threads.push(thread);
                }
              }
              t.messageThreads[msg] = threads;
            } catch (e) {
              window.alert(`messageThreadRemove function failed - ${e}`);
            }
          };
          for (var m of t.messageThreads[msg]) {
            if (m) {
              m.messageThreadRemove();
              m.running = false;
            }
          }
          t.messageThreads[msg].push(sinfo);
        }
        updateMask() {
          this.direction = warpDirection(this.direction);
        }
        collisionCheck(x, y, otherMask) {}
        setSize(size) {
          this.size = cast.toNumber(size);
          this.updateMask(); //update the collision mask.
        }
        changeSize(size) {
          this.size += cast.toNumber(size);
          this.updateMask(); //update the collision mask.
        }
        getList(n) {
          if (this.lists[n]) {
            return this.lists[n];
          }
          if (window.JSIfy.lists[n]) {
            return window.JSIfy.lists[n];
          }
          //window.alert("Could not find list "+n);
        }
        setList(n, v) {
          if (this.lists[n]) {
            this.lists[n] = v;
            return;
          }
          if (window.JSIfy.lists[n]) {
            window.JSIfy.lists[n] = v;
            return;
          }
          //window.alert("Could not find list "+n);
        }
        async repeat(times, warp, funct, rs) {
          var i = 0;
          var t = window.JSIfy.NumberValue(times);
          if (isNaN(t)) {
            return;
          }
          t = Math.round(t);
          if (t < 1) {
            //should not loop because zero or negative. Should fix Paper Minecraft (by griffpatch) completley crashing when generating a world that is not flat.
            return;
          }
          while (i !== t) {
            if (!rs.running) {
              break;
            }
            if (!warp) {
              await window.JSIfy.proAPI.foreverLoopAsync();
            }
            await funct();
            i += 1;
          }
        }
        async repeatUntil(checkFunct, warp, funct, rs) {
          var i = 0;
          while (!cast.toBoolean(checkFunct())) {
            //Loop forever until the function reports true.
            if (!rs.running) {
              //But only if the script says its running.
              break;
            }
            if (!warp) {
              //Wait a frame if refresh enabled (can be disabled on custom blocks).
              await window.JSIfy.proAPI.foreverLoopAsync();
            }
            await funct();
            i += 1;
          }
        }
        async forever(warp, funct, rs) {
          var i = 0;
          while (true) {
            //Loop forever.
            if (!rs.running) {
              //But only if the script says its running.
              break;
            }
            if (!warp) {
              //Wait a frame if refresh enabled (can be disabled on custom blocks).
              await window.JSIfy.proAPI.foreverLoopAsync();
            }
            await funct();
            i += 1;
          }
        }
        cloneAudioBuffer(fromAudioBuffer) {
          const audioBuffer = new AudioBuffer({
            length: fromAudioBuffer.length,
            numberOfChannels: fromAudioBuffer.numberOfChannels,
            sampleRate: fromAudioBuffer.sampleRate,
          });
          for (
            let channelI = 0;
            channelI < audioBuffer.numberOfChannels;
            ++channelI
          ) {
            const samples = fromAudioBuffer.getChannelData(channelI);
            audioBuffer.copyToChannel(samples, channelI);
          }
          return audioBuffer;
        }
        deleteClone() {
          if (this.isAClone) {
            window.JSIfy.cloneCount -= 1;
            this.stopAllSounds();
            var newclones = [];

            for (var clone of this.parentSprite.clones) {
              if (clone) {
                if (clone.id !== this.id) {
                  newclones.push(clone);
                }
              }
            }
            this.parentSprite.clones = newclones;
            for (var th of this.scriptRunInfo) {
              th.messageThreadRemove();
              th.running = false;
            }
            this.scriptRunInfo = [];
          }
        }
        setVolume(v) {
          this.volume = cast.toNumber(v);
          this.fixValues();
          for (var s of this.soundsPlaying) {
            if (s.source) {
              s.gain.gain.value = this.volume / 100;
            }
          }
        }
        changeVolumeBy(v) {
          var newvolume = this.volume;
          newvolume += cast.toNumber(v);
          this.setVolume(newvolume);
        }
        stopSoundObject(sound) {
          if (sound.source) {
            sound.source.onended = function () {};
            sound.source.stop();
            sound.source = null;
            sound.gain = null;
          }
        }
        stopAllSounds(waitBlocksOnly) {
          for (var s of this.soundsPlaying) {
            if (waitBlocksOnly) {
              //Stop only the "play sound until done" blocks.
              if (s.untilDone) {
                this.stopSoundObject(s);
              }
            } else {
              this.stopSoundObject(s);
            }
          }
          this.soundsPlaying = [];
        }
        stopSound(n) {
          var newSoundsPlaying = [];
          for (var s of this.soundsPlaying) {
            if (s.name == n) {
              if (s.source) {
                s.source.onended = function () {};
                s.source.stop();
                s.source = null;
                s.gain = null;
              }
            } else {
              newSoundsPlaying.push(s);
            }
          }
        }
        findFirstExecuter(s) {
          function check(a) {
            if (a.parent) {
              return check(a.parent);
            } else {
              return a;
            }
          }
          return check(s);
        }
        clearJustReceived() {
          for (var scr of this.scriptRunInfo) {
            scr.justReceived = false;
          }
        }
        async stopScripts(s, scriptinfo) {
          if (s == "other scripts in sprite") {
            function stop() {
              var scr = this.findFirstExecuter(scriptinfo); //Would only effect the first executer (that is not in custom block.)
              var res = [];
              var idstocheck = [];
              function check(a) {
                idstocheck.push(a.id);
                if (a.parent) {
                  check(a.parent);
                }
              }
              check(scriptinfo);
              //window.alert(idstocheck.length);
              for (var s of this.scriptRunInfo) {
                if (idstocheck.indexOf(s.id) > -1) {
                  res.push(s);
                } else {
                  s.running = false;
                  s.messageThreadRemove();
                }
              }
              this.srunScriptInfo = res;
              //Stopping other scripts in sprite block stops sounds playing in sprite.
              this.stopAllSounds(true); //The true means to stop only the "play sound until done" blocks.
            }
            stop.bind(this)();
          }
          if (s == "this script") {
            var scr = scriptinfo;
            scr.running = false;
            this.removeScriptInfo(scr);
          }
          if (s == "all") {
            //The code is not throttled here so it would not actually stop this function.
            //Generated code is just constantly checking before each block if the thread is supposed to be running.
            this.stopScripts("other scripts in sprite", scriptinfo);
            this.stopScripts("this script", scriptinfo);
            window.JSIfy.stopAll();
          }
        }
        lookupObjectIgnoreCase(obj, name) {
          for (var key of Object.keys(obj)) {
            if (
              cast.toString(name).toLowerCase() ==
              cast.toString(key).toLowerCase()
            ) {
              return obj[key];
            }
          }
          return null;
        }
        lookupObjectKeyIgnoreCase(obj, name) {
          for (var key of Object.keys(obj)) {
            if (
              cast.toString(name).toLowerCase() ==
              cast.toString(key).toLowerCase()
            ) {
              return key;
            }
          }
          return null;
        }
        playSound(n, waitBlock) {
          var th = this;
          if (this.isAClone) {
            th = this.parentSprite; //Scratch actually uses the parent sprite (where the clone was created from) to play the clone sounds rather than the clone itself.
          }
          th.fixValues(); //Fix values to make sure volume is in valid range.
          return new Promise((a) => {
            try {
              var soundname = th.lookupObjectKeyIgnoreCase(
                th.sounds,
                cast.toString(n)
              );
              var snd = th.sounds[soundname];
              if (!snd) {
                soundname = th.soundNames[cast.toNumber(n) - 1];
              }
              if (th.sounds[soundname]) {
                th.stopSound(soundname);
                var buf = th.sounds[soundname].data;
                var source = audioCTX.createBufferSource();
                source.buffer = buf;
                var gainNode = audioCTX.createGain();
                source.connect(gainNode);
                gainNode.connect(audioCTX.destination);
                gainNode.gain.value = th.volume / 100;
                th.soundIDCount += 1;
                var soundid = th.soundIDCount;
                th.soundsPlaying.push({
                  id: soundid,
                  gain: gainNode,
                  source: source,
                  name: n,
                  untilDone: waitBlock,
                });
                if (waitBlock) {
                  source.onended = function () {
                    /*var newArray = [];
                                        for (var sound of th.soundsPlaying) {
                                        if (sound.id !== soundid) {
                                        newArray.push(sound);
                                        }
                                        }
                                        th.soundsPlaying = newArray;*/
                    a();
                  };
                } else {
                  /*var newArray = [];
                                    for (var sound of th.soundsPlaying) {
                                    if (sound.id !== soundid) {
                                    newArray.push(sound);
                                    }
                                    }
                                    th.soundsPlaying = newArray;*/
                  a();
                }
                source.start(0);
              } else {
                a();
              }
            } catch (e) {
              console.warn("Failed to play sound", e);
            }
          });
        }
        debugLog(...values) {
          //Simply allows me to enable extra debug logs, to help investigate freezes and other things.
          //All by just changing JSIfy.debugLogs to true.
          if (window.JSIfy.debugLogs) {
            console.log(...values);
          }
        }
        mod(a, b) {
          const n = a;
          const modulus = b;
          let result = n % modulus;
          // Scratch mod uses floored division instead of truncated division.
          if (result / modulus < 0) result += modulus;
          return result;
        }
        fixValues() {
          if (typeof this.x !== "number") {
            this.x = window.JSIfy.NumberValue(this.x);
          }
          if (typeof this.y !== "number") {
            this.y = window.JSIfy.NumberValue(this.y);
          }
          if (typeof this.direction !== "number") {
            this.direction = window.JSIfy.NumberValue(this.direction);
          }
          if (typeof this.size !== "number") {
            this.size = window.JSIfy.NumberValue(this.size);
          }
          if (this.size < 0) {
            this.size = 0;
          }
          if (this.volume < 0) {
            this.volume = 0;
          }
          if (this.volume > 100) {
            this.volume = 100;
          }
          this.direction = this.getDirection();
          //pen
          this.onPenUpdate(this._lastPenX, this._lastPenY, this.x, this.y);
          this._lastPenX = this.x;
          this._lastPenY = this.y;
          //effects
          for (var effectCap of this.effectCaps) {
            if (this.effects[effectCap.name] < effectCap.min) {
              this.effects[effectCap.name] = effectCap.min;
            }
            if (this.effects[effectCap.name] > effectCap.max) {
              this.effects[effectCap.name] = effectCap.max;
            }
          }
        }

        get direction() {
          return wrapClamp(this._direction, -179, 180);
        }

        set direction(v) {
          this._direction = wrapClamp(v, -179, 180);
        }

        getDirection() {
          //Expecting warped direction
          return wrapClamp(this.direction, -179, 180);
        }
        changeCostumeNumber(by) {
          this.setCostumeNumber(this.costumeNumber + by + 1); //Add one more because costumeNumber is zero indexed.
        }
        setCostumeNumber(n) {
          if (
            typeof n !== "number" &&
            typeof n !== "string" &&
            typeof n !== "boolean"
          ) {
            return;
          }
          var num = cast.toNumber(n) - 1;
          num = Math.round(num);
          var costumekeys = Object.keys(this.costumes);

          num = this.mod(num, costumekeys.length);

          if (num == this.costumeNumber) {
            return; //Already set to the costume.
          }

          this.debugLog(
            `[Sprite - ${this.name}]: (Set costume by number) Updating costume to ${n}`
          );

          var i = 0;
          var objs = Object.keys(this.costumes);
          var lastcostumenum = this.costumeNumber;
          var lastcost = this.costume;
          if (num > objs.length) {
            this.costumeNumber = 0;
          } else {
            this.costumeNumber = num;
          }
          while (i < objs.length) {
            this.costume = this.costumes[objs[i]];
            if (i == this.costumeNumber) {
              this.updateEffectsNow = true;
              return;
            }
            i += 1;
          }
          this.costume = lastcost;
          this.costumeNumber = lastcostumenum;
        }
        setCostumeName(n) {
          if (
            typeof n !== "number" &&
            typeof n !== "string" &&
            typeof n !== "boolean"
          ) {
            return;
          }
          n = cast.toString(n);

          if (this.costume.name == n) {
            return; //Already set to the costume.
          }

          this.debugLog(
            `[Sprite - ${this.name}]: (Set costume by name) Updating costume to ${n}`
          );

          var _last = this.costume;
          var _lastNum = this.costumeNumber;
          var i = 0;
          var objs = Object.keys(this.costumes);
          while (i < objs.length) {
            this.costume = this.costumes[objs[i]];
            if (objs[i] == n) {
              this.costumeNumber = i;
              this.updateEffectsNow = true;
              return;
            }
            i += 1;
          }
          this.costume = _last;
          this.costumeNumber = _lastNum;
          this.fixValues();
          this.updateMask();
        }
        xToLeft(x, width) {
          return x - 480 / -2 + width / -2;
        }
        yToTop(y, height) {
          return y * -1 - 360 / -2 + height / -2;
        }
        checkCollisionSprite(otherTarget) {
          if (!otherTarget) {
            return;
          }
          if (otherTarget.showing && this.showing) {
            if (!otherTarget.costume) {
              return false;
            }
            if (!this.costume) {
              return false;
            }
            var otherMask = otherTarget.costume.mask;
            var mask = this.costume.mask;

            if (!mask) {
              return false;
            }
            if (!otherMask) {
              return false;
            }

            transformMaskToSprite(this, mask);
            transformMaskToSprite(otherTarget, otherMask);

            return mask.collisionTest(otherMask);
          } else {
            return false;
          }
        }
        getTimeCurrent(CURMENU) {
          var thing = cast.toString(CURMENU);
          var date = new Date();
          if (thing.toLowerCase() == "year") {
            return date.getFullYear();
          }
          if (thing.toLowerCase() == "month") {
            return date.getMonth() + 1;
          }
          if (thing.toLowerCase() == "date") {
            return date.getDate();
          }
          if (thing.toLowerCase() == "dayofweek") {
            return date.getDay() + 1;
          }
          if (thing.toLowerCase() == "hour") {
            return date.getHours();
          }
          if (thing.toLowerCase() == "minute") {
            return date.getMinutes();
          }
          if (thing.toLowerCase() == "second") {
            return date.getSeconds();
          }
        }
        checkCollisionMouse() {
          var mask = this.costume.mask;
          if (!mask) {
            return false;
          }
          transformMaskToSprite(this, mask);
          setMaskPositionsToMousePositions(spriteCursorMask);

          return mask.collisionTest(spriteCursorMask);
        }
        isTouching(a) {
          if (a == "_mouse_") {
            return this.checkCollisionMouse();
          }
          var sprite = window.JSIfy.getTarget(a);
          if (!sprite) {
            return false;
          }
          var touched = this.checkCollisionSprite(sprite);
          for (var clone of sprite.clones) {
            if (this.checkCollisionSprite(clone)) {
              touched = true;
            }
          }
          return touched;
        }
        setCostume(cost) {
          try {
            if (isNaN(Number(cost))) {
              //If a string, then it would set it by the costume name.
              this.setCostumeName(cast.toString(cost));
            } else {
              if (this.costumes[cast.toString(cost)]) {
                //However though, if the costume is a number and is one of the costumes name is that number, set it to the costume name.
                this.setCostumeName(cast.toString(cost));
              } else {
                //Else, we just set it to the costume number.
                this.setCostumeNumber(cast.toNumber(cost));
              }
            }
          } catch (e) {
            window.alert(e);
          }
        }

        degrees_to_radians(degrees) {
          this.fixValues();
          var pi = Math.PI;
          return degrees * (pi / 180);
        }
        moveSteps(steps) {
          this.fixValues();
          const radians = this.degrees_to_radians(90 - this.direction);
          const dx = steps * Math.cos(radians);
          const dy = steps * Math.sin(radians);
          this.x += dx;
          this.y += dy;
          this.fixValues();
          this.updateMask(); //update the collision mask.
        }
        moveStepsSpeed(dir, steps) {
          this.fixValues();
          const radians = this.degrees_to_radians(90 - dir);
          const dx = steps * Math.cos(radians);
          const dy = steps * Math.sin(radians);
          return [dx, dy];
        }
        goTo(target) {
          if (target == "_random_") {
            this.x = window.JSIfy.proAPI.random(-300, 300);
            this.y = window.JSIfy.proAPI.random(-300, 300);
            this.updateMask(); //update the collision mask.
            return;
          }
          if (target == "_mouse_") {
            this.x = renderer.mousePos[0];
            this.y = renderer.mousePos[1] * -1;
            this.updateMask();
            return;
          }
          var sprite = window.JSIfy.getTarget(target);
          if (sprite) {
            this.x = sprite.x;
            this.y = sprite.y;
          }
          this.updateMask(); //update the collision mask.
        }
        setDirection(direction) {
          //console.log(direction);
          this.fixValues();

          this.direction = cast.toNumber(direction);
          this.fixValues();
          this.updateMask(); //update the collision mask.
        }
        tan(angle) {
          angle = angle % 360;
          switch (angle) {
            case -270:
            case 90:
              return Infinity;
            case -90:
            case 270:
              return -Infinity;
            default:
              return Math.tan((Math.PI * angle) / 180).toFixed(10);
          }
        }

        mathop(operatorv, num) {
          //window.JSIfy.onlog(operatorv);
          const operator = operatorv.toLowerCase();
          const n = window.JSIfy.NumberValue(num);
          switch (operator) {
            case "abs":
              return Math.abs(n);
            case "floor":
              return Math.floor(n);
            case "ceiling":
              return Math.ceil(n);
            case "sqrt":
              return Math.sqrt(n);
            case "sin":
              return Math.sin((Math.PI * n) / 180).toFixed(10);
            case "cos":
              return Math.cos((Math.PI * n) / 180).toFixed(10);
            case "tan":
              return this.tan(n);
            case "asin":
              return (Math.asin(n) * 180) / Math.PI;
            case "acos":
              return (Math.acos(n) * 180) / Math.PI;
            case "atan":
              return (Math.atan(n) * 180) / Math.PI;
            case "ln":
              return Math.log(n);
            case "log":
              return Math.log(n) / Math.LN10;
            case "e ^":
              return Math.exp(n);
            case "10 ^":
              return Math.pow(10, n);
          }
          return 0;
        }
        turnLeft(degrees) {
          //console.log(degrees);
          this.fixValues();
          this.direction -= cast.toNumber(degrees);
          this.fixValues();
          this.updateMask(); //update the collision mask.
        }
        turnRight(degrees) {
          //console.log(Number(degrees));
          this.fixValues();

          this.direction += cast.toNumber(degrees);
          this.fixValues();
          this.updateMask(); //update the collision mask.
        }
        createCloneOf(c) {
          if (c == "_myself_") {
            this.createClone();
            return;
          }
          window.JSIfy.getTarget(c).createClone();
        }
        getVariable(name, forceSpriteOnly) {
          if (typeof this.variables[name] !== "undefined") {
            return this.variables[name];
          }
          if (forceSpriteOnly) {
            return;
          }
          if (typeof window.JSIfy.variables[name] !== "undefiined") {
            return window.JSIfy.variables[name];
          }
        }
        setVariable(name, value, forceSpriteOnly) {
          if (typeof this.variables[name] !== "undefined") {
            this.variables[name] = value;
          }
          if (forceSpriteOnly) {
            return;
          }
          if (typeof window.JSIfy.variables[name] !== "undefiined") {
            window.JSIfy.variables[name] = value;
          }
        }
        setX(x) {
          //if (Number(x)) {
          this.fixValues();
          this.x = cast.toNumber(x);
          //} else {
          //  console.warn("NAN X: " + x);
          //}
          this.fixValues();
          this.updateMask(); //update the collision mask.
        }
        setY(y) {
          //if (Number(y)) {
          this.fixValues();
          this.y = cast.toNumber(y);
          //} else {
          //  console.warn("NAN Y: " + y);
          //}
          this.fixValues();
          this.updateMask(); //update the collision mask.
        }
        changeX(x) {
          //if (Number(x)) {
          this.fixValues();
          this.x += cast.toNumber(x);
          //} else {
          //  console.warn("NAN X: " + x);
          //}
          this.fixValues();
          this.updateMask(); //update the collision mask.
        }
        changeY(y) {
          //if (Number(y)) {
          this.fixValues();
          this.y += cast.toNumber(y);
          //} else {
          //  console.warn("NAN Y: " + y);
          //}
          this.fixValues();
          this.updateMask(); //update the collision mask.
        }
        setXY(x, y) {
          //if (Number(x)) {
          this.fixValues();
          this.x = cast.toNumber(x);
          //} else {
          //  console.warn("NAN X: " + x);
          //}
          //if (Number(y)) {
          this.y = cast.toNumber(y);
          //} else {
          //  console.warn("NAN Y: " + y);
          //}
          this.fixValues();
          this.updateMask(); //update the collision mask.
        }
        changeVariable(name, value) {
          const castedValue = cast.toNumber(
            this.getVariable(cast.toString(name))
          );
          const dValue = cast.toNumber(value);
          const newValue = castedValue + dValue;
          this.setVariable(cast.toString(name), newValue);
        }
        saySecs(msg, sec, sinfo) {
          var t = this;
          return new Promise(async (a) => {
            t.say(msg);
            await t.wait(sec, sinfo);
            t.say("");
            a();
          });
        }
        _timeoutAsync(ms) {
          return new Promise((a) => {
            setTimeout(a, ms);
          });
        }
        wait(sec, sinfo) {
          //Add sinfo to check if script was stopped and exit out early if stopped.
          var t = this;
          return new Promise((accept) => {
            var ms = Math.max(1000 / 32, 1000 * cast.toNumber(sec));
            if (ms > 0) {
              if (!sinfo.running) {
                accept();
                return;
              }
              var timeout = 0;
              var interval = setInterval(() => {
                if (!sinfo.running) {
                  accept();
                  clearTimeout(timeout);
                }
              }, 1);
              timeout = setTimeout(() => {
                clearInterval(interval);
                accept();
              }, ms);
            }
          });
        }
        say(msg) {
          this.setSpeechBubble(cast.toString(msg));
        }
        pointTowards(towards) {
          let targetX = 0;
          let targetY = 0;
          if (towards === "_mouse_") {
            targetX = renderer.mousePos[0];
            targetY = renderer.mousePos[1] * -1;
          } else if (towards === "_random_") {
            this.direction = Math.round(Math.random() * 360) - 180;
            return;
          } else {
            var spriteToPoint = window.JSIfy.getTarget(cast.toString(towards));
            if (!spriteToPoint) return;
            targetX = spriteToPoint.x;
            targetY = spriteToPoint.y;
          }

          const dx = targetX - this.x;
          const dy = targetY - this.y;
          function radToDeg(radians) {
            return radians * (180 / Math.PI);
          }
          const direction = 90 - radToDeg(Math.atan2(dy, dx));
          this.direction = direction;
        }
        onflag() {}
        createClone() {
          if (window.JSIfy.cloneCount >= window.JSIfy.maxClones) {
            return;
          }
          window.JSIfy.cloneCount += 1;
          this.debugLog(`[Sprite - ${this.name}]: Creating clone...`);
          var clone = new window.JSIfy.ScratchSprite();
          clone.x = this.x;
          clone.y = this.y;
          clone.direction = this.direction;
          var newvars = JSON.parse(JSON.stringify(this.variables));
          this.debugLog(
            `[Sprite - ${this.name}]: Sprite only variables: ${JSON.stringify(
              newvars,
              null,
              "  "
            )}`
          );
          clone.variables = newvars;
          clone.costumes = this.costumes;
          clone.costume = this.costume;
          clone.lists = JSON.parse(JSON.stringify(this.lists)); //Clone lists.
          clone.showing = this.showing;
          clone.rotationStyle = this.rotationStyle;
          clone.costumeNumber = this.costumeNumber;
          clone.isAClone = true;
          clone.size = this.size;
          clone.layer = this.layer - 1;
          clone.code = this.code;
          clone.effects = JSON.parse(JSON.stringify(this.effects));
          clone.setCostumeNumber(clone.costumeNumber + 1);
          var sprite = clone;
          if (this.isAClone) {
            clone.parentSprite = this.parentSprite;
            this.parentSprite.clones.push(clone);
            this.parentSprite.runfunct(clone);
          } else {
            clone.parentSprite = this;
            this.clones.push(clone);
            this.runfunct(clone);
          }
          clone.warpLayer();
          this.debugLog(`[Sprite - ${this.name}]: Clone created.`);
          clone.whenIStartAsAClone.forEach((c) => {
            c();
          });
        }
      },
      flag: [],
      messages: {},
      getVariable: (id, sprite) => {
        for (var v of Object.keys(this.variables)) {
          if (this.variables[v].id == id) {
            return this.variables[v].value;
          }
        }
        for (var v of Object.keys(sprite.variables)) {
          if (sprite.variables[v].id == id) {
            return sprite.variables[v].value;
          }
        }
        return null;
      },
      getTarget: function (e) {
        if (typeof e == "undefined") {
          return null;
        }
        if (typeof e == "string") {
          if (e == "_stage_" || e == "Stage") {
            return this.getStage();
          }
        }
        for (var s of this.sprites) {
          if (s.name && !s.isStage && !s.isAClone) {
            if (e.toLowerCase() == s.name.toLowerCase()) {
              return s;
            }
          }
        }
        return null;
      },
      loadImage: function (src) {
        return new Promise((resolve, reject) => {
          var image = document.createElement("img");
          image.name = "no_name";
          if (name) {
            image.name = name;
          }
          //console.log(`[GRenderer]: Loading Image ${src}`);
          image.onload = function () {
            //console.log(`[GRenderer]: Loaded Image ${src}`);
            resolve(image);
          };
          image.onerror = function () {
            //console.log(`[GRenderer]: Failed To Load Image ${src}`);
            reject("failed to load image");
          };
          image.src = src;
        });
      },
      keysPressed: {},
      frameFunctions: [],
      frameIndexNumbers: 0,
      keyInput: function (eventKey, down) {
        var key = eventKey;
        if (eventKey == " ") {
          key = "space";
        }
        if (eventKey == "ArrowLeft") {
          key = "left arrow";
        }
        if (eventKey == "ArrowRight") {
          key = "right arrow";
        }
        if (eventKey == "ArrowUp") {
          key = "up arrow";
        }
        if (eventKey == "ArrowDown") {
          key = "down arrow";
        }
        if (eventKey == "Enter") {
          key = "enter";
        }
        this.keysPressed[key] = down;
        if (down) {
          try {
            for (var sprite of this.getAllSpritesSorted()) {
              sprite.callKeyPressedHats(key);
            }
          } catch (e) {
            window.alert(e);
          }
        }
      },
      tickFrame: async function () {
        window.JSIfy.messageSentOnFrame = true;
        var functs = [];
        while (window.JSIfy.frameFunctions.length > 0) {
          var ff = window.JSIfy.frameFunctions[0];
          var funct = ff.funct;
          window.JSIfy.frameFunctions = window.JSIfy.frameFunctions.slice(1);
          functs.push(funct);
        }
        for (var funct of functs) {
          await funct();
        }
        window.JSIfy.curFrame += 1;
        //console.log(`Frame update: ${window.JSIfy.curFrame}`);
        window.JSIfy.messageSentOnFrame = false;

        window.JSIfy.callMessageSyncFlow();

        for (var funct of window.JSIfy.messageFrameDelays) {
          funct();
        }

        window.JSIfy.checkCloudVariables();

        window.JSIfy.messageFrameDelays = [];
        window.JSIfy.messagesSentPerFrame = [];
        window.JSIfy.messageFlow = []; //Used to keep the game running smoothly and flow the broadcasts correctly.
      },
      proAPI: {
        foreverLoopAsync: function (noSync) {
          return new Promise((a) => {
            /*var i = window.JSIfy.frameIndex;
            window.JSIfy.frameIndex += 1;
            window.JSIfy.frameFunctions.push({
              funct: function () {
                a();
              },
              id: i,
            });*/
            setTimeout(a, 1000 / window.JSIfy.frameRate);
          });
        },
        random: function (FROM, TO) {
          const nFrom = window.JSIfy.NumberValue(FROM);
          const nTo = window.JSIfy.NumberValue(TO);
          const low = nFrom <= nTo ? nFrom : nTo;
          const high = nFrom <= nTo ? nTo : nFrom;
          if (low === high) return low;
          // If both arguments are ints, truncate the result to an int.
          if (Number(FROM) && Number(TO)) {
            return low + Math.floor(Math.random() * (high + 1 - low));
          }
          var returnval = Math.random() * (high - low) + low;
          return returnval;
        },
        contains: function (a, b) {
          return (
            cast
              .toString(a)
              .toLowerCase()
              .indexOf(cast.toString(b).toLowerCase()) > -1
          );
        },
      },
      toNumberOrString: function (value) {
        if (!isNaN(Number(value))) {
          return Number(value);
        } else {
          try {
            return value.toLowerCase();
          } catch (e) {
            return value;
          }
        }
      },
      messagesSentPerFrame: [],
      stepsPending: [],
      curBlocksBeingExecuted: [],
      debugDiv: document.createElement("div"),
      stepFastCount: 0,
      waitForStep: function (sinfo, block, blocknum) {
        var th = this;
        return new Promise((accept) => {
          if (th.keysPressed["Shift"] && th.stepFastCount < 7000) {
            th.stepFastCount += 1;
            accept(); //If shift pressed then no step.
          } else {
            th.stepFastCount = 0;
            if (block) {
              th.curBlocksBeingExecuted.push(
                `From custom block: ${
                  sinfo.customblockname
                } Warped (Run without screen refresh): ${
                  sinfo.customblockwarped
                } Block Stack Number: ${blocknum} Opcode: ${
                  block.opcode
                } Fields: ${JSON.stringify(
                  block.fields
                )} Inputs: ${JSON.stringify(block.inputs)}`
              );
            }
            window.JSIfy.stepsPending.push(accept);
          }
        });
      },
      step: function () {
        var dediv = this.debugDiv;
        dediv.innerHTML = "";
        var div = document.createElement("div");
        div.textContent = "Currently running blocks: ";
        dediv.append(div);
        for (var blockname of this.curBlocksBeingExecuted) {
          var div = document.createElement("div");
          div.textContent = blockname;
          dediv.append(div);
        }
        this.curBlocksBeingExecuted = [];
        this.stepsPending.forEach((s) => {
          s();
        });
        this.stepsPending = [];
      },
      messageFlow: [],
      messageSyncFlow: [],
      callMessageSyncFlow: function () {
        for (var m of this.messageSyncFlow) {
          m();
        }
        this.messageSyncFlow = [];
      },
      messageSendDelay: false,
      messageSentOnFrame: false, //used for telling if broadcast sent on a frame it was sent.
      messageFrameDelays: [],
      curFrame: 0,
      sendMessage: function (messageName, sinfo) {
        var th = this;
        var debuglog = false;
        var curFrame = window.JSIfy.curFrame;
        return new Promise(function (accept) {
          (async function () {
            var messageFound = false;
            var msgrunning = 0;
            var accepted = false;
            var msg = messageName.toLowerCase();
            var functions = [];
            if (debuglog) {
              console.log(msg + " sent");
            }
            function messageCheckSprite(spr) {
              var messageFunctions = spr.messageFunctions[msg];
              if (messageFunctions) {
                for (var funct of messageFunctions) {
                  messageFound = true;
                  msgrunning += 1;
                  (async function (f) {
                    functions.push(async function () {
                      try {
                        await f();
                      } catch (e) {
                        console.error(e);
                      }
                      msgrunning -= 1;
                      if (msgrunning == 0) {
                        if (!accepted) {
                          if (debuglog) {
                            console.log(msg + " ended");
                          }
                          accepted = true;
                          accept();
                        }
                      }
                    });
                  })(funct);
                }
              }
            }
            /*if (!window.JSIfy.messageSentOnFrame) {
              if (window.JSIfy.messageSendDelay) {
                await (function () {
                  return new Promise((a) => {
                    var accepted = false;
                    function accept() {
                      if (!accepted) {
                        accepted = true;
                        a();
                      }
                    }
                    setTimeout(accept, 1);
                    window.JSIfy.messageSyncFlow.push(accept);
                  });
                })();
              }
            }*/
            /*if (th.messageFlow.indexOf(msg) < 0) {
                            th.messageFlow.push(msg);
                        } else {
                            if (!accepted) {
                                if (debuglog) {
                                    console.log(msg + " ended");
                                }
                                accepted = true;
                                accept();
                            }
                            return;
                        }*/
            /*if (window.JSIfy.messageSentOnFrame) {
              await (function () {
                return new Promise((a) => {
                  var accepted = false;
                  function accept() {
                    if (!accepted) {
                      accepted = true;
                      a();
                    }
                  }
                  window.JSIfy.messageFrameDelays.push(accept);
                });
              })();
            }*/
            for (var spr of th.getAllSpritesSorted()) {
              messageCheckSprite(spr);
            }
            for (var funct of functions) {
              funct();
            }
            if (!messageFound || msgrunning == 0) {
              if (!accepted) {
                if (debuglog) {
                  console.log(msg + " ended");
                }
                accepted = true;
                accept();
              }
            }
            function asyncTimeout(time) {
              return new Promise((accept) => {
                setTimeout(accept, time);
              });
            }
            while (!accepted) {
              await asyncTimeout(1);
              if (!sinfo.running) {
                if (!accepted) {
                  if (debuglog) {
                    console.log(msg + " ended");
                  }
                  accepted = true;
                  accept();
                }
                return;
              }
            }
            /*while (msgrunning > 1) {
                        await window.JSIfy.proAPI.foreverLoopAsync();
                        }
                        if (!accepted) {
                        accepted = true;
                        accept();
                        }*/
          })();
        });
      },
      isKeyDown: function (k) {
        if (k.toLowerCase() == "any") {
          //Where is the any key lol.
          for (var key of Object.keys(this.keysPressed)) {
            if (this.keysPressed[key]) {
              return true;
            }
          }
          return false;
        }
        if (this.keysPressed[k]) {
          return true;
        } else {
          return false;
        }
      },
      generateConstScript: function (refrence, functions) {
        var generated = "";
        for (var functname of functions) {
          generated +=
            `const ${functname.trim()} = ${refrence}.${functname.trim()}.bind(${refrence});` +
            "\n";
        }

        return generated;
      },
      genCode: function genCode(s, c) {
        var generatedCode = "";
        generatedCode += window.JSIfy.generateConstScript(
          "JSIfy",
          "stopAllSounds, sendMessage, NumberValue, getMouseX, getMouseY, isKeyDown, getTimer, resetTimer, daysSince2000, getStage".split(
            ","
          )
        );
        generatedCode += window.JSIfy.generateConstScript(
          "JSIfy.proAPI",
          "random".split(",")
        );
        generatedCode += window.JSIfy.generateConstScript(
          "sprite",
          "addMessageThread, makeScriptInfo, doErrorHandler, removeScriptInfo, addKeyPressedFunction, addClickFunction, addMessageFunction, deleteClone, say, goTo, wait, repeat, setX, setY, createCloneOf, setToFrontOrBack, clearEffects, goForwardBackLayers, saySecs, stopScripts, waitUntil, changeCostumeNumber, nextStageCostume, setCostume, setStageCostume, setSize, changeSize, glideTo, playSound, addToList, deleteOfList, deleteAllOfList, insertAtList, repeatUntil, findCustomBlock, changeEffectBy, askAndWait, setEffect, turnRight, turnLeft, addFlagFunction, replaceItemOfList, moveSteps, forever, setXY, setRotationStyle, changeVolumeBy, setVolume, pointTowards, glideToXY, getListString, setVariable, getVariable, changeVariable, changeX, changeY, setDirection, distanceTo, getTimeCurrent, mathop, booleanNot, booleanAnd, booleanOr, letterOf, joinStrings, lengthOf, doesContain, mod, doesEqual, getOtherSpriteOf, getDirection, itemOfList, itemNumberOfList, lengthOfList, listContainsItem".split(
            ","
          )
        );
        generatedCode +=
          "\nconst whenIStartAsAClone = sprite.whenIStartAsAClone;";
        var curBlock = null;
        if (s.blocks2[Object.keys(s.blocks2)[0]]) {
          var i = 0;
          function getFirstStringInArray(array) {
            for (var item of array) {
              if (typeof item == "string") {
                return item;
              }
            }
            return null;
          }
          function opperatorTypeBlock(b, op) {
            //blocks with the "rounded" and "pointy" corners (blocks that basically can't stack)
            var addedto = "";
            if (typeof b !== "undefined") {
              curBlock = b;
            }
            //window.JSIfy.onlog(b);
            try {
              if (b) {
                if (b.opcode == "operator_random") {
                  addedto += `random(${getOperators(
                    b.inputs.FROM
                  )},${getOperators(b.inputs.TO)})`;
                }
                if (b.opcode == "operator_lt") {
                  addedto += `(NumberValue(${getOperators(
                    b.inputs.OPERAND1
                  )}) < NumberValue(${getOperators(b.inputs.OPERAND2)}))`;
                }
                if (b.opcode == "sensing_answer") {
                  addedto += "window.JSIfy.answer";
                }
                if (b.opcode == "sensing_mousex") {
                  addedto += "getMouseX()";
                }
                if (b.opcode == "sensing_mousey") {
                  addedto += "getMouseY()";
                }
                if (b.opcode == "sensing_distanceto") {
                  addedto += `distanceTo(${getOperators(
                    b.inputs.DISTANCETOMENU
                  )})`;
                }
                if (b.opcode == "sensing_distancetomenu") {
                  addedto += JSON.stringify(
                    getFirstStringInArray(b.fields.DISTANCETOMENU)
                  );
                }
                if (b.opcode == "motion_pointtowards_menu") {
                  addedto += JSON.stringify(
                    getFirstStringInArray(b.fields.TOWARDS)
                  );
                }
                if (b.opcode == "sensing_current") {
                  var current = "";
                  for (var item of b.fields.CURRENTMENU) {
                    if (typeof item == "string") {
                      current = item;
                    }
                  }
                  addedto += `getTimeCurrent(${JSON.stringify(current)})`;
                }
                if (b.opcode == "operator_multiply") {
                  addedto += `(NumberValue(${getOperators(
                    b.inputs.NUM1,
                    0
                  )}) * NumberValue(${getOperators(b.inputs.NUM2, 0)}))`;
                }
                if (b.opcode == "operator_add") {
                  addedto += `(NumberValue(${getOperators(
                    b.inputs.NUM1,
                    0
                  )}) + NumberValue(${getOperators(b.inputs.NUM2, 0)}))`;
                }
                if (b.opcode == "operator_divide") {
                  addedto += `(NumberValue(${getOperators(
                    b.inputs.NUM1,
                    0
                  )}) / NumberValue(${getOperators(b.inputs.NUM2, 0)}))`;
                }
                if (b.opcode == "sensing_keypressed") {
                  addedto +=
                    "isKeyDown(" + getOperators(b.inputs["KEY_OPTION"]) + ")";
                }
                if (b.opcode == "sensing_timer") {
                  addedto += "getTimer()";
                }
                if (b.opcode == "sensing_resettimer") {
                  addedto += "resetTimer();";
                }

                if (b.opcode == "sensing_keyoptions") {
                  addedto += '"' + b.fields["KEY_OPTION"][0] + '"';
                }
                if (b.opcode == "sensing_dayssince2000") {
                  addedto += `daysSince2000()`;
                }
                if (b.opcode == "operator_gt") {
                  addedto += `(NumberValue(${getOperators(
                    b.inputs.OPERAND1
                  )}) > NumberValue(${getOperators(b.inputs.OPERAND2)}))`;
                }
                if (b.opcode == "operator_subtract") {
                  addedto += `(NumberValue(${getOperators(
                    b.inputs.NUM1
                  )}) - NumberValue(${getOperators(b.inputs.NUM2)}))`;
                }
                if (b.opcode == "operator_mathop") {
                  //window.JSIfy.onlog(b.values);
                  addedto += `mathop(("${b.fields.OPERATOR[0].toLowerCase()}"),(${getOperators(
                    b.inputs.NUM
                  )}))`;
                }
                if (b.opcode == "operator_not") {
                  addedto += `booleanNot(${getOperators(
                    b.inputs.OPERAND,
                    "false"
                  )})`;
                }
                if (b.opcode == "operator_and") {
                  addedto += `booleanAnd((${getOperators(
                    b.inputs.OPERAND1,
                    "false"
                  )}),(${getOperators(b.inputs.OPERAND2, "false")}))`;
                }
                if (b.opcode == "operator_or") {
                  addedto += `booleanOr((${getOperators(
                    b.inputs.OPERAND1,
                    "false"
                  )}),(${getOperators(b.inputs.OPERAND2, "false")}))`;
                }
                if (b.opcode == "motion_goto_menu") {
                  addedto += JSON.stringify(b.fields.TO[0]);
                }

                if (b.opcode == "motion_glideto_menu") {
                  addedto += JSON.stringify(b.fields.TO[0]);
                }
                if (b.opcode == "sensing_username") {
                  addedto += "window.JSIfy.username";
                }
                if (b.opcode == "operator_letter_of") {
                  addedto += `letterOf(${getOperators(
                    b.inputs.STRING
                  )}, ${getOperators(b.inputs.LETTER)})`;
                }
                if (b.opcode == "operator_join") {
                  addedto += `joinStrings(${getOperators(b.inputs.STRING1)},
            ${getOperators(b.inputs.STRING2)})`;
                }
                if (b.opcode == "operator_length") {
                  addedto += `lengthOf(${getOperators(b.inputs.STRING, "")})`;
                }
                if (b.opcode == "operator_contains") {
                  addedto += `doesContain(${getOperators(
                    b.inputs.STRING1,
                    ""
                  )},${getOperators(b.inputs.STRING2, "")})`;
                }
                if (b.opcode == "operator_mod") {
                  addedto += `mod(NumberValue(${getOperators(
                    b.inputs.NUM1,
                    0
                  )}),NumberValue(${getOperators(b.inputs.NUM2, 0)}))`;
                }
                if (b.opcode == "operator_round") {
                  addedto += `Math.round(NumberValue(${getOperators(
                    b.inputs.NUM,
                    0
                  )}))`;
                }
                if (b.opcode == "operator_equals") {
                  var emptyStringCode = '""';
                  addedto += `doesEqual(${getOperators(
                    b.inputs.OPERAND1,
                    emptyStringCode
                  )},${getOperators(b.inputs.OPERAND2, emptyStringCode)})`;
                }
                if (b.opcode == "sensing_of") {
                  addedto += `(getOtherSpriteOf(${getOperators(
                    b.inputs.OBJECT
                  )}, ${JSON.stringify(b.fields.PROPERTY[0])}))`;
                }

                if (b.opcode == "motion_yposition") {
                  addedto += "NumberValue(sprite.y)";
                }
                if (b.opcode == "motion_xposition") {
                  addedto += "NumberValue(sprite.x)";
                }
                if (b.opcode == "looks_size") {
                  addedto += "sprite.size";
                }
                if (b.opcode == "control_create_clone_of_menu") {
                  var v = b.fields.CLONE_OPTION[0];
                  var v2 = JSON.stringify(v);
                  addedto += v2;
                }
                if (b.opcode == "sensing_of_object_menu") {
                  var objectName = "";
                  for (var item of b.fields.OBJECT) {
                    if (typeof item == "string") {
                      objectName = item;
                    }
                  }
                  addedto += JSON.stringify(objectName);
                }
                if (b.opcode == "sensing_touchingobjectmenu") {
                  var v = b.fields.TOUCHINGOBJECTMENU[0];
                  var v2 = JSON.stringify(v);
                  addedto += v2;
                }
                if (b.opcode == "sensing_touchingobject") {
                  addedto +=
                    "sprite.isTouching(" +
                    getOperators(b.inputs.TOUCHINGOBJECTMENU) +
                    ")";
                }
                if (b.opcode == "argument_reporter_string_number") {
                  var name = s.customBlockReporterNames[b.fields.VALUE[0]];
                  //console.log(s.customBlockReporterNames);
                  addedto +=
                    "(function () {try{return values[" +
                    JSON.stringify(name) +
                    "" +
                    `];}catch(e){return "";}})()`;
                }
                if (b.opcode == "pen_menu_colorParam") {
                  var name = b.fields.colorParam[0];
                  //console.log(s.customBlockReporterNames);
                  addedto += JSON.stringify(name);
                }
                if (b.opcode == "argument_reporter_boolean") {
                  var name = s.customBlockReporterNames[b.fields.VALUE[0]];
                  //console.log(s.customBlockReporterNames);
                  addedto +=
                    "(function () {try{return values[" +
                    JSON.stringify(name) +
                    "" +
                    `];}catch(e){return "";}})()`;
                }
                if (b.opcode == "sensing_touchingcolor") {
                  addedto += "false";
                }
                if (b.opcode == "looks_costumenumbername") {
                  if (b.fields.NUMBER_NAME[0] == "number") {
                    addedto += "(sprite.costumeNumber+1)";
                  } else {
                    addedto += "sprite.costume.name";
                  }
                }
                if (b.opcode == "looks_backdropnumbername") {
                  if (b.fields.NUMBER_NAME[0] == "number") {
                    addedto += "((getStage()).costumeNumber+1)";
                  } else {
                    addedto += "(getStage()).costume.name";
                  }
                }
                if (b.opcode == "sensing_mousedown") {
                  addedto += "renderer.mouseDown";
                }
                if (b.opcode == "motion_direction") {
                  addedto += "getDirection()";
                }
                if (b.opcode == "looks_costume") {
                  addedto += JSON.stringify(b.fields.COSTUME[0]);
                }
                if (b.opcode == "looks_backdrops") {
                  addedto += JSON.stringify(b.fields.BACKDROP[0]);
                }
                if (b.opcode == "sound_sounds_menu") {
                  addedto += JSON.stringify(b.fields.SOUND_MENU[0]);
                }
                if (b.opcode == "data_itemoflist") {
                  var index = getOperators(b.inputs.INDEX, 1);
                  var list = getFirstStringInArray(b.fields.LIST);
                  addedto += `itemOfList(${JSON.stringify(list)},${index})`;
                }
                if (b.opcode == "data_itemnumoflist") {
                  var item = getOperators(b.inputs.ITEM, 1);
                  var list = getFirstStringInArray(b.fields.LIST);
                  addedto += `itemNumberOfList(${JSON.stringify(
                    list
                  )},${item})`;
                }
                if (b.opcode == "data_lengthoflist") {
                  var list = getFirstStringInArray(b.fields.LIST);
                  addedto += `lengthOfList(${JSON.stringify(list)})`;
                }
                if (b.opcode == "data_listcontainsitem") {
                  var list = getFirstStringInArray(b.fields.LIST);
                  var item = getOperators(b.inputs.ITEM, 1);
                  addedto += `listContainsItem(${JSON.stringify(
                    list
                  )}, ${item})`;
                }
                if (b.opcode == "sound_volume") {
                  addedto += "sprite.volume";
                }

                if (addedto == "") {
                  //addedto += "0";
                }

                if (addedto.length < 1) {
                  window.JSIfy.onlog(
                    "Found unknown returning block with opcode: " + b.opcode
                  );
                }

                //window.JSIfy.onlog(addedto);
              } else {
                window.JSIfy.onlog("found NULL block.");
                //throw new Error("NULL BLOCK");
              }
            } catch (e) {
              console.error(
                "Failed on opperatorTypeBlock function. current block = ",
                curBlock,
                " b = ",
                b,
                " op = ",
                op,
                " error = ",
                e
              );
            }
            return addedto;
          }
          function getOperators(op, valueWhenNoOperator) {
            var oper = "";

            //console.log(op);
            try {
              try {
                if (typeof op == "undefined") {
                  if (typeof valueWhenNoOperator !== "undefined") {
                    return valueWhenNoOperator;
                  }
                  console.warn(
                    "getOperators function found undefined operator block. returning empty string. current block = ",
                    curBlock
                  );
                  return "";
                }

                if (op[0] == 1) {
                  //operator block type input
                  //console.log(op[1]);
                  if (s.blocks2[op[1]]) {
                    oper += opperatorTypeBlock(s.blocks2[op[1]], "");
                    return oper;
                  }
                }
                if (op[0] == 3) {
                  //operator block type input
                  //console.log(op[1]);
                  //window.JSIfy.onlog(s.blocks2[op[1]]);
                  if (s.blocks2[op[1]]) {
                    oper += opperatorTypeBlock(s.blocks2[op[1]], "");
                    return oper;
                  }
                }
                if (op[0] == 2) {
                  //operator block type input
                  //console.log(op[1]);
                  if (s.blocks2[op[1]]) {
                    oper += opperatorTypeBlock(s.blocks2[op[1]], "");
                    return oper;
                  }
                }
                if (op[0] == 10) {
                  //window.JSIfy.onlog(`Found operator type 10: ${JSON.stringify(op)}`);
                }

                //window.JSIfy.onlog(`Found an unknown operator type: ${JSON.stringify(op)}`);
              } catch (e) {
                console.error(
                  "Failed on getOperators function. current block = ",
                  curBlock,
                  " op = ",
                  op,
                  " error = ",
                  e
                );
                window.JSIfy.onlog(e);
              }
            } catch (e) {
              console.warn("failed to do step 1:\n", e);
              console.log("failed to do step 1, doing step 2...");
            }
            try {
              if (JSON.stringify(op[1]) == "null") {
                //IDK how else to detect null without using not operator (so if conditions can pass through).
                if (typeof valueWhenNoOperator !== "undefined") {
                  return valueWhenNoOperator;
                }
                console.warn(
                  "getOperators function found null operator input. returning empty string. current block = ",
                  curBlock + " op = " + JSON.stringify(op)
                );
                return "";
              }
              if (op[1][0] == 12) {
                //variable type input.
                oper += `getVariable(${JSON.stringify(op[1][1])})`;
                return oper;
              }
              if (op[1][0] == 13) {
                //list type input.
                oper += `getListString(${JSON.stringify(op[1][1])})`;
                return oper;
              }
              if (op[1][0] == 10) {
                //string type input.
                oper += JSON.stringify(op[1][1]);
                return oper;
              }
              if (op[1][0] == 4) {
                //string type input????? im not sure.
                oper += JSON.stringify(op[1][1]);
                return oper;
              }
              if (op[1][0] == 5) {
                //number type input????? im not sure....
                oper += JSON.stringify(op[1][1]);
                return oper;
              }
              if (op[1][0] == 6) {
                //number type input????? im not sure....
                oper += JSON.stringify(op[1][1]);
                return oper;
              }
              if (op[1][0] == 8) {
                //direction (number) type input????? im not sure....
                oper += JSON.stringify(op[1][1]);
                return oper;
              }
              if (op[1][0] == 11) {
                //message type input
                oper += JSON.stringify(op[1][1]);
                return oper;
              }
              if (op[1][0] == 7) {
                //message type input
                oper += JSON.stringify(op[1][1]);
                return oper;
              }
              if (op[1][0] == 9) {
                //pen type input
                oper += JSON.stringify(op[1][1]);
                return oper;
              }
            } catch (e) {
              console.warn(
                "Unexpected error while translating scratch to JS value",
                e,
                curBlock,
                op
              );
              oper += `""`;
            }

            if (oper == "") {
              if (typeof valueWhenNoOperator !== "undefined") {
                return valueWhenNoOperator;
              }
            }

            return oper;
          }
          var messageHatCounter = 0;
          var blockFromStackCounter = 1;
          function addScriptStopHandler(isExtra, b) {
            if (window.JSIfy.debugStepper) {
              if (b) {
                generatedCode +=
                  "\ntry{if(sinfo){await window.JSIfy.waitForStep(sinfo," +
                  JSON.stringify(b) +
                  ", " +
                  JSON.stringify(blockFromStackCounter) +
                  ");}}catch(e){}\n";
              }
            }
            if (isExtra) {
              generatedCode +=
                "\n" +
                "try{if(sinfo){if (sinfo.stopSign){sinfo.running = false;sprite.removeScriptInfo(sinfo);return;}if(sinfo.parent){if (sinfo.parent.stopSign){sinfo.parent.running = false;sprite.removeScriptInfo(sinfo.parent);return;}}}}catch(e){}" +
                "\n";
            } else {
              generatedCode +=
                "\n" +
                "try{if(sinfo){if (!sinfo.running){sprite.removeScriptInfo(sinfo);return;}if(sinfo.parent){if (!sinfo.parent.running){sprite.removeScriptInfo(sinfo.parent);return;}}}}catch(e){}" +
                "\n";
            }
          }

          function readBlock(b, warp, nosinfo) {
            try {
              if (b) {
                if (typeof b !== "undefined") {
                  curBlock = b;
                }
                if (typeof generatedCode !== "string") {
                  window.alert(JSON.stringify(curBlock));
                  throw new Error("Code unexpectedly became undefined.");
                }
                var isSinfoIgnoreBlock = b.opcode == "event_broadcast";
                //if (isSinfoIgnoreBlock) {
                //addScriptStopHandler(true, b);
                //} else {
                //addScriptStopHandler(false, b);
                //}
                blockFromStackCounter += 1;
                //console.log(b,b.next);
                if (b.opcode == "motion_glidesecstoxy") {
                  addScriptStopHandler();
                  generatedCode +=
                    "\n" +
                    `await glideToXY(${getOperators(b.inputs.X)},${getOperators(
                      b.inputs.Y
                    )},${getOperators(b.inputs.SECS)},sinfo);`;
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_pointtowards") {
                  generatedCode +=
                    "\n" +
                    `await pointTowards(${getOperators(b.inputs.TOWARDS)});`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "sound_setvolumeto") {
                  generatedCode +=
                    "\n" + `setVolume(${getOperators(b.inputs.VOLUME)});`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "sound_changevolumeby") {
                  generatedCode +=
                    "\n" + `changeVolumeBy(${getOperators(b.inputs.VOLUME)});`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_setrotationstyle") {
                  var field = "";
                  for (var item of b.fields.STYLE) {
                    if (typeof item == "string") {
                      field = item;
                    }
                  }
                  generatedCode +=
                    "\nsetRotationStyle(" + JSON.stringify(field) + ");\n";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_gotofrontback") {
                  var field = "";
                  for (var item of b.fields["FRONT_BACK"]) {
                    if (typeof item == "string") {
                      field = item;
                    }
                  }
                  generatedCode += "\n" + "setToFrontOrBack(";
                  generatedCode += JSON.stringify(field);
                  generatedCode += ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_cleargraphiceffects") {
                  generatedCode += "\n" + "clearEffects();";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_goforwardbackwardlayers") {
                  var field = "";
                  for (var item of b.fields["FORWARD_BACKWARD"]) {
                    if (typeof item == "string") {
                      field = item;
                    }
                  }
                  generatedCode += "\n" + "goForwardBackLayers(";
                  generatedCode +=
                    JSON.stringify(field) + ", " + getOperators(b.inputs.NUM);
                  generatedCode += ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_sayforsecs") {
                  addScriptStopHandler();
                  generatedCode += "\n" + "await saySecs(";
                  generatedCode += getOperators(b.inputs.MESSAGE) + ",";
                  generatedCode += "" + getOperators(b.inputs.SECS);
                  generatedCode += "\n" + ", sinfo);";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "control_stop") {
                  generatedCode +=
                    "\n" +
                    `await stopScripts("${b.fields.STOP_OPTION[0]}",sinfo);`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "control_wait_until") {
                  addScriptStopHandler();
                  generatedCode +=
                    "\n" +
                    `await waitUntil(function(){return ${getOperators(
                      b.inputs.CONDITION,
                      false
                    )};},sinfo,${warp} || warpenabled);`;
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }

                if (b.opcode == "sound_stopallsounds") {
                  generatedCode += "\n" + `stopAllSounds();`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_nextcostume") {
                  generatedCode += "\n" + `changeCostumeNumber(1);`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_nextbackdrop") {
                  generatedCode += "\n" + `nextStageCostume(1);`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_switchcostumeto") {
                  generatedCode +=
                    "\n" + `setCostume(${getOperators(b.inputs.COSTUME)});`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_switchbackdropto") {
                  generatedCode +=
                    "\n" +
                    `setStageCostume(${getOperators(b.inputs.BACKDROP)});`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_setsizeto") {
                  generatedCode +=
                    "\n" + `setSize(${getOperators(b.inputs.SIZE)});`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_changesizeby") {
                  generatedCode +=
                    "\n" + `changeSize(${getOperators(b.inputs.CHANGE)});`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_glideto") {
                  addScriptStopHandler();
                  generatedCode +=
                    "\n" +
                    `await glideTo(${getOperators(b.inputs.TO)},${getOperators(
                      b.inputs.SECS
                    )},sinfo)`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "event_broadcast") {
                  generatedCode +=
                    "\nsendMessage(" +
                    getOperators(b.inputs.BROADCAST_INPUT, "''") +
                    ",sinfo)";
                  var disablesinfocheck = false;
                  var bnext = s.blocks2[b.next];
                  if (bnext) {
                    if (
                      bnext.opcode == "event_broadcast" ||
                      bnext.opcode == "event_broadcastandwait"
                    ) {
                      disablesinfocheck = true;
                    }
                  }
                  readBlock(s.blocks2[b.next], warp, disablesinfocheck);
                  return;
                }
                if (b.opcode == "event_broadcastandwait") {
                  addScriptStopHandler();
                  generatedCode +=
                    "\nawait sendMessage(" +
                    getOperators(b.inputs.BROADCAST_INPUT, "''") +
                    ", sinfo)";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next]);
                  return;
                }
                if (b.opcode == "sound_play") {
                  generatedCode +=
                    "\n" +
                    `playSound(${getOperators(b.inputs.SOUND_MENU)}, false)` +
                    "\n";
                  readBlock(s.blocks2[b.next]);
                  return;
                }
                if (b.opcode == "sound_playuntildone") {
                  addScriptStopHandler();
                  generatedCode +=
                    "\n" +
                    `await playSound(${getOperators(
                      b.inputs.SOUND_MENU
                    )}, true)` +
                    "\n";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next]);
                  return;
                }
                if (b.opcode == "event_whenkeypressed") {
                  blockFromStackCounter = 0;
                  messageHatCounter += 1; //Lazily just use the hat counter that was for messages.
                  var id = messageHatCounter;
                  var threadEncodedString = JSON.stringify(
                    "_thread_keypress_" + id
                  );

                  generatedCode +=
                    "\n" +
                    "addKeyPressedFunction(" +
                    JSON.stringify(getFirstStringInArray(b.fields.KEY_OPTION)) +
                    ",async function (){\n";
                  generatedCode +=
                    "\n" +
                    "const sinfo = makeScriptInfo();addMessageThread(" +
                    threadEncodedString +
                    ",sinfo);var warpenabled = false;";
                  generatedCode += "\n" + "try{";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next]);
                  generatedCode += "\n" + "}catch(e){doErrorHandler(e);}";
                  generatedCode += "\n" + "removeScriptInfo(sinfo);";
                  generatedCode += "\n});";
                  return;
                }
                if (b.opcode == "event_whenthisspriteclicked") {
                  blockFromStackCounter = 0;
                  messageHatCounter += 1; //Lazily just use the hat counter that was for messages.
                  var id = messageHatCounter;
                  var threadEncodedString = JSON.stringify(
                    "_thread_click_" + id
                  );
                  generatedCode +=
                    "\n" + "addClickFunction(async function (){\n";
                  generatedCode +=
                    "\n" +
                    "const sinfo = makeScriptInfo();addMessageThread(" +
                    threadEncodedString +
                    ",sinfo);";
                  generatedCode += "\n" + "try{";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next]);
                  generatedCode += "\n" + "}catch(e){doErrorHandler(e);}";
                  generatedCode += "\n" + "removeScriptInfo(sinfo);";
                  generatedCode += "\n});";
                  return;
                }
                if (b.opcode == "event_whenbroadcastreceived") {
                  blockFromStackCounter = 0;
                  var messageName = b.fields["BROADCAST_OPTION"][0];
                  var messageEncodedString = JSON.stringify(messageName);
                  messageHatCounter += 1;
                  var mId = messageHatCounter;
                  var messageBlockEncodedString = JSON.stringify(
                    messageName + "_thread_" + mId
                  );
                  generatedCode +=
                    "\n" +
                    "addMessageFunction(" +
                    messageEncodedString +
                    ",async function (){\n";
                  generatedCode +=
                    "\n" +
                    "const sinfo = makeScriptInfo();addMessageThread(" +
                    messageBlockEncodedString +
                    ",sinfo);var warpenabled = false;sinfo.justReceived = true;setTimeout(() => {sinfo.justReceived = false;},1);";
                  generatedCode += "\n" + "try{";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next]);
                  generatedCode += "\n" + "}catch(e){doErrorHandler(e);}";
                  generatedCode += "\n" + "removeScriptInfo(sinfo);";
                  generatedCode += "\n});";
                  return;
                }
                if (b.opcode == "control_create_clone_of") {
                  var v = getOperators(b.inputs.CLONE_OPTION);
                  //console.log(v);
                  generatedCode += "\ncreateCloneOf(" + v + ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_hide") {
                  generatedCode += "\n" + `sprite.showing = false;`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_show") {
                  generatedCode += "\n" + `sprite.showing = true;`;

                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "control_start_as_clone") {
                  generatedCode +=
                    "\n" + "whenIStartAsAClone.push(async function () {";
                  generatedCode +=
                    "\n" +
                    "const sinfo = makeScriptInfo();var warpenabled = false;";
                  generatedCode += "\n" + "try{";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], false);
                  generatedCode += "\n" + "}catch(e){doErrorHandler(e);}";
                  generatedCode += "\n" + "removeScriptInfo(sinfo);";
                  generatedCode += "});";
                  return;
                }
                if (b.opcode == "control_delete_this_clone") {
                  generatedCode += "\n" + "deleteClone(sinfo);";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_glidesecstoxy") {
                  addScriptStopHandler();
                  generatedCode +=
                    "\n" +
                    `await glideToXY(${getOperators(b.inputs.X)},${getOperators(
                      b.inputs.Y
                    )},${getOperators(b.inputs.SECS)})`;
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_say") {
                  generatedCode += "\n" + "await say(";
                  generatedCode += getOperators(
                    b.inputs.MESSAGE,
                    JSON.stringify("")
                  );
                  generatedCode += "" + ");\n";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_think") {
                  generatedCode += "\n" + "await say(";
                  generatedCode += getOperators(
                    b.inputs.MESSAGE,
                    JSON.stringify("")
                  );
                  generatedCode += "" + ");\n";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_goto") {
                  generatedCode += "\n" + "await goTo(";
                  generatedCode += getOperators(b.inputs.TO);
                  generatedCode += "" + ");\n";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "control_wait") {
                  addScriptStopHandler();
                  generatedCode += "\n" + "await wait(";
                  generatedCode += getOperators(b.inputs.DURATION);
                  generatedCode += "" + ",sinfo);\n";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "control_repeat") {
                  addScriptStopHandler();
                  generatedCode +=
                    "\nawait repeat(" +
                    getOperators(b.inputs.TIMES, 0) +
                    "," +
                    warp +
                    " || warpenabled,async function () {try{";
                  if (b.inputs.SUBSTACK) {
                    readBlock(s.blocks2[b.inputs.SUBSTACK[1]], warp);
                  }
                  generatedCode += "}catch(e){doErrorHandler(e);}\n},sinfo);";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_sety") {
                  generatedCode += "\nsetY(" + getOperators(b.inputs.Y) + ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_setx") {
                  generatedCode += "\nsetX(" + getOperators(b.inputs.X) + ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "pen_setPenColorToColor") {
                  generatedCode += "\n";
                  generatedCode +=
                    "pen.setColor(" +
                    getOperators(b.inputs.COLOR, "#000") +
                    ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "pen_setPenColorParamTo") {
                  generatedCode += "\n";
                  generatedCode +=
                    "pen.setColorParam(" +
                    getOperators(b.inputs.COLOR_PARAM, JSON.stringify("")) +
                    ", " +
                    getOperators(b.inputs.VALUE, "0") +
                    ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "pen_changePenColorParamBy") {
                  generatedCode += "\n";
                  generatedCode +=
                    "pen.changeColorParam(" +
                    getOperators(b.inputs.COLOR_PARAM, JSON.stringify("")) +
                    ", " +
                    getOperators(b.inputs.VALUE, "0") +
                    ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "pen_clear") {
                  generatedCode += "\n";
                  generatedCode += "pen.clear();";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "pen_penDown") {
                  generatedCode += "\n";
                  generatedCode += "pen.penDown(sprite);";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "pen_stamp") {
                  generatedCode += "\n";
                  generatedCode += "pen.stamp(sprite);";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "pen_penUp") {
                  generatedCode += "\n";
                  generatedCode += "pen.penUp(sprite);";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "pen_setPenSizeTo") {
                  generatedCode += "\n";
                  generatedCode +=
                    "pen.setSize(" + getOperators(b.inputs.SIZE, 1) + ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "pen_changePenSizeBy") {
                  generatedCode += "\n";
                  generatedCode +=
                    "pen.changeSize(" + getOperators(b.inputs.SIZE, 1) + ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "data_changevariableby") {
                  generatedCode +=
                    "\n" +
                    `changeVariable("${b.fields.VARIABLE[0]
                      .replaceAll('"', '\\"')
                      .replaceAll(
                        "\\",
                        "\\\\"
                      )}",window.JSIfy.NumberValue(${getOperators(
                      b.inputs.VALUE
                    )}));`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "data_addtolist") {
                  var list = getFirstStringInArray(b.fields.LIST);
                  var item = getOperators(b.inputs.ITEM, "");
                  generatedCode +=
                    "\n" + `addToList(${JSON.stringify(list)},${item});`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "data_deleteoflist") {
                  var list = getFirstStringInArray(b.fields.LIST);
                  var index = getOperators(b.inputs.INDEX, 1);
                  generatedCode +=
                    "\n" + `deleteOfList(${JSON.stringify(list)},${index});`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "data_deletealloflist") {
                  var list = getFirstStringInArray(b.fields.LIST);
                  generatedCode +=
                    "\n" + `deleteAllOfList(${JSON.stringify(list)});`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "data_insertatlist") {
                  var list = getFirstStringInArray(b.fields.LIST);
                  var item = getOperators(b.inputs.ITEM, 1);
                  var index = getOperators(b.inputs.INDEX, 1);
                  generatedCode +=
                    "\n" +
                    `insertAtList(${JSON.stringify(list)}, ${item}, ${index});`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "data_replaceitemoflist") {
                  var list = getFirstStringInArray(b.fields.LIST);
                  var item = getOperators(b.inputs.ITEM, 1);
                  var index = getOperators(b.inputs.INDEX, 1);
                  generatedCode +=
                    "\n" +
                    `replaceItemOfList(${JSON.stringify(
                      list
                    )}, ${index}, ${item});`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_movesteps") {
                  generatedCode +=
                    "\n" +
                    `moveSteps(window.JSIfy.NumberValue(${getOperators(
                      b.inputs.STEPS
                    )}));`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "control_forever") {
                  addScriptStopHandler();
                  generatedCode +=
                    "await forever(" +
                    warp +
                    " || warpenabled, async function () {";
                  addScriptStopHandler();
                  if (b.inputs.SUBSTACK) {
                    readBlock(s.blocks2[b.inputs.SUBSTACK[1]], warp);
                  }
                  generatedCode += "\n},sinfo);";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_gotoxy") {
                  generatedCode += "\nsetXY(";
                  generatedCode += getOperators(b.inputs.X);
                  generatedCode += ",";
                  generatedCode += getOperators(b.inputs.Y);
                  generatedCode += ");\n";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "control_repeat_until") {
                  addScriptStopHandler();
                  generatedCode +=
                    "\nawait repeatUntil(" +
                    `(function () {return ${getOperators(
                      b.inputs.CONDITION,
                      false
                    )};})` +
                    "," +
                    warp +
                    " || warpenabled,async function () {try{";
                  if (b.inputs.SUBSTACK) {
                    readBlock(s.blocks2[b.inputs.SUBSTACK[1]], warp);
                  }
                  generatedCode +=
                    "}catch(e){sprite.doErrorHandler(e);}\n},sinfo);";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_changeyby") {
                  generatedCode += "\nchangeY(";
                  generatedCode += getOperators(b.inputs.DY);
                  generatedCode += ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_changexby") {
                  generatedCode += "\nsprite.changeX(";
                  generatedCode += getOperators(b.inputs.DX);
                  generatedCode += ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }

                if (b.opcode == "data_setvariableto") {
                  generatedCode += "\nsetVariable(";
                  generatedCode +=
                    `"${b.fields.VARIABLE[0]
                      .replaceAll('"', '\\"')
                      .replaceAll("\\", "\\\\")}"` + ",";
                  generatedCode += getOperators(b.inputs.VALUE);
                  generatedCode += ");\n";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "control_if") {
                  //Dummies sometimes forget to put things in the block, causing unexpected errors in this block here.
                  //The fix is just to simply do nothing and don't put any code (since it would not execute at all).
                  if (b.inputs.CONDITION) {
                    generatedCode += "\n" + "if (";
                    generatedCode += getOperators(b.inputs.CONDITION, "false"); //Forgot the inputs can be empty.
                    generatedCode += ") {";
                    if (b.inputs.SUBSTACK) {
                      readBlock(s.blocks2[b.inputs.SUBSTACK[1]], warp);
                    }
                    generatedCode += "\n}";
                  }
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "control_if_else") {
                  if (b.inputs.SUBSTACK) {
                    generatedCode += "\n" + "if (";
                    generatedCode += getOperators(b.inputs.CONDITION, "false");
                    generatedCode += ") {";
                    if (b.inputs.SUBSTACK) {
                      readBlock(s.blocks2[b.inputs.SUBSTACK[1]], warp);
                    }
                    generatedCode += "\n} else {";
                  }
                  if (b.inputs.SUBSTACK2) {
                    readBlock(s.blocks2[b.inputs.SUBSTACK2[1]], warp);
                  }
                  if (b.inputs.SUBSTACK) {
                    generatedCode += "\n}";
                  }
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "procedures_call") {
                  var values = {};
                  var vtoName = {};
                  for (var v of JSON.parse(
                    '{"values":' + b.mutation.argumentids + "}"
                  ).values) {
                    values[v] = "0";
                  }
                  var i = 0;
                  for (var input of Object.keys(b.inputs)) {
                    if (b.inputs[input]) {
                      if (b.inputs[input][1] !== null) {
                        var code = getOperators(b.inputs[input]);
                        values[input] = code;
                      }
                    } else {
                      /*console.log(
                                            values,
                                            input,
                                            values[input],
                                            b.inputs,
                                            b.inputs[values[input]]
                                            );*/
                      console.warn(`Found Null INPUT Value:`, values[input]);
                    }
                    i += 1;
                  }
                  var generated = "{";
                  for (var id of Object.keys(values)) {
                    generated += JSON.stringify(id);
                    generated += ": ";
                    generated += "(" + values[id] + ")";
                    generated += ",";
                  }
                  generated += "}";
                  addScriptStopHandler();
                  var c =
                    "\n" +
                    "await findCustomBlock(" +
                    JSON.stringify(b.mutation.proccode) +
                    ")(" +
                    generated +
                    ",warpenabled, sinfo);";
                  generatedCode += c;
                  addScriptStopHandler();
                  //console.log(c);
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_pointindirection") {
                  generatedCode +=
                    "\n" + `setDirection(${getOperators(b.inputs.DIRECTION)})`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_changeeffectby") {
                  generatedCode +=
                    "\nchangeEffectBy(" +
                    JSON.stringify(b.fields.EFFECT[0].toLowerCase()) +
                    "," +
                    getOperators(b.inputs.CHANGE) +
                    ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "sensing_askandwait") {
                  addScriptStopHandler();
                  generatedCode +=
                    "\nawait await askAndWait(" +
                    getOperators(b.inputs.QUESTION, JSON.stringify("")) +
                    ",sinfo);";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "looks_seteffectto") {
                  generatedCode +=
                    "\nsetEffect(" +
                    JSON.stringify(b.fields.EFFECT[0].toLowerCase()) +
                    "," +
                    getOperators(b.inputs.VALUE) +
                    ");";
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_turnright") {
                  generatedCode +=
                    "\n" + `turnRight(${getOperators(b.inputs.DEGREES)})`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "motion_turnleft") {
                  generatedCode +=
                    "\n" + `turnLeft(${getOperators(b.inputs.DEGREES)})`;
                  readBlock(s.blocks2[b.next], warp);
                  return;
                }
                if (b.opcode == "procedures_definition") {
                  blockFromStackCounter = 0;
                  var problock = s.blocks2[b.inputs.custom_block[1]];
                  var warped = false;
                  if (cast.toBoolean(problock.mutation.warp)) {
                    warped = true;
                  }
                  var v = {
                    v: problock.mutation.proccode
                      .replaceAll('"', '\\"')
                      .replaceAll("\\", "\\\\"),
                  };

                  var e = JSON.parse(
                    '{"values":' + problock.mutation.argumentnames + "}"
                  ).values;
                  var n = JSON.parse(
                    '{"values":' + problock.mutation.argumentids + "}"
                  ).values;
                  var i = 0;
                  while (i < e.length) {
                    s.customBlockReporterNames[e[i]] = n[i];
                    i += 1;
                  }
                  var procodeid = JSON.stringify(problock.mutation.proccode);
                  generatedCode +=
                    "\nsprite.customBlocks[" +
                    procodeid +
                    "] = async function (values,forceWarp,originalSinfo) {try{";
                  if (warped) {
                    generatedCode += "\n" + "var warpenabled = true;";
                  } else {
                    generatedCode +=
                      "\n" + "if (forceWarp) {var warpenabled = true;}";
                  }
                  //generatedCode +=
                  //"if (!warpenabled){await window.JSIfy.proAPI.foreverLoopAsync();}";
                  generatedCode +=
                    "\n" +
                    "const sinfo = sprite.makeScriptInfo();sinfo.parent = originalSinfo;var firstExecuter = sprite.findFirstExecuter(sinfo);if (!firstExecuter.customBlockThreads){firstExecuter.customBlockThreads = [];}firstExecuter.customBlockThreads.push(sinfo);if (sinfo.customblockname){sinfo.customblockname += ' => ' + " +
                    procodeid +
                    ";} else {sinfo.customblockname = " +
                    procodeid +
                    ";}sinfo.customblockwarped = warpenabled;sinfo.usewarp = warpenabled;";
                  addScriptStopHandler();
                  readBlock(s.blocks2[b.next], warped);
                  generatedCode += "\n" + "sprite.removeScriptInfo(sinfo);";
                  generatedCode += "\n}catch(e){sprite.doErrorHandler(e);}};";

                  return;
                }
                if (b.opcode == "event_whenflagclicked") {
                  blockFromStackCounter = 0;
                  var isheadblock = false;
                  var next = s.blocks2[b.next];
                  if (next) {
                    if (next.opcode == "event_whenflagclicked") {
                      isheadblock = true;
                    }
                    if (!isheadblock) {
                      generatedCode +=
                        "\naddFlagFunction(async function () {if (!sprite.isAClone) {try{";
                      generatedCode +=
                        "\n" +
                        "const sinfo = sprite.makeScriptInfo();\nvar warpenabled = false;";
                    }
                    addScriptStopHandler();
                    readBlock(s.blocks2[b.next], warp);
                    if (!isheadblock) {
                      generatedCode += "\n" + "sprite.removeScriptInfo(sinfo);";
                      generatedCode +=
                        "\n}catch(e){sprite.doErrorHandler(e);}}});";
                    }
                  }
                  return;
                }
                window.JSIfy.onlog(
                  "skipping block since its unknown. opcode: " + b.opcode
                );
                readBlock(s.blocks2[b.next], warp);
                return;
              }
            } catch (e) {
              console.error(e);
            }
          }
          for (var b of Object.keys(s.blocks2)) {
            var bl = s.blocks2[b];
            if (
              /*Add hat/starter blocks here*/
              bl.opcode == "event_whenflagclicked" ||
              bl.opcode == "procedures_definition" ||
              bl.opcode == "control_start_as_clone" ||
              bl.opcode == "event_whenbroadcastreceived" ||
              bl.opcode == "event_whenthisspriteclicked" ||
              bl.opcode == "event_whenkeypressed"
            ) {
              readBlock(bl);
            }
          }
        }
        return (
          "(async function (sprite){\nsprite.runscript = true;\nvar warpenabled = false;\n" +
          generatedCode +
          "\n})"
        );
      },
      stopAllSounds: function () {
        for (var sprite of this.sprites) {
          sprite.stopAllSounds();
        }
      },
      greenFlag: function () {
        window.JSIfy.stopAll();
        var t = this;
        var i = 0;
        t.running = true;

        window.JSIfy.resetTimer();

        for (var spr of this.getAllSpritesSorted()) {
          spr.startFlagHats();
        }
      },
      loadProject: async function (arrayBuffer) {
        try {
          this.cloudVariables = [];
          var collisionCanvas = document.createElement("canvas");
          var collisionContext = collisionCanvas.getContext("2d");
          this.onlog("Decoding zip/sb3 file...");
          var zip = await window.JSZip.loadAsync(arrayBuffer);
          this.sprites = [];
          this.onlog("Parsing project's JSON data...");
          this.project = JSON.parse(
            await zip.files["project.json"].async("text")
          );
          var savedblocks = {};

          /*for (var target of this.project.targets) {
                    for (var b of Object.keys(target.blocks)) {
                    var block = target.blocks[b];
                    savedblocks[b] = block;
                    }
                    }*/
          this.onlog("Counting required assets...");
          var assets = 0;
          for (var t of this.project.targets) {
            assets += t.costumes.length;
            assets += t.sounds.length;
          }
          var loadp = 0;
          window.JSIfy.onprogress(0, assets);
          this.onlog("Loading sprites...");
          this.project.targets.reverse().forEach(async (target) => {
            if (target.isStage) {
              this.onlog(
                "Loading stage sprite... (Yes, the stage is considered a sprite)"
              );
            } else {
              this.onlog("Loading sprite " + target.name + "...");
            }
            var sprite = new this.ScratchSprite();
            sprite.layer = 0;
            sprite.isStage = target.isStage;
            sprite.showing = true;
            if (!target.isStage) {
              sprite.x = target.x;
              sprite.y = target.y;
              sprite.direction = target.direction;
              sprite.rotationStyle = target.rotationStyle;
              sprite.layer = target.layerOrder;
              sprite.showing = target.visible;
              sprite.size = target.size;
              sprite.name = target.name;
            } else {
              sprite.x = 0;
              sprite.y = 0;
              sprite.direction = 90;
              sprite.rotationStyle = "don't rotate";
              sprite.layer = -Infinity;
              sprite.showing = true;
              sprite.size = 100;
              sprite.name = "Stage";
            }
            sprite.blocks = [];
            sprite.blocks2 = target.blocks;
            sprite.clones = [];
            for (var msg of Object.keys(target.broadcasts)) {
              window.JSIfy.messages[target.broadcasts[msg]] = [];
            }
            sprite.sounds = {};
            async function decodeAudioFromArrayBuffer(arrayBuffer) {
              if (!window.AudioDecoder) {
                throw new Error(
                  "WebCodecs AudioDecoder is not supported in this browser."
                );
              }

              const audioContext = audioCTX; // For creating the final AudioBuffer

              return new Promise((resolve, reject) => {
                const audioDecoder = new AudioDecoder({
                  output: async (audioData) => {
                    try {
                      const audioBuffer = await convertAudioDataToAudioBuffer(
                        audioData,
                        audioContext
                      );
                      resolve(audioBuffer);
                    } catch (error) {
                      reject(error);
                    }
                  },
                  error: (err) =>
                    reject(new Error(`AudioDecoder error: ${err.message}`)),
                });

                // Attempt to configure the decoder
                try {
                  audioDecoder.configure({
                    codec: "pcm",
                  }); // PCM is common for WAV
                } catch (err) {
                  reject(
                    new Error(
                      "AudioDecoder could not be configured. Unsupported codec."
                    )
                  );
                  return;
                }

                // Decode the WAV data
                const chunk = new EncodedAudioChunk({
                  timestamp: 0,
                  type: "key", // WAV data uses keyframes
                  data: new Uint8Array(arrayBuffer),
                });

                audioDecoder.decode(chunk);
              });
            }

            async function convertAudioDataToAudioBuffer(
              audioData,
              audioContext
            ) {
              const { numberOfChannels, sampleRate, format, numberOfFrames } =
                audioData;

              if (format !== "f32-planar") {
                throw new Error(`Unsupported audio format: ${format}`);
              }

              const audioBuffer = audioContext.createBuffer(
                numberOfChannels,
                numberOfFrames,
                sampleRate
              );
              for (let channel = 0; channel < numberOfChannels; channel++) {
                const channelData = new Float32Array(numberOfFrames);
                audioData.copyTo(channelData, {
                  planeIndex: channel,
                });
                audioBuffer.copyToChannel(channelData, channel);
              }
              return audioBuffer;
            }

            function decodeAsync(d) {
              return new Promise((a, r) => {
                try {
                  audioCTX.decodeAudioData(d, a, r);
                } catch (e) {
                  r(null);
                }
              });
            }
            async function loadSoundAsync(
              sprite,
              sound,
              format,
              e,
              useDecodeWav
            ) {
              try {
                window.JSIfy.onlog("Loading sound " + sound.name + "...");
                var base64 = await zip.files[sound.md5ext].async("base64");
                async function urlToArrayBuffer(url) {
                  const response = await fetch(url);
                  const arrayBuffer = await response.arrayBuffer();
                  return arrayBuffer;
                }
                var b = await urlToArrayBuffer(
                  `data:audio/wav;base64,${base64}`
                );
                if (!useDecodeWav) {
                  var c = await decodeAsync(b);
                } else {
                  var decoderthingy = new window.ADPCMSoundDecoder(audioCTX);
                  var c = await decoderthingy.decode(b);
                }
                loadp += 1;
                window.JSIfy.onprogress(loadp, assets);
                sprite.sounds[sound.name] = {
                  data: c,
                  arrayBuffer: b,
                  indexnum: e,
                  name: sound.name,
                };
                window.JSIfy.onlog("Sound " + sound.name + " loaded!");
              } catch (err) {
                console.warn(
                  `Failed to decode sound "${sound.name}".`,
                  "Sound:",
                  sound,
                  "Error:",
                  err
                );
                if (!useDecodeWav) {
                  return await loadSoundAsync(sprite, sound, format, e, true);
                } else {
                  loadp += 1;
                  window.JSIfy.onprogress(loadp, assets);
                  window.JSIfy.onlog(
                    "Failed to load sound " +
                      sound.name +
                      "! (The sound would simply not play, don't panic!)"
                  );
                }
              }
            }
            sprite.soundNames = [];
            var soundi = 0;
            for (var sound of target.sounds) {
              try {
                (function (spr, ind, snd) {
                  spr.soundNames[ind] = snd.name;
                  loadSoundAsync(spr, snd, "wav", ind);
                })(sprite, soundi, sound);
                soundi += 1;
              } catch (e) {
                console.warn(e);
              }
            }
            var cindex = 0;
            for (var costume of target.costumes) {
              try {
                this.onlog("Loading costume " + costume.name + "...");
                var data = await zip.files[costume.md5ext].async("base64");
                var types = {
                  svg: "image/svg+xml",
                  png: "image/png",
                  SVG: "image/svg+xml",
                  PNG: "image/png",
                };
                var img = null;
                var imgWidth = 0;
                var imgHeight = 0;
                var costumeType = types[costume.md5ext.split(".").pop()];
                if (costumeType == "image/svg+xml") {
                  this.onlog(
                    "Injecting fonts for vector costume " +
                      costume.name +
                      "... (Scratch simply does not add the fonts, so I have to add them myself!)"
                  );
                  var txt = atob(data);
                  var dom = new DOMParser();
                  var parsed = dom.parseFromString(txt, "image/svg+xml");
                  var style = document.createElement("style");
                  function getFont(name) {
                    try {
                      return SCRATCHFONTS[name];
                    } catch (e) {
                      return "";
                    }
                  }
                  var fonts = [
                    //Family, URL
                    ["SansSerif", getFont("NotoSans-Medium.ttf")],
                    ["Serif", getFont("SourceSerifPro-Regluar.otf")],
                    ["Handwriting", getFont("handlee-regular.ttf")],
                    ["Marker", getFont("Knewave.ttf")],
                    ["Curly", getFont("Griffy-Regular.ttf")],
                    ["Pixel", getFont("Grand9K-Pixel.ttf")],
                    ["Scratch", getFont("Scratch.ttf")],
                  ];
                  var requiredFonts = [];
                  function doScan(elm) {
                    var family = elm.getAttribute("font-family");
                    if (requiredFonts.indexOf(family) < 0) {
                      requiredFonts.push(family);
                    }
                    for (var child of elm.children) {
                      doScan(child);
                    }
                  }
                  doScan(parsed.documentElement);
                  for (var font of fonts) {
                    var family = font[0];
                    var url = font[1];
                    //Only need to add the fonts that are neccesary
                    if (requiredFonts.indexOf(family) > -1) {
                      style.innerHTML +=
                        "@font-face {font-family: " +
                        family +
                        "; src: url(" +
                        JSON.stringify(url) +
                        "); }";
                    }
                  }
                  parsed.children[0].append(style);
                  var gendiv = document.createElement("div");
                  gendiv.append(parsed.documentElement);
                  data = btoa(gendiv.innerHTML);
                  var url = `data:${costumeType};base64,${data}`;
                  this.onlog(
                    "Loading costume " + costume.name + " with the fonts..."
                  );
                  var img2 = await this.loadImage(url);
                  imgWidth = img2.width;
                  imgHeight = img2.height;
                  if (window.JSIfy.highQualitySVG) {
                    img = img2;
                  } else {
                    this.onlog(
                      "Since you requested lower quality svg, I am pre-rendering the vector to bitmap for you! (For " +
                        costume.name +
                        ")"
                    );
                    var canvas = document.createElement("canvas");
                    var context = canvas.getContext("2d");
                    var scaleMult = 1;
                    canvas.width = img2.width * scaleMult;
                    canvas.height = img2.height * scaleMult;
                    context.drawImage(img2, 0, 0, canvas.width, canvas.height);
                    img = canvas;
                  }
                } else {
                  this.onlog("Loading bitmap costume " + costume.name + "...");
                  var url = `data:${costumeType};base64,${data}`;
                  img = await this.loadImage(url);
                  imgWidth = img.width;
                  imgHeight = img.height;
                }
                var bm = 1;
                if (typeof costume.bitmapResolution == "number") {
                  bm = costume.bitmapResolution;
                }
                var mask = null;
                this.onlog(
                  "Creating collision mask for costume " +
                    costume.name +
                    "... (for is touching sprite blocks)"
                );
                try {
                  var width = imgWidth / bm;
                  var height = imgHeight / bm;

                  if (width < 1 || height < 1) {
                    mask = null;
                  } else {
                    collisionCanvas.width = width * 2;
                    collisionCanvas.height = height * 2;
                    collisionContext.clearRect(
                      0,
                      0,
                      collisionCanvas.width,
                      collisionCanvas.height
                    );
                    collisionContext.drawImage(
                      img,
                      0,
                      0,
                      collisionCanvas.width,
                      collisionCanvas.height
                    );
                    mask = new window.CollisionSprite(
                      collisionContext.getImageData(
                        0,
                        0,
                        collisionCanvas.width,
                        collisionCanvas.height
                      )
                    );
                    if (window.JSIfy.debugLogs) {
                      console.log(
                        `[${sprite.name}]: Costume ${
                          costume.name
                        } rotation center x: ${
                          costume.rotationCenterX / bm
                        } rotation center y: ${costume.rotationCenterX / bm}`
                      );
                    }
                    mask.costumeCenterX = costume.rotationCenterX / bm;
                    mask.costumeCenterY = costume.rotationCenterY / bm;
                  }
                } catch (e) {
                  window.JSIfy.onlog(
                    "[JSIfy]: Failed to create collison mask for costume: " +
                      costume.name +
                      " on sprite: " +
                      sprite.name +
                      " JavaScript error: " +
                      e
                  );
                  console.warn(
                    "[JSIfy]: failed to create collison mask for costume: " +
                      costume.name
                  );
                }

                sprite.costumes[costume.name] = {
                  name: costume.name,
                  offsetx: costume.rotationCenterX / bm,
                  offsety: costume.rotationCenterY / bm,
                  image: img,
                  res: bm,
                  cwidth: width,
                  cheight: height,
                  number: cindex,
                  mask: mask,
                  renderimage: img,
                };

                cindex += 1;
                loadp += 1;
                window.JSIfy.onprogress(loadp, assets);
              } catch (e) {
                cindex += 1;
                loadp += 1;
                window.JSIfy.onprogress(loadp, assets);
                this.onlog("Costume load error for " + costume.name + "! " + e);
              }
            }

            sprite.costume =
              sprite.costumes[target.costumes[target.currentCostume].name];
            sprite.costumeNumber = target.currentCostume;
            for (var variable of Object.keys(target.variables)) {
              var dat = target.variables[variable];
              if (target.isStage) {
                this.variables[dat[0]] = dat[1];
                if (dat[2]) {
                  //Reported as cloud variable, so we must add it to the cloud variable list.
                  console.log("Found cloud varaible " + dat[0]);
                  this.cloudVariables.push(dat[0]);
                }
              } else {
                sprite.variables[dat[0]] = dat[1];
              }
            }
            for (var list of Object.keys(target.lists)) {
              var dat = target.lists[list];
              if (target.isStage) {
                this.lists[dat[0]] = dat[1];
              } else {
                sprite.lists[dat[0]] = dat[1];
              }
            }
            this.onlog(
              "Generating JavaScript for sprite " + target.name + "..."
            );
            sprite.code = this.genCode(sprite, this.variables); //Generate the code from the scratch 3.0 project json.
            try{
              sprite.code = await Terser.minify(sprite.code, terserOptions);
            }catch(e){
              window.alert("Terser error: "+e);
            }
            try {
              if (window.JSIfy.debugLogs) {
                console.log(
                  `Sprite code for ${sprite.name}:` + "\n" + sprite.code
                );
              }
              sprite.runfunct = eval(sprite.code); // Attempt to execute the sprite code
              sprite.runfunct(sprite);
              this.onlog("Successfully started code for " + target.name + "!");
            } catch (e) {
              window.JSIfy.onlog(
                "Sprite script run error! Sprite '" +
                  sprite.name +
                  "' failed somewhere in compiler. Check devtools console for extra details:" +
                  e
              );
              console.error(e);
            }
            this.sprites.push(sprite);
          });
          this.onlog(
            "Project sprites finished basic initilization, waiting for assets to finish loading."
          );
          while (loadp < assets) {
            await window.JSIfy.proAPI.foreverLoopAsync();
          }
          this.onlog("Project loaded!");
        } catch (e) {
          console.error(e);
          this.onlog("failed to load!" + e);
        }
      },
      highQualitySVG: true,
      running: true,
      checkWhenClickedHats: function () {
        if (renderer.mouseDown) {
          if (!_lastMouseDownState) {
            var sprs = [];
            for (var spr of window.JSIfy.sprites) {
              sprs.push(spr);
              for (var clone of spr.clones) {
                sprs.push(clone);
              }
            }
            sprs = sprs
              .sort((a, b) => {
                return a.layer - b.layer;
              })
              .reverse(); //Reverse: Front sprites would be checked first.

            (function () {
              for (var spr of sprs) {
                if (spr.checkCollisionMouse() && spr.showing) {
                  if (spr.effects.ghost < 95) {
                    try {
                      spr.startClickHats();
                    } catch (e) {
                      console.warn(
                        `[JSIfy]: Sprite ${spr.name} failed with startClickHats, error: `,
                        e
                      );
                    }
                    return;
                  }
                }
              }
            })();
            _lastMouseDownState = true;
          }
        } else {
          _lastMouseDownState = false;
        }
      },
      renderStage: function () {
        var atualSprites = [];
        var speechBubbles = [];
        function drawSprite(spr, stageMode) {
          if (!stageMode) {
            if (spr.isStage) {
              return false;
            }
          }
          var distanceX = spr.x - spr.rsprite.x;
          var distanceY = spr.y * -1 - spr.rsprite.y;
          var distanceDirection = spr.direction - spr.rsprite.direction;
          var interplotateAmount = 1;
          spr.rsprite.x = spr.x;
          spr.rsprite.y = spr.y * -1;
          if (isNaN(spr.x)) {
            //window.JSIfy.onlog(`Sprite has NAN x value`);
          }
          if (isNaN(spr.y)) {
            //window.JSIfy.onlog(`Sprite has NAN y value`);
          }
          spr.rsprite.direction = spr.direction;
          spr.rsprite.flipH = false;
          if (spr.rotationStyle == "left-right") {
            spr.rsprite.direction = 90;
            if (spr.getDirection() > 0) {
              spr.rsprite.flipH = false;
            } else {
              spr.rsprite.flipH = true;
            }
          }
          if (spr.rotationStyle == "don't rotate") {
            spr.rsprite.direction = 90;
          }
          var cosimage = spr.costume.renderimage;
          var costume = spr.costume;

          spr.rsprite.image = spr.updateSpriteEffects();
          spr.rsprite.trs = 1;
          spr.rsprite.trs -= spr.effects.ghost / 100;
          var r = 1;
          if (spr.costume.res) {
            r = spr.costume.res;
          }
          spr.rsprite.width =
            (costume.image.width * (spr.size / 100)) / spr.costume.res;
          spr.rsprite.height =
            (costume.image.height * (spr.size / 100)) / spr.costume.res;
          spr.rsprite.rotateOffsetX =
            (spr.costume.offsetx / 1) * (spr.size / 100);
          spr.rsprite.rotateOffsetY =
            (spr.costume.offsety / 1) * (spr.size / 100) * 1;
          spr.rsprite.sclayer = spr.layer;
          spr.rsprite.x = Math.round(spr.rsprite.x);
          spr.rsprite.y = Math.round(spr.rsprite.y);
          spr.rsprite.direction = Math.round(spr.rsprite.direction);
          if (stageMode) {
            return spr.rsprite;
          }
          if (spr.showing) {
            atualSprites.push(spr.rsprite);
            if (spr.speechBubble) {
              var canvas2 = spr.speechBubble;
              var speech = spr.rspriteSpeech;
              var bubbleScale = 1;
              speech.width = canvas2.width * bubbleScale - 10;
              speech.height = canvas2.height * bubbleScale - 10;
              speech.image = canvas2;
              speech.x = spr.rsprite.x + spr.rsprite.width / 2;
              speech.y = spr.rsprite.y - spr.rsprite.height / 2;
              speech.y -= speech.height;
              speech.y += 10;
              speech.direction = 90;
              speech.scale = 1;
              speech.sclayer = spr.rsprite.sclayer;
              speech.trs = 1;
              speech.rotateOffsetX = 0;
              speech.rotateOffsetY = 0;
              speechBubbles.push(speech);
            }
          }
        }
        for (var spr of window.JSIfy.sprites) {
          /*if (isNaN(spr.x)) {
                    console.warn("Found sprite with NAN x position. Setting it to 0.");
                    spr.x = 0;
                    }
                    if (isNaN(spr.y)) {
                    //console.warn("Found sprite with NAN y position. Setting it to 0.");
                    //spr.y = 0;
                    }
                    if (isNaN(spr.direction)) {
                    console.warn("Found sprite with NAN direction. Setting it to 90.");
                    spr.direction = 90;
                    }*/
          try {
            drawSprite(spr);
          } catch (e) {
            console.warn(`Draw sprite error! `, e);
          }
          for (var clone of spr.clones) {
            try {
              drawSprite(clone);
            } catch (e) {
              console.warn(`Draw sprite error! `, e);
            }
          }
        }
        atualSprites = atualSprites.sort((a, b) => {
          return a.sclayer - b.sclayer;
        });
        var stagespr = undefined;
        for (var spr of window.JSIfy.sprites) {
          if (spr.isStage) {
            stagespr = drawSprite(spr, true);
          }
        }
        for (var bubble of speechBubbles) {
          atualSprites.push(bubble);
        }
        renderer.drawSprites([stagespr, penSprite].concat(atualSprites)); //The pen is above the stage when drawn.
      },
      updateTimer: function () {
        this.curTime = (Date.now() - this.startTime) / 1000;
      },
      debug: {
        listSprites: function listSprites() {
          var idx = 0;
          for (var sprite of window.JSIfy.sprites) {
            console.log(
              `window.JSIfy.sprites[${idx}] -> ${sprite.name} [Clones: ${sprite.clones.length} Visible/Showing: ${sprite.showing}]`
            );
            idx += 1;
          }
        },
        findSprite: function (name) {
          for (var sprite of window.JSIfy.sprites) {
            if (sprite.name.toLowerCase() == name.toLowerCase()) {
              return sprite;
            }
          }
          return null;
        },
      },
      messageList: [],
    };
    var _lastMouseDownState = false;
    window.JSIfy.frameRate = 32;
    var then = Date.now();
    setInterval(() => {
      var time = 1000 / window.JSIfy.frameRate;
      var now = Date.now();
      if (now > then + time) {
        window.JSIfy.checkWhenClickedHats();
        window.JSIfy.updateTimer();

        window.JSIfy.tickFrame();

        if (!window.JSIfy.disableRendering) {
          window.JSIfy.renderStage();
        }

        then = now;
      }
    }, 1);
    setInterval(() => {
      if (!window.JSIfy.keysPressed["Control"]) {
        if (window.JSIfy.keysPressed["Alt"]) {
          var i = 0;
          while (i < 1000) {
            window.JSIfy.step();
            i += 1;
          }
        } else {
          window.JSIfy.step();
        }
      }
    }, 1);
  } catch (e) {
    window.alert(e);
  }
})();
