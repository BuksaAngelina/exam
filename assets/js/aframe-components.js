AFRAME.registerComponent('regular-ngon', {
    schema: {
    sides:  {type: 'int',    default: 6},
    radius: {type: 'number', default: 1},
    color:  {type: 'string', default: 'red'},
    highlightCoals: {type: 'boolean', default: false},
    },
    init: function () { this.draw(); },
    update: function () { this.draw(); },
    remove: function () {
      if (this.vertexHelpers) this.vertexHelpers.forEach(obj => this.el.object3D.remove(obj));
      if (this.borderMesh) this.el.object3D.remove(this.borderMesh);
      this.el.removeObject3D('mesh');
      if (this.blinkRAF) cancelAnimationFrame(this.blinkRAF);
      this.blinkRAF = null;
    },
    draw: function () {
      const args = this.data;
      const geometry = new THREE.BufferGeometry();

      // Generate vertices for the n-gon
      const vertices = [];
      for (let i = 0; i < args.sides; i++) {
        const theta = (i / args.sides) * 2 * Math.PI;
        vertices.push(args.radius * Math.cos(theta), 0, args.radius * Math.sin(theta));
      }

      // Center point
      vertices.push(0, 0, 0);
      const centerIndex = args.sides;

      // Indices for faces (triangles)
      const indices = [];
      for (let i = 0; i < args.sides; i++) {
        indices.push(centerIndex, i, (i + 1) % args.sides);
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      this.el.setObject3D('mesh', new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({color: args.color, side: THREE.DoubleSide})
      ));

      // Remove old helpers/lines
      if (this.vertexHelpers) this.vertexHelpers.forEach(obj => this.el.object3D.remove(obj));
      if (this.borderMesh) this.el.object3D.remove(this.borderMesh);
      this.vertexHelpers = [];

      // 2. Highlight coals/vertices if enabled
      if (args.highlightCoals) {
        for (let i = 0; i < args.sides; i++) {
          const x = vertices[i * 3], y = vertices[i * 3 + 1], z = vertices[i * 3 + 2];
          const helper = new THREE.Mesh(
            new THREE.SphereGeometry(0.07 * args.radius, 8, 8),
            new THREE.MeshStandardMaterial({color: 'yellow', emissive: 'orange'})
          );
          helper.position.set(x, y, z);
          this.el.object3D.add(helper);
          this.vertexHelpers.push(helper);
        }
      }
    }
});