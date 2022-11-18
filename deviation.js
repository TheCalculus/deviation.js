GLOBAL = {
    initTimestamp: Date.now(),
    canvas: null,
};

const Canvas = function (object, framerate) {
    GLOBAL.canvas = new class {
        constructor() {
            this.object = object;
            this.context = object.getContext('2d');
            this.stack = {
                state: [],
                push: element => this.stack.state.push(element),
                forEach: callback => this.stack.state.forEach((element, index) => callback(element, index)),
                purge: () => this.stack.state = [],
                pop: () => this.stack.state.pop(),
                shift: () => this.stack.state.shift(),
                filter: callback => this.stack.state.filter(callback),
                remove: object => this.stack.state = this.stack.state.filter(item => item !== object),
                locateOfType: typeObject => this.stack.state.filter(element => { return element instanceof typeObject }),
            };

            this.FRAMERATE = framerate === null || framerate === undefined ? 120 : framerate;
            this.MINIMUM_FRAMETIME = (1000 / 60) * (60 / this.FRAMERATE) - (1000 / 60) * 0.5;

            this.previousFrametime = 0;

            this.eventCallbacks = [];
        }

        set width(newWidth) {
            this.object.width = newWidth;
        }

        get width() {
            return this.object.width;
        }

        set height(newHeight) {
            this.object.height = newHeight;
        }

        get height() {
            return this.object.height;
        }

        refresh() {
            this.context.clearRect(0, 0, this.object.width, this.object.height);

            this.stack.forEach(object => object.runRenderPath());
            this.eventCallbacks.forEach(object => object());

            this.context.stroke();
        }

        addEvent(event, executable) {
            this.object.addEventListener(event, executable);
        }

        removeEvent(event) {
            this.object.removeEventListener(event);
        }

        experiments() {
            let context = this;
            return {
                mouseMove: function () {
                    context.addEvent("mousemove", (e) => {
                        context.stack.locateOfType(Line).length > 100 ? context.stack.remove(context.stack.locateOfType(Line)[0]) : new Line(context, [0, 0], [e.clientX, e.clientY], "white");
                    });
                },
                linearInterpolation: function (circle) {
                    context.addEvent("click", (e) => {
                        context.eventCallbacks.push(() => {
                            ({ x: circle.x, y: circle.y } = circle.lerp(circle.original, [e.clientX, e.clientY], () => {
                                context.eventCallbacks.pop();
                                circle.background = getRandomColor();
                            }) || { x: e.clientX, y: e.clientY });
                        });
                    });
                },
            }
        }
    }();
    return GLOBAL.canvas;
}

// CONVENTIONS:
// class [Object]
//      constructor (surface, **args)
//      function runRenderPath() { execute code to draw object on SURFACE }
//      function lerp() { linear interpolation of position }
//      function setPosition() { set new position of object - arguments vary on object }

class Circle {
    constructor(surface, origin, radius, background, border) {
        this.surface = surface;

        this.x = origin[0];
        this.y = origin[1];
        this.original = [this.x, this.y];

        this.radius = radius;

        this.background = background;
        this.border = border;

        this.lerpIterations = 0;

        surface.stack.push(this);
    }

    runRenderPath() {
        let context = this.surface.context;

        context.beginPath();

        context.fillStyle = this.background;
        context.strokeStyle = this.border;

        context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);

        context.fill();
    }

    setPosition(newPosition) {
        this.x = newPosition[0];
        this.y = newPosition[1];
    }

    setRadius(newRadius) {
        this.radius = newRadius;
    }

    lerp(from, to, then) {
        if (this.lerpIterations <= 100) {
            let dx = to[0] - from[0];
            let dy = to[1] - from[1];

            let x = from[0] + dx * this.lerpIterations / 100;
            let y = from[1] + dy * this.lerpIterations / 100;

            this.lerpIterations += 1;

            return { x: x, y: y };
        } else {
            this.original = [circle.x, circle.y];
            this.lerpIterations = 0;
            then != null ? then() : 0;
        }
    }
}

class Rectangle {
    constructor(surface, from, to, background, border) {
        this.surface = surface;

        this.from = from;
        this.to = to;

        this.background = background;
        this.border = border;

        surface.stack.push(this);
    }

    runRenderPath() {
        let context = this.surface.context;

        context.beginPath();

        context.fillStyle = this.background;
        context.strokeStyle = this.border;

        this.background != null || this.background != undefined ? context.fillRect(...this.from, ...this.to) : context.rect(...this.from, ...this.to);

        context.fill();
    }

    setFrom(newPosition) {
        this.from = newPosition;
    }

    setTo(newPosition) {
        this.to = newPosition;
    }
}

class Line {
    constructor(surface, from, to, background) {
        this.surface = surface;

        this.from = from;
        this.to = to;
        this.length = Math.sqrt(Math.pow(from[0] - to[0], 2) + Math.pow(from[1] - to[1], 2));

        this.background = background;

        surface.stack.push(this);
    }

    runRenderPath() {
        let context = this.surface.context;

        context.beginPath();

        context.strokeStyle = this.background;

        context.moveTo(...this.from);
        context.lineTo(...this.to);

        context.stroke();
    }
}

let canvas = Canvas(document.querySelector("canvas"));
let ctx = canvas.context;

let circle = new Circle(canvas, [100, 100], 50, "red");
let circle2 = new Circle(canvas, [240, 170], 50, "green");
let circle3 = new Circle(canvas, [370, 120], 50, "blue");

let frames = 0;
let firstFrametime = performance.now();

const Render = function (delta, frametime) {
    canvas.refresh();
}

const Update = function (frametime) {
    let delta = (frametime - canvas.previousFrametime) * 0.1;

    if (frametime - canvas.previousFrametime < canvas.MINIMUM_FRAMETIME) {
        window.requestAnimationFrame(Update);
        return;
    }
    canvas.previousFrametime = frametime;

    // console.log(frames / ((performance.now() - firstFrametime) / 1000));

    Render(delta, frametime);

    frames += 1;

    window.requestAnimationFrame(Update);
}


function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

canvas.experiments().linearInterpolation(circle);
canvas.experiments().mouseMove(circle);

window.requestAnimationFrame(Update);