const MockOptions = () => ({
    getUserMedia: true,
    mediaDevices: {
        getUserMedia: true,
        getSupportedConstraints: true,
        enumerateDevices: true,
    },
});
/**
 * Class for creating mock of getUserMedia for navigator.getUserMedia and navigator.mediaDevice.getUserMedia.
 * Usage: const m = new GetUserMediaMock(); m.setup();
 */
class GetUserMediaMock {
    constructor() {
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
    _storeOldHandles() {
        // @ts-ignore
        navigator._getUserMedia = navigator.getUserMedia;
        if (!navigator.mediaDevices) {
            // Fallback. May have some issues.
            navigator.mediaDevices = {};
        }
        const m = navigator.mediaDevices;
        // @ts-ignore
        m._enumerateDevices = m.enumerateDevices;
        // @ts-ignore
        m._getSupportedConstraints = m.getSupportedConstraints;
        // @ts-ignore
        m._getUserMedia = m.getUserMedia;
        this.state.prepared = true;
    }
    /**
     * Dynamically update constraints. Applied on next call of getUserMedia, etc.
     * @param {string} type any key in this.settings.constraints
     * @param {Partial<MediaStreamConstraints>} updates Data to apply to constraints
     * @param {boolean} overwrite Whether to fully overwrite original.
     */
    updateConstraints(type = "video", updates = {}, overwrite = false) {
        const c = this.settings.constraints;
        if (!c[type]) {
            return false;
        }
        if (overwrite) {
            c[type] = {};
        }
        for (const key in updates) {
            c[type][key] = updates[key];
        }
        return this;
    }
    /**
     * Set media URL for mockType "mediaElement"
     * @param {string} url
     */
    setMediaUrl(url) {
        this.settings.mediaUrl = url;
        return this;
    }
    /**
     * Set a predefined mock type via string or a custom function.
     * @param {MockType} mockType
     */
    setMockType(mockType) {
        this.settings.mockType = mockType;
        return this;
    }
    /**
     * Applies mock to environment ONLY IF getUserMedia constraints fail.
     */
    fallbackMock() {
        if (!this.state.prepared) {
            this._storeOldHandles();
        }
        /**
         * @param {(stream: MediaStream) => void} handle
         */
        const getSuccessHandle = (handle) => {
            /**
             * @param {MediaStream} stream
             */
            return (stream) => {
                this._log("log", "fallback NOT implemented");
                handle(stream);
            };
        };
        /**
         * @param {Error} err
         * @param {MediaStreamConstraints} constraints
         */
        const handleFallback = (err, constraints) => {
            return this.getMockStreamFromConstraints(constraints).then((stream) => {
                this._log("warn", "fallbackMock implemented", err);
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
        navigator.getUserMedia = (constraints, onSuccess, onError) => {
            // @ts-ignore
            navigator._getUserMedia(constraints, getSuccessHandle(onSuccess), (err) => {
                return handleFallback(err, constraints).then(onSuccess).catch(onError);
            });
        };
        /**
         * navigator.mediaDevices.getUserMedia
         * @param {MediaStreamConstraints} constraints
         */
        navigator.mediaDevices.getUserMedia = (constraints) => {
            return new Promise((resolve, reject) => {
                navigator.mediaDevices
                    // @ts-ignore
                    ._getUserMedia(constraints)
                    .then(getSuccessHandle(resolve))
                    .catch((err) => {
                    return handleFallback(err, constraints).then(resolve).catch(reject);
                });
            });
        };
        return this;
    }
    /**
     * Applies mock to environment.
     * Generally should be applied before other scripts once.
     * @param {MockOptions} options Way to only mock certain features. Mocks all by default.
     */
    mock(options) {
        if (typeof options !== "object") {
            options = MockOptions();
        }
        if (!this.state.prepared) {
            this._storeOldHandles();
        }
        // navigator.getUserMedia
        if (options.getUserMedia) {
            // @ts-ignore
            navigator.getUserMedia = (constraints, onSuccess, onError) => {
                return this.getMockStreamFromConstraints(constraints).then(onSuccess).catch(onError);
            };
        }
        if (options.mediaDevices) {
            // navigator.mediaDevices.getUserMedia
            if (options.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia = (constraints) => {
                    return this.getMockStreamFromConstraints(constraints);
                };
            }
            // navigator.mediaDevices.getSupportedConstraints
            if (options.mediaDevices.getSupportedConstraints) {
                // @ts-ignore
                navigator.mediaDevices.getSupportedConstraints = () => {
                    return this.settings.constraints;
                };
            }
            // navigator.mediaDevices.enumerateDevices
            if (options.mediaDevices.enumerateDevices) {
                // @ts-ignore
                navigator.mediaDevices.enumerateDevices = () => {
                    return this.getMockDevices();
                };
            }
        }
        return this;
    }
    /**
     * Restores actually native handles if mock handles already applied.
     */
    restoreOldHandles() {
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
    }
    /**
     * Gets a media stream with motion and color.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream
     * @see https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamDestination
     * @param {MediaStreamConstraints} constraints
     */
    getMockStreamFromConstraints(constraints) {
        let stream = null;
        const mockType = this.settings.mockType;
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
    }
    /**
     * Returns stream that is internally generated using canvas and random data.
     * ONCE STREAM IS NO LONGER NEEDED, SHOULD CALL .stop FUNCTION TO STOP DRAW INTERVAL.
     * @param {MediaStreamConstraints} constraints
     * @return {MediaStream}
     */
    getMockCanvasStream(constraints) {
        const canvas = document.createElement("canvas");
        canvas.width = this.getConstraintBestValue(constraints, "video", "width");
        canvas.height = this.getConstraintBestValue(constraints, "video", "height");
        const meta = this.createStartedRandomCanvasDrawerInterval(canvas);
        this._log("log", "mock canvas meta", meta);
        const stream = canvas.captureStream(this.getConstraintBestValue(constraints, "video", "frameRate"));
        // @ts-ignore
        stream.stop = this._createStopCanvasStreamFunction(stream, meta);
        return stream;
    }
    /**
     * Returns stream with media used as source.
     * @param {MediaStreamConstraints} constraints
     * @return {MediaStream}
     */
    getMockMediaElementStream(constraints) {
        const video = document.createElement("video");
        video.autoplay = true;
        video.loop = true;
        this._log("log", "mediaElement source video", video);
        video.src = this.settings.mediaUrl;
        video.load();
        video.play();
        // @ts-ignore
        return video.captureStream();
    }
    /**
     * Creates and starts an interval that paints randomly to a canvas.
     * @param {HTMLCanvasElement} canvas
     * @returns meta data including interval that can be cleared with window.clearInterval
     */
    createStartedRandomCanvasDrawerInterval(canvas) {
        const FPS = 2;
        const ms = 1000 / FPS;
        const getRandom = (max) => {
            return Math.floor(Math.random() * max);
        };
        const handle = () => {
            const ctx = canvas.getContext("2d");
            const x = 0;
            const y = 0;
            const width = getRandom(canvas.width);
            const height = getRandom(canvas.height);
            const r = getRandom(255);
            const g = getRandom(255);
            const b = getRandom(255);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, y, width, height);
        };
        const interval = window.setInterval(handle, ms);
        // Execute once due to Firefox issue where canvas MUST NOT be empty.
        // Exception... "Component not initialized"  nsresult: "0xc1f30001 (NS_ERROR_NOT_INITIALIZED)"
        handle();
        return {
            canvas: canvas,
            interval: interval,
        };
    }
    /**
     * Gets constraint best value by necessary identifiers.
     * Returns appropriate defaults where important.
     * THIS IS FOR VALUES NOT ACTUAL SET CONTRAINTS.
     * USED FOR settings, etc. in UI.
     * @param {MediaStreamConstraints} constraints
     * @param {MediaStreamTrackType} type
     * @param {keyof MediaStreamTrack} key
     */
    getConstraintBestValue(constraints, type, key) {
        const subConstraints = typeof constraints[type] === "object" ? constraints[type] : {};
        const cVal = subConstraints[key];
        let value;
        if (typeof cVal !== "object") {
            value = cVal;
        }
        else if (cVal) {
            for (const key in cVal) {
                if (key === "ideal") {
                    value = cVal[key];
                    break;
                }
                else {
                    value = cVal[key];
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
    }
    /**
     * Returns a set of mock devices using similar format.
     */
    getMockDevices() {
        const devices = [
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
        return new Promise((resolve) => {
            devices.forEach((device, index) => {
                // @ts-ignore
                device.deviceId = String(index);
                // @ts-ignore
                device.groupId = String(index);
            });
            return resolve(devices);
        });
    }
    /**
     * @param {MediaStream} stream
     * @param {{ interval: number }} meta
     * @return {() => void)}
     */
    _createStopCanvasStreamFunction(stream, meta) {
        return () => {
            window.clearInterval(meta.interval);
            const tracks = stream.getTracks();
            tracks.forEach((track) => {
                track.stop();
            });
            if (stream.stop) {
                stream.stop = undefined;
            }
        };
    }
    _log(type, ...args) {
        if (window.console && window.console[type]) {
            window.console[type](...args);
        }
    }
}
const mock = new GetUserMediaMock();
window.getUserMediaMock = mock;
mock.mock(MockOptions());
alert("ok");
