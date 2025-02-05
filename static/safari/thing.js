var MockOptions = function () { return ({
    getUserMedia: true,
    mediaDevices: {
        getUserMedia: true,
        getSupportedConstraints: true,
        enumerateDevices: true,
    },
}); };
/**
 * Class for creating mock of getUserMedia for navigator.getUserMedia and navigator.mediaDevice.getUserMedia.
 * Usage: const m = new GetUserMediaMock(); m.setup();
 */
var GetUserMediaMock = /** @class */ (function () {
    function GetUserMediaMock() {
        this.DEFAULT_MEDIA = {
            VIDEO: "/video.mp4",
            AUDIO: "-.mp3",
        };
        this.settings = {
            mediaUrl: this.DEFAULT_MEDIA.VIDEO,
            /**
             * @type {MockType}
             */
            mockType: "canvas", // "canvas", "mediaElement", function
            constraints: {
                // Used for supported constraints
                video: {
                    aspectRatio: false, // Upon testing in Chrome, width and height hold priority over aspectRatio.
                    facingMode: false,
                    frameRate: false,
                    height: false,
                    width: false,
                },
                audio: {
                    autoGainControl: false,
                    channelCount: false,
                    echoCancellation: false,
                    latency: false,
                    noiseSuppression: false,
                    sampleRate: false,
                    sampleSize: false,
                    volume: false,
                },
                image: {
                    whiteBalanceMode: false,
                    exposureMode: false,
                    focusMode: false,
                    pointsOfInterest: false,
                    exposureCompensation: false,
                    colorTemperature: false,
                    iso: false,
                    brightness: false,
                    contrast: false,
                    saturation: false,
                    sharpness: false,
                    focusDistance: false,
                    zoom: false,
                    torch: false,
                },
            },
        };
        this.state = {
            prepared: false,
        };
    }
    // noinspection JSConstantReassignment
    GetUserMediaMock.prototype._storeOldHandles = function () {
        // @ts-ignore
        navigator._getUserMedia = navigator.getUserMedia;
        if (!navigator.mediaDevices) {
            // Fallback. May have some issues.
            navigator.mediaDevices = {};
        }
        var m = navigator.mediaDevices;
        // @ts-ignore
        m._enumerateDevices = m.enumerateDevices;
        // @ts-ignore
        m._getSupportedConstraints = m.getSupportedConstraints;
        // @ts-ignore
        m._getUserMedia = m.getUserMedia;
        this.state.prepared = true;
    };
    /**
     * Dynamically update constraints. Applied on next call of getUserMedia, etc.
     * @param {string} type any key in this.settings.constraints
     * @param {Partial<MediaStreamConstraints>} updates Data to apply to constraints
     * @param {boolean} overwrite Whether to fully overwrite original.
     */
    GetUserMediaMock.prototype.updateConstraints = function (type, updates, overwrite) {
        if (type === void 0) { type = "video"; }
        if (updates === void 0) { updates = {}; }
        if (overwrite === void 0) { overwrite = false; }
        var c = this.settings.constraints;
        if (!c[type]) {
            return false;
        }
        if (overwrite) {
            c[type] = {};
        }
        for (var key in updates) {
            c[type][key] = updates[key];
        }
        return this;
    };
    /**
     * Set media URL for mockType "mediaElement"
     * @param {string} url
     */
    GetUserMediaMock.prototype.setMediaUrl = function (url) {
        this.settings.mediaUrl = url;
        return this;
    };
    /**
     * Set a predefined mock type via string or a custom function.
     * @param {MockType} mockType
     */
    GetUserMediaMock.prototype.setMockType = function (mockType) {
        this.settings.mockType = mockType;
        return this;
    };
    /**
     * Applies mock to environment ONLY IF getUserMedia constraints fail.
     */
    GetUserMediaMock.prototype.fallbackMock = function () {
        var _this = this;
        if (!this.state.prepared) {
            this._storeOldHandles();
        }
        /**
         * @param {(stream: MediaStream) => void} handle
         */
        var getSuccessHandle = function (handle) {
            /**
             * @param {MediaStream} stream
             */
            return function (stream) {
                _this._log("log", "fallback NOT implemented");
                handle(stream);
            };
        };
        /**
         * @param {Error} err
         * @param {MediaStreamConstraints} constraints
         */
        var handleFallback = function (err, constraints) {
            return _this.getMockStreamFromConstraints(constraints).then(function (stream) {
                _this._log("warn", "fallbackMock implemented", err);
                return stream;
            });
        };
        /**
         * navigator.getUserMedia
         * @param {MediaStreamConstraints} constraints
         * @param {(stream: MediaStream) => void} onSuccess
         * @param {(err: Error) => void|any} onError
         */
        // @ts-ignore
        navigator.getUserMedia = function (constraints, onSuccess, onError) {
            // @ts-ignore
            navigator._getUserMedia(constraints, getSuccessHandle(onSuccess), function (err) {
                return handleFallback(err, constraints).then(onSuccess).catch(onError);
            });
        };
        /**
         * navigator.mediaDevices.getUserMedia
         * @param {MediaStreamConstraints} constraints
         */
        navigator.mediaDevices.getUserMedia = function (constraints) {
            return new Promise(function (resolve, reject) {
                navigator.mediaDevices
                    // @ts-ignore
                    ._getUserMedia(constraints)
                    .then(getSuccessHandle(resolve))
                    .catch(function (err) {
                    return handleFallback(err, constraints).then(resolve).catch(reject);
                });
            });
        };
        return this;
    };
    /**
     * Applies mock to environment.
     * Generally should be applied before other scripts once.
     * @param {MockOptions} options Way to only mock certain features. Mocks all by default.
     */
    GetUserMediaMock.prototype.mock = function (options) {
        var _this = this;
        if (typeof options !== "object") {
            options = MockOptions();
        }
        if (!this.state.prepared) {
            this._storeOldHandles();
        }
        // navigator.getUserMedia
        if (options.getUserMedia) {
            // @ts-ignore
            navigator.getUserMedia = function (constraints, onSuccess, onError) {
                return _this.getMockStreamFromConstraints(constraints).then(onSuccess).catch(onError);
            };
        }
        if (options.mediaDevices) {
            // navigator.mediaDevices.getUserMedia
            if (options.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia = function (constraints) {
                    return _this.getMockStreamFromConstraints(constraints);
                };
            }
            // navigator.mediaDevices.getSupportedConstraints
            if (options.mediaDevices.getSupportedConstraints) {
                // @ts-ignore
                navigator.mediaDevices.getSupportedConstraints = function () {
                    return _this.settings.constraints;
                };
            }
            // navigator.mediaDevices.enumerateDevices
            if (options.mediaDevices.enumerateDevices) {
                // @ts-ignore
                navigator.mediaDevices.enumerateDevices = function () {
                    return _this.getMockDevices();
                };
            }
        }
        return this;
    };
    /**
     * Restores actually native handles if mock handles already applied.
     */
    GetUserMediaMock.prototype.restoreOldHandles = function () {
        // @ts-ignore
        if (navigator._getUserMedia) {
            // @ts-ignore
            navigator.getUserMedia = navigator._getUserMedia;
            // @ts-ignore
            navigator._getUserMedia = null;
        }
        // @ts-ignore
        if (navigator.mediaDevices && navigator.mediaDevices._getUserMedia) {
            navigator.mediaDevices.enumerateDevices =
                // @ts-ignore
                navigator.mediaDevices._enumerateDevices;
            navigator.mediaDevices.getSupportedConstraints =
                // @ts-ignore
                navigator.mediaDevices._getSupportedConstraints;
            navigator.mediaDevices.getUserMedia =
                // @ts-ignore
                navigator.mediaDevices._getUserMedia;
        }
        this.state.prepared = false;
    };
    /**
     * Gets a media stream with motion and color.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream
     * @see https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamDestination
     * @param {MediaStreamConstraints} constraints
     */
    GetUserMediaMock.prototype.getMockStreamFromConstraints = function (constraints) {
        var stream = null;
        var mockType = this.settings.mockType;
        if (mockType === "canvas") {
            stream = this.getMockCanvasStream(constraints);
        }
        else if (mockType === "mediaElement") {
            stream = this.getMockMediaElementStream(constraints);
        }
        else if (typeof mockType === "function") {
            // @ts-ignore
            stream = mockType(constraints);
        }
        else {
            throw new Error("invalid mockType: " + String(mockType));
        }
        return Promise.resolve(stream);
    };
    /**
     * Returns stream that is internally generated using canvas and random data.
     * ONCE STREAM IS NO LONGER NEEDED, SHOULD CALL .stop FUNCTION TO STOP DRAW INTERVAL.
     * @param {MediaStreamConstraints} constraints
     * @return {MediaStream}
     */
    GetUserMediaMock.prototype.getMockCanvasStream = function (constraints) {
        var canvas = document.createElement("canvas");
        canvas.width = this.getConstraintBestValue(constraints, "video", "width");
        canvas.height = this.getConstraintBestValue(constraints, "video", "height");
        var meta = this.createStartedRandomCanvasDrawerInterval(canvas);
        this._log("log", "mock canvas meta", meta);
        var stream = canvas.captureStream(this.getConstraintBestValue(constraints, "video", "frameRate"));
        // @ts-ignore
        stream.stop = this._createStopCanvasStreamFunction(stream, meta);
        return stream;
    };
    /**
     * Returns stream with media used as source.
     * @param {MediaStreamConstraints} constraints
     * @return {MediaStream}
     */
    GetUserMediaMock.prototype.getMockMediaElementStream = function (constraints) {
        var video = document.createElement("video");
        video.autoplay = true;
        video.loop = true;
        this._log("log", "mediaElement source video", video);
        video.src = this.settings.mediaUrl;
        video.load();
        video.play();
        // @ts-ignore
        return video.captureStream();
    };
    /**
     * Creates and starts an interval that paints randomly to a canvas.
     * @param {HTMLCanvasElement} canvas
     * @returns meta data including interval that can be cleared with window.clearInterval
     */
    GetUserMediaMock.prototype.createStartedRandomCanvasDrawerInterval = function (canvas) {
        var FPS = 2;
        var ms = 1000 / FPS;
        var getRandom = function (max) {
            return Math.floor(Math.random() * max);
        };
        var handle = function () {
            var ctx = canvas.getContext("2d");
            var x = 0;
            var y = 0;
            var width = getRandom(canvas.width);
            var height = getRandom(canvas.height);
            var r = getRandom(255);
            var g = getRandom(255);
            var b = getRandom(255);
            ctx.fillStyle = "rgb(".concat(r, ",").concat(g, ",").concat(b, ")");
            ctx.fillRect(x, y, width, height);
        };
        var interval = window.setInterval(handle, ms);
        // Execute once due to Firefox issue where canvas MUST NOT be empty.
        // Exception... "Component not initialized"  nsresult: "0xc1f30001 (NS_ERROR_NOT_INITIALIZED)"
        handle();
        return {
            canvas: canvas,
            interval: interval,
        };
    };
    /**
     * Gets constraint best value by necessary identifiers.
     * Returns appropriate defaults where important.
     * THIS IS FOR VALUES NOT ACTUAL SET CONTRAINTS.
     * USED FOR settings, etc. in UI.
     * @param {MediaStreamConstraints} constraints
     * @param {MediaStreamTrackType} type
     * @param {keyof MediaStreamTrack} key
     */
    GetUserMediaMock.prototype.getConstraintBestValue = function (constraints, type, key) {
        var subConstraints = typeof constraints[type] === "object" ? constraints[type] : {};
        var cVal = subConstraints[key];
        var value;
        if (typeof cVal !== "object") {
            value = cVal;
        }
        else if (cVal) {
            for (var key_1 in cVal) {
                if (key_1 === "ideal") {
                    value = cVal[key_1];
                    break;
                }
                else {
                    value = cVal[key_1];
                }
            }
        }
        // Defaults
        if (key === "width" && !value) {
            value = 640;
        }
        if (key === "height" && !value) {
            value = 480;
        }
        if (key === "frameRate" && !value) {
            value = 15;
        }
        return value;
    };
    /**
     * Returns a set of mock devices using similar format.
     */
    GetUserMediaMock.prototype.getMockDevices = function () {
        var devices = [
            {
                kind: "audioinput",
                label: "(4- BUFFALO BSW32KM03 USB PC Camera)",
            },
            {
                kind: "audiooutput",
                label: "Bluetooth Hands-free Audio",
            },
            {
                kind: "videooutput",
                label: "BUFFALO BSW32KM03 USB PC Camera",
            },
        ];
        return new Promise(function (resolve) {
            devices.forEach(function (device, index) {
                // @ts-ignore
                device.deviceId = String(index);
                // @ts-ignore
                device.groupId = String(index);
            });
            return resolve(devices);
        });
    };
    /**
     * @param {MediaStream} stream
     * @param {{ interval: number }} meta
     * @return {() => void)}
     */
    GetUserMediaMock.prototype._createStopCanvasStreamFunction = function (stream, meta) {
        return function () {
            window.clearInterval(meta.interval);
            var tracks = stream.getTracks();
            tracks.forEach(function (track) {
                track.stop();
            });
            if (stream.stop) {
                stream.stop = undefined;
            }
        };
    };
    GetUserMediaMock.prototype._log = function (type) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (window.console && window.console[type]) {
            (_a = window.console)[type].apply(_a, args);
        }
    };
    return GetUserMediaMock;
}());
var mock = new GetUserMediaMock();
window.getUserMediaMock = mock;
mock.mock(MockOptions());
alert("ok");
