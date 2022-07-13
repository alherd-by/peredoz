let SCHEME_RED_GREEN = 0, SCHEME_RED_BLUE_16 = 1, SCHEME_RED_BLUE_32 = 2;

const colorSchemes = {
    [SCHEME_RED_GREEN]: {
        name: '',
        color: 'linear-gradient(to right, #2df700 0%,#fff200 50%,#ff0000 100%)'
    },
    [SCHEME_RED_BLUE_16]: {
        name: 16,
        color: 'linear-gradient(to right, #0015ff 0%,#00fceb 29%,#00fceb 43%,#2df700 53%,#fff200 70%,#ff0000 100%)'
    },
    [SCHEME_RED_BLUE_32]: {
        name: 32,
        color: 'linear-gradient(to right, #0015ff 0%,#00fceb 29%,#00fceb 43%,#2df700 53%,#fff200 70%,#ff0000 100%)'
    }
}

const calcColor = (value, color_scheme) => {
    if (value > 1.0) value = 1.0;
    if (value < 0) value = 0;

    var r, g;
    var q = 1;
    if (color_scheme === SCHEME_RED_GREEN) {
        if (value < 0.5) {
            g = 255;
            value /= 0.5;
            r = (value * 255) | 0;
        } else {
            value -= 0.5;
            value /= 0.5;
            g = ((1 - value) * 255) | 0;
            r = 255;
        }
        return {
            r: r | 0,
            g: g | 0,
            b: 0
        };
    } else if (color_scheme === SCHEME_RED_BLUE_16) {
        q = 16;
    } else if (color_scheme === SCHEME_RED_BLUE_32) {
        q = 32;
    }
    let gray = (((value * q) | 0) / q) * 2 - 1;
    return {
        r: (255 * red(gray)) | 0,
        g: (255 * green(gray)) | 0,
        b: (255 * blue(gray)) | 0
    };
}


function interpolate(val, y0, x0, y1, x1) {
    return (val - x0) * (y1 - y0) / (x1 - x0) + y0;
}

function blue(grayscale) {
    if (grayscale < -0.33) return 1.0;
    else if (grayscale < 0.33) return interpolate(grayscale, 1.0, -0.33, 0.0, 0.33);
    else return 0.0;
}

function green(grayscale) {
    if (grayscale < -1.0) return 0.0; // unexpected grayscale value
    if (grayscale < -0.33) return interpolate(grayscale, 0.0, -1.0, 1.0, -0.33);
    else if (grayscale < 0.33) return 1.0;
    else if (grayscale <= 1.0) return interpolate(grayscale, 1.0, 0.33, 0.0, 1.0);
    else return 1.0; // unexpected grayscale value
}

function red(grayscale) {
    if (grayscale < -0.33) return 0.0;
    else if (grayscale < 0.33) return interpolate(grayscale, 0.0, -0.33, 1.0, 0.33);
    else return 1.0;
}

export {colorSchemes, SCHEME_RED_GREEN, SCHEME_RED_BLUE_32, SCHEME_RED_BLUE_16, calcColor}
