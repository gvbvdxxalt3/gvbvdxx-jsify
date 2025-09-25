(function () {
  class CollisionSprite {
    constructor(
      imageData,
      x = 0,
      y = 0,
      scaleX = 1,
      scaleY = 1,
      angle = 0,
      centerX = 0,
      centerY = 0,
      flipX = false,
      flipY = false,
      collisionTolerance = 0
    ) {
      this.imageData = imageData;
      this._x = x;
      this._y = y;
      this._scaleX = scaleX;
      this._scaleY = scaleY;
      this._angle = angle;
      this._centerX = centerX;
      this._centerY = centerY;
      this._flipX = flipX;
      this._flipY = flipY;
      this.collisionTolerance = collisionTolerance;

      this.transformMatrix = new Float32Array(6);
      this._invRotationCos = 1;
      this._invRotationSin = 0;
      // --- NEW CACHE FOR INCREMENTAL CALCULATION ---
      this._dx_lx = 1;
      this._dx_ly = 0;
      this.isTransformDirty = true;

      this.generateAlphaList();
    }

    // Getters and Setters remain the same
    get x() {
      return this._x;
    }
    set x(value) {
      if (this._x !== value) {
        this._x = value;
        this.isTransformDirty = true;
      }
    }
    get y() {
      return this._y;
    }
    set y(value) {
      if (this._y !== value) {
        this._y = value;
        this.isTransformDirty = true;
      }
    }
    get scaleX() {
      return this._scaleX;
    }
    set scaleX(value) {
      if (this._scaleX !== value) {
        this._scaleX = value;
        this.isTransformDirty = true;
      }
    }
    get scaleY() {
      return this._scaleY;
    }
    set scaleY(value) {
      if (this._scaleY !== value) {
        this._scaleY = value;
        this.isTransformDirty = true;
      }
    }
    get angle() {
      return this._angle;
    }
    set angle(value) {
      if (this._angle !== value) {
        this._angle = value;
        this.isTransformDirty = true;
      }
    }
    get centerX() {
      return this._centerX;
    }
    set centerX(value) {
      if (this._centerX !== value) {
        this._centerX = value;
        this.isTransformDirty = true;
      }
    }
    get centerY() {
      return this._centerY;
    }
    set centerY(value) {
      if (this._centerY !== value) {
        this._centerY = value;
        this.isTransformDirty = true;
      }
    }
    get flipX() {
      return this._flipX;
    }
    set flipX(value) {
      if (this._flipX !== value) {
        this._flipX = value;
        this.isTransformDirty = true;
      }
    }
    get flipY() {
      return this._flipY;
    }
    set flipY(value) {
      if (this._flipY !== value) {
        this._flipY = value;
        this.isTransformDirty = true;
      }
    }

    ensureTransformIsUpdated() {
      if (this.isTransformDirty) this._updateTransformCache();
    }

    _updateTransformCache() {
      const { _scaleX: sX, _scaleY: sY, _angle: ang } = this;
      const rad = (ang * Math.PI) / 180,
        cos = Math.cos(rad),
        sin = Math.sin(rad);

      const a = cos * sX,
        b = sin * sX,
        c = -sin * sY,
        d = cos * sY;
      this.transformMatrix.set([a, b, c, d]);

      const invRad = (-ang * Math.PI) / 180;
      this._invRotationCos = Math.cos(invRad);
      this._invRotationSin = Math.sin(invRad);

      // --- NEW: Cache the incremental step values ---
      // This pre-calculates how much local coordinates change for each
      // single-pixel step in the world coordinates.
      if (Math.abs(sX) > 1e-6) {
        this._dx_lx = this._invRotationCos / sX;
      }
      if (Math.abs(sY) > 1e-6) {
        this._dx_ly = this._invRotationSin / sY;
      }

      this.isTransformDirty = false;
    }

    generateAlphaList() {
      const data = this.imageData.data;
      this.alphaList = new Uint32Array(data.length / 4);
      for (let i = 0, i2 = 0; i < data.length; i += 4, i2++) {
        if (data[i + 3] > 0) this.alphaList[i2] = 1;
      }
    }

    getAdjustedCenter() {
      const {
        _centerX: cX,
        _centerY: cY,
        _flipX: fX,
        _flipY: fY,
        imageData: { width, height },
      } = this;
      return {
        adjustedCenterX: fX ? width - cX : cX,
        adjustedCenterY: fY ? height - cY : cY,
      };
    }

    transformPoint(lX, lY) {
      this.ensureTransformIsUpdated();
      const [a, b, c, d] = this.transformMatrix;
      const { _x: x, _y: y } = this;
      const { adjustedCenterX: acX, adjustedCenterY: acY } =
        this.getAdjustedCenter();
      const tX = lX - acX,
        tY = lY - acY;
      return { x: tX * a + tY * c + x, y: tX * b + tY * d + y };
    }

    worldToLocal(worldX, worldY) {
      this.ensureTransformIsUpdated();
      const { _x: x, _y: y, _scaleX: scaleX, _scaleY: scaleY } = this;
      const { adjustedCenterX, adjustedCenterY } = this.getAdjustedCenter();
      const translatedX = worldX - x,
        translatedY = worldY - y;
      const cos = this._invRotationCos,
        sin = this._invRotationSin;
      const rotatedX = translatedX * cos - translatedY * sin;
      const rotatedY = translatedX * sin + translatedY * cos;
      const localX = rotatedX / scaleX + adjustedCenterX;
      const localY = rotatedY / scaleY + adjustedCenterY;
      return { x: localX, y: localY };
    }

    getFlippedCoordinates(lX, lY) {
      const {
        _flipX: fX,
        _flipY: fY,
        imageData: { width, height },
      } = this;
      return { x: fX ? width - 1 - lX : lX, y: fY ? height - 1 - lY : lY };
    }

    isPixelOpaque(lX, lY) {
      const { width, height } = this.imageData;
      const { x: fX, y: fY } = this.getFlippedCoordinates(
        Math.round(lX),
        Math.round(lY)
      );
      if (fX < 0 || fY < 0 || fX >= width || fY >= height) return false;
      return this.alphaList[fY * width + fX] === 1;
    }

    getBoundingBox() {
      this.ensureTransformIsUpdated();
      const { width, height } = this.imageData;
      const cs = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: 0, y: height },
        { x: width, y: height },
      ];
      const tCs = cs.map(({ x, y }) => this.transformPoint(x, y));
      return {
        minX: Math.min(...tCs.map((p) => p.x)),
        maxX: Math.max(...tCs.map((p) => p.x)),
        minY: Math.min(...tCs.map((p) => p.y)),
        maxY: Math.max(...tCs.map((p) => p.y)),
      };
    }

    // --- NEW: ULTRA-OPTIMIZED collisionTest ---
    collisionTest(sprite) {
      this.ensureTransformIsUpdated();
      sprite.ensureTransformIsUpdated();
      const b1 = this.getBoundingBox(),
        b2 = sprite.getBoundingBox();
      const oX1 = Math.max(b1.minX, b2.minX),
        oX2 = Math.min(b1.maxX, b2.maxX);
      const oY1 = Math.max(b1.minY, b2.minY),
        oY2 = Math.min(b1.maxY, b2.maxY);
      if (oX2 < oX1 || oY2 < oY1) return false;

      const tolerance = this.collisionTolerance;
      const startX = oX1 - tolerance;
      const endX = oX2 + tolerance;
      const startY = oY1 - tolerance;
      const endY = oY2 + tolerance;

      // Cache the incremental step values for both sprites
      const this_dx_lx = this._dx_lx;
      const this_dx_ly = this._dx_ly;
      const sprite_dx_lx = sprite._dx_lx;
      const sprite_dx_ly = sprite._dx_ly;

      for (let y = startY; y <= endY; y++) {
        // Calculate the starting local coordinates for this row ONCE
        let localThis = this.worldToLocal(startX, y);
        let localOther = sprite.worldToLocal(startX, y);

        for (let x = startX; x <= endX; x++) {
          if (
            this.isPixelOpaque(localThis.x, localThis.y) &&
            sprite.isPixelOpaque(localOther.x, localOther.y)
          ) {
            return true;
          }
          // --- INCREMENTAL UPDATE ---
          // Instead of a full recalculation, just add the pre-calculated step.
          // This is much, much faster.
          localThis.x += this_dx_lx;
          localThis.y += this_dx_ly;
          localOther.x += sprite_dx_lx;
          localOther.y += sprite_dx_ly;
        }
      }
      return false;
    }
  }
  window.CollisionSprite = CollisionSprite;
})();
