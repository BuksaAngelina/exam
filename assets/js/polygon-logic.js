// polygon-logic.js
import { calculateDistance, calculateAngleBetweenVectors, calculatePolygonArea, getMidpoint } from './math-utils.js';

AFRAME.registerComponent('polygon-generator', {
    schema: {
        numSides: { type: 'int', default: 4 },
        size: { type: 'number', default: 2 },
        highlightAngles: { type: 'boolean', default: false },
        showMeasurements: { type: 'boolean', default: false },
        draggingEnabled: { type: 'boolean', default: true }
    },

    init: function () {
        this.vertices = [];
        this.vertexEntities = [];
        this.angleTexts = [];
        this.sideTexts = [];
        this.polygonEntity = null;
        this.updatePolygon();

        // Слухачі подій для перетягування вершин
        this.el.addEventListener('vertex-dragged', (evt) => {
            // Оновлюємо позицію конкретної вершини
            const index = evt.detail.index;
            const newPos = evt.detail.position;
            this.vertices[index].copy(newPos);
            this.updatePolygonGeometry();
            this.updateMeasurements();
        });
    },

    update: function (oldData) {
        if (this.data.numSides !== oldData.numSides || this.data.size !== oldData.size) {
            this.updatePolygon();
        }
        if (this.data.highlightAngles !== oldData.highlightAngles) {
            this.toggleAngleHighlight(this.data.highlightAngles);
        }
        if (this.data.showMeasurements !== oldData.showMeasurements) {
            this.toggleMeasurements(this.data.showMeasurements);
        }
        if (this.data.draggingEnabled !== oldData.draggingEnabled) {
            this.vertexEntities.forEach(vertexEl => {
                vertexEl.setAttribute('draggable-vertex', 'enabled', this.data.draggingEnabled);
            });
        }
    },

    updatePolygon: function () {
        this.clearPolygon();
        const numSides = this.data.numSides;
        const radius = this.data.size / (2 * Math.sin(Math.PI / numSides)); // Радіус описаного кола

        // Створення вершин
        this.vertices = [];
        for (let i = 0; i < numSides; i++) {
            const angle = i * 2 * Math.PI / numSides;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle); // Використовуємо XZ площину
            this.vertices.push(new THREE.Vector3(x, 0, z)); // Y = 0 для плоскої фігури
        }

        // Створення сутності для полігона
        this.polygonEntity = document.createElement('a-entity');
        this.el.appendChild(this.polygonEntity);
        this.updatePolygonGeometry(); // Створення геометрії та матеріалу

        // Додаємо сутності для вершин (для перетягування)
        this.vertexEntities = [];
        this.vertices.forEach((v, index) => {
            const vertexEl = document.createElement('a-sphere');
            vertexEl.setAttribute('position', `${v.x} ${v.y} ${v.z}`);
            vertexEl.setAttribute('radius', 0.08);
            vertexEl.setAttribute('color', '#FF0000');
            vertexEl.setAttribute('draggable-vertex', { enabled: this.data.draggingEnabled });
            vertexEl.setAttribute('class', 'collidable'); // Важливо для raycaster
            this.el.appendChild(vertexEl);
            this.vertexEntities.push(vertexEl);

            // Слухаємо події перетягування з компонента draggable-vertex
            vertexEl.addEventListener('dragmove', (evt) => {
                this.el.emit('vertex-dragged', { index: index, position: evt.detail.position });
            });
        });

        this.updateMeasurements();
        this.toggleAngleHighlight(this.data.highlightAngles);
        this.toggleMeasurements(this.data.showMeasurements);
    },

    updatePolygonGeometry: function() {
        if (!this.polygonEntity) return;

        const verticesFlat = [];
        this.vertices.forEach(v => verticesFlat.push(v.x, v.y, v.z));

        // Створення геометрії для полігона
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(verticesFlat);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Для відображення багатокутника як плоскої фігури, можна використовувати LineLoop або Triangles (якщо багатокутник опуклий)
        // Простий спосіб: LineLoop для контуру
        const indices = Array.from({ length: this.vertices.length }, (_, i) => i);
        geometry.setIndex([...indices, 0]); // Замкнути петлю

        // Якщо це опуклий багатокутник, можна заповнити його трикутниками
        if (this.data.numSides <= 4) { // Приклад для трикутників і чотирикутників
            const faces = [];
            if (this.data.numSides === 3) {
                faces.push(0, 1, 2);
            } else if (this.data.numSides === 4) {
                faces.push(0, 1, 2, 0, 2, 3); // Два трикутники для чотирикутника
            } else {
                 // Для N-кутників потрібна тріангуляція (складніше)
                 // Можна використовувати Three.js ConvexHull або бібліотеки для тріангуляції
                 // Для простоти, поки що тільки контур для N>4
                 this.polygonEntity.setAttribute('line', `color: blue; opacity: 0.8;`);
                 this.polygonEntity.setAttribute('material', 'visible: false'); // Приховуємо матеріал, щоб бачити тільки лінії
            }
            if (faces.length > 0) {
                geometry.setIndex(new Uint16Array(faces));
                this.polygonEntity.setAttribute('material', `color: green; opacity: 0.6; side: double`);
            }
        }
        else {
             // Для N-кутників просто лінії
             this.polygonEntity.setAttribute('line', `color: blue; opacity: 0.8;`);
             this.polygonEntity.setAttribute('material', 'visible: false');
        }

        // Оновлюємо або створюємо A-Frame об'єкт
        const mesh = this.polygonEntity.getObject3D('mesh');
        if (mesh) {
            mesh.geometry.dispose();
            mesh.geometry = geometry;
        } else {
            this.polygonEntity.setObject3D('mesh', new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00FF00, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })));
        }

        // Оновлення ліній контуру
        const line = this.polygonEntity.getObject3D('line');
        if (line) {
            line.geometry.dispose();
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(this.vertices.map(v => new THREE.Vector3(v.x, v.y, v.z)));
            lineGeometry.setIndex(new Uint16Array(Array.from({ length: this.vertices.length }, (_, i) => i).concat([0]))); // Замкнута лінія
            line.geometry = lineGeometry;
        } else {
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(this.vertices.map(v => new THREE.Vector3(v.x, v.y, v.z)));
            lineGeometry.setIndex(new Uint16Array(Array.from({ length: this.vertices.length }, (_, i) => i).concat([0])));
            this.polygonEntity.setObject3D('line', new THREE.LineLoop(lineGeometry, new THREE.LineBasicMaterial({ color: 0x0000FF, linewidth: 2 })));
        }
    },

    clearPolygon: function () {
        if (this.polygonEntity) {
            this.el.removeChild(this.polygonEntity);
            this.polygonEntity = null;
        }
        this.vertexEntities.forEach(el => el.parentNode.removeChild(el));
        this.vertexEntities = [];
        this.angleTexts.forEach(el => el.parentNode.removeChild(el));
        this.angleTexts = [];
        this.sideTexts.forEach(el => el.parentNode.removeChild(el));
        this.sideTexts = [];
    },

    updateMeasurements: function () {
        if (!this.data.showMeasurements && !this.data.highlightAngles) {
            this.angleTexts.forEach(el => el.setAttribute('visible', false));
            this.sideTexts.forEach(el => el.setAttribute('visible', false));
            return;
        }

        const numSides = this.vertices.length;

        // Оновлення/створення текстових елементів для кутів
        while (this.angleTexts.length < numSides) {
            const angleText = document.createElement('a-entity');
            angleText.setAttribute('mixin', 'angle-text');
            this.el.appendChild(angleText);
            this.angleTexts.push(angleText);
        }
        while (this.angleTexts.length > numSides) {
            this.el.removeChild(this.angleTexts.pop());
        }

        // Оновлення/створення текстових елементів для сторін
        while (this.sideTexts.length < numSides) {
            const sideText = document.createElement('a-entity');
            sideText.setAttribute('mixin', 'side-text');
            this.el.appendChild(sideText);
            this.sideTexts.push(sideText);
        }
        while (this.sideTexts.length > numSides) {
            this.el.removeChild(this.sideTexts.pop());
        }

        let outputText = "";

        // Розрахунок та відображення кутів і сторін
        for (let i = 0; i < numSides; i++) {
            const pCurrent = this.vertices[i];
            const pPrev = this.vertices[(i - 1 + numSides) % numSides];
            const pNext = this.vertices[(i + 1) % numSides];

            // Вектори, що утворюють кут
            const vec1 = new THREE.Vector3().subVectors(pPrev, pCurrent);
            const vec2 = new THREE.Vector3().subVectors(pNext, pCurrent);
            const angleDeg = calculateAngleBetweenVectors(vec1, vec2);

            // Довжина сторони
            const sideLength = calculateDistance(pCurrent, pNext);

            // Позиціонування тексту кута
            const angleTextEl = this.angleTexts[i];
            const textOffset = new THREE.Vector3().addVectors(vec1.normalize(), vec2.normalize()).multiplyScalar(-0.3); // Відступ від вершини
            angleTextEl.setAttribute('position', `${pCurrent.x + textOffset.x} ${pCurrent.y + textOffset.y} ${pCurrent.z + textOffset.z}`);
            angleTextEl.setAttribute('text', `value: ${angleDeg.toFixed(1)}°`);
            angleTextEl.setAttribute('visible', this.data.highlightAngles || this.data.showMeasurements);
            angleTextEl.setAttribute('rotation', `0 ${-angleDeg + 90} 0`); // Просте вирівнювання, може знадобитися доопрацювання

            // Позиціонування тексту сторони
            const sideTextEl = this.sideTexts[i];
            const midpoint = getMidpoint(pCurrent, pNext);
            sideTextEl.setAttribute('position', `${midpoint.x} ${midpoint.y + 0.1} ${midpoint.z}`);
            sideTextEl.setAttribute('text', `value: ${sideLength.toFixed(2)}`);
            sideTextEl.setAttribute('visible', this.data.showMeasurements);

            outputText += `Вершина ${i}: Кут = ${angleDeg.toFixed(1)}°\n`;
            outputText += `Сторона ${i}-${(i + 1) % numSides}: Довжина = ${sideLength.toFixed(2)}\n`;
        }

        // Розрахунок та відображення площі
        const area = calculatePolygonArea(this.vertices);
        outputText += `Площа багатокутника: ${area.toFixed(2)}\n`;

        document.getElementById('measurements-output').textContent = outputText;
    },

    toggleAngleHighlight: function (visible) {
        this.angleTexts.forEach(el => el.setAttribute('visible', visible || this.data.showMeasurements));
    },

    toggleMeasurements: function (visible) {
        this.angleTexts.forEach(el => el.setAttribute('visible', visible || this.data.highlightAngles));
        this.sideTexts.forEach(el => el.setAttribute('visible', visible));
        document.getElementById('measurements-output').style.display = visible ? 'block' : 'none';
    }
});
