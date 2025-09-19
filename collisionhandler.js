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
      this.imageData = imageData; // The image data for collision detection (RGBA)
      this.x = x; // Sprite position (global)
      this.y = y;
      this.scaleX = scaleX; // Horizontal scaling factor
      this.scaleY = scaleY; // Vertical scaling factor
      this.angle = angle; // Rotation angle in degrees
      this.centerX = centerX; // The center of rotation (relative to the image)
      this.centerY = centerY;
      this.flipX = flipX; // Whether to flip horizontally
      this.flipY = flipY; // Whether to flip vertically
      this.collisionTolerance = collisionTolerance; // Tolerance for small misalignments
      this.generateAlphaList(); //Generate a precomputed list of zero and ones for if there is collision on specific pixels.
    }
    
    generateAlphaList() {
      var data = this.imageData.data;
      this.alphaList = new Uint32Array(data.length/4);
      var i = 0;
      var i2 = 0;
      while (i < data.length) {
        i += 3;
        var alpha = data[i];
        if (alpha > 0) {
          this.alphaList[i2] = 1;
        } else {
          this.alphaList[i2] = 0;
        }
        i += 1;
        i2 += 1;
      }
    }

    // Adjust center point dynamically for flipping
    getAdjustedCenter() {
      const { centerX, centerY, flipX, flipY, imageData } = this;
      const { width, height } = imageData;

      return {
        adjustedCenterX: flipX ? width - centerX : centerX,
        adjustedCenterY: flipY ? height - centerY : centerY,
      };
    }

    // Map local coordinates to flipped image coordinates
    getFlippedCoordinates(localX, localY) {
      const { flipX, flipY, imageData } = this;
      const { width, height } = imageData;

      return {
        x: flipX ? width - 1 - localX : localX,
        y: flipY ? height - 1 - localY : localY,
      };
    }

    // Transform a point (local coordinates) considering scaling, rotation, flipping, and translation
    transformPoint(localX, localY) {
      const { x, y, scalex, scaley, angle } = this;
      const { adjustedCenterX, adjustedCenterY } = this.getAdjustedCenter();

      // Translate the point relative to the adjusted center
      const translatedX = (localX - adjustedCenterX) * scalex;
      const translatedY = (localY - adjustedCenterY) * scaley;

      // Convert the rotation angle to radians
      const radians = (angle * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);

      // Apply rotation
      const rotatedX = translatedX * cos - translatedY * sin;
      const rotatedY = translatedX * sin + translatedY * cos;

      // Translate back to the global position
      return { x: rotatedX + x, y: rotatedY + y };
    }

    // Map a world point to local coordinates for this sprite
    worldToLocal(worldX, worldY) {
      const { x, y, scalex, scaley, angle } = this;
      const { adjustedCenterX, adjustedCenterY } = this.getAdjustedCenter();

      // Translate world coordinates to be relative to the sprite position
      const translatedX = worldX - x;
      const translatedY = worldY - y;

      // Apply reverse rotation
      const radians = (-angle * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);

      const rotatedX = translatedX * cos - translatedY * sin;
      const rotatedY = translatedX * sin + translatedY * cos;

      // Adjust for scaling and flipping
      const localX = rotatedX / scalex + adjustedCenterX;
      const localY = rotatedY / scaley + adjustedCenterY;

      return { x: localX, y: localY };
    }

    // Check if a pixel is opaque in the image data
    isPixelOpaque(localX, localY) {
      const { imageData } = this;
      const { width, height, data } = imageData;

      const { x: flippedX, y: flippedY } = this.getFlippedCoordinates(
        Math.round(localX),
        Math.round(localY)
      );

      if (
        flippedX < 0 ||
        flippedY < 0 ||
        flippedX >= width ||
        flippedY >= height
      ) {
        return false;
      }

      const index = (flippedY * width + flippedX);
      return this.alphaList[index];
    }

    // Calculate the bounding box (AABB) of the sprite
    getBoundingBox() {
      const { imageData } = this;
      const { width, height } = imageData;

      const corners = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: 0, y: height },
        { x: width, y: height },
      ];

      // Transform each corner and find the bounding box
      const transformedCorners = corners.map(({ x, y }) =>
        this.transformPoint(x, y)
      );

      const minX = Math.min(...transformedCorners.map((p) => p.x));
      const maxX = Math.max(...transformedCorners.map((p) => p.x));
      const minY = Math.min(...transformedCorners.map((p) => p.y));
      const maxY = Math.max(...transformedCorners.map((p) => p.y));

      return { minX, maxX, minY, maxY };
    }

    // Pixel-perfect collision detection
    collisionTest(sprite) {
      const box1 = this.getBoundingBox();
      const box2 = sprite.getBoundingBox();

      const overlapMinX = Math.max(box1.minX, box2.minX);
      const overlapMaxX = Math.min(box1.maxX, box2.maxX);
      const overlapMinY = Math.max(box1.minY, box2.minY);
      const overlapMaxY = Math.min(box1.maxY, box2.maxY);

      if (overlapMaxX <= overlapMinX || overlapMaxY <= overlapMinY) {
        return false;
      }
      
      if (overlapMaxX == overlapMinX || overlapMaxY == overlapMinY) {
        return false;
      }

      // Apply tolerance to avoid small misalignments
      const toleranceX = this.collisionTolerance;
      const toleranceY = this.collisionTolerance;
      for (
        let y = overlapMinY - toleranceY;
        y <= overlapMaxY + toleranceY;
        y++
      ) {
        for (
          let x = overlapMinX - toleranceX;
          x <= overlapMaxX + toleranceX;
          x++
        ) {
          const localThis = this.worldToLocal(x, y);
          const localOther = sprite.worldToLocal(x, y);

          const pixelThis = this.isPixelOpaque(localThis.x, localThis.y);
          const pixelOther = sprite.isPixelOpaque(localOther.x, localOther.y);

          if (pixelThis && pixelOther) {
            return true;
          }
        }
      }

      return false;
    }
  }

  window.CollisionSprite = CollisionSprite;
})();
