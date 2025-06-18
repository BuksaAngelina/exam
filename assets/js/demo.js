const state = {
    sides: 5,
    radius: 4,
    showCoals: false,
}

function onChangeShapeSides(value) {
    document.getElementById('sides-label').textContent = value;
    state.sides = value;
    drawShapeFromState();
}

function onChangeShapeRadius(value) {
    state.radius = value;
    drawShapeFromState();
}

function onChangeShapeShowCoals(value) {
    state.showCoals = value;
    drawShapeFromState();
}

function onChangeShapeShowCoalsRevers() {
    state.showCoals = !state.showCoals;
    drawShapeFromState();
}

function drawShapeFromState() {
    document.querySelector('#shape-presentation')
        .setAttribute('regular-ngon', `sides: ${state.sides}; radius: ${state.radius}; highlightCoals: ${state.showCoals}`);
}