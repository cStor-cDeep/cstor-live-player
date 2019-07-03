<template>
    <div class="cvideoplayer-single">
        <video
            class="videoel"
            :class="{fill: aspectratio === 'fill'}"
            ref="videoel"
            oncontextmenu="return false;"
            @dblclick.stop="onVideoDoubleClick"
            @loadedmetadata="onLoadedMetadata"
            muted
        ></video>
    </div>
</template>
<script>
import flvjs from "flv.js";

function toggleFullscreen(elem) {
    elem = elem || document.documentElement;
    if (
        !document.fullscreenElement &&
        !document.mozFullScreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement
    ) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

export default {
    props: {
        src: String,
        aspectratio: { type: String, default: "" },
        buffertime: { type: Number, default: 0.5 }
    },
    data() {
        return {
            playingSrc: this.src || ""
        };
    },
    created() {
        this.player = null;
    },
    mounted() {
        if (
            this.src !== undefined &&
            this.src !== null &&
            this.src.length > 0
        ) {
            this.play(this.src);
        }
    },
    methods: {
        onVideoDoubleClick() {
            console.log("Will try to toggle full screen");
            toggleFullscreen(this.$refs.videoel.parentNode);
        },
        onLoadedMetadata() {
            // console.log("on metadata loaded")
            this.player
                .play()
                .then(() => {
                    console.log("It began playin", this.playingSrc);
                })
                .catch(ex => {
                    console.log("It failed", ex);
                });
        },
        _closePlayer() {
            if (this.player != null) {
                this.player.unload();
                this.player.detachMediaElement();
                this.player.destroy();
                this.player = null;
            }
        },
        play(url) {
            this._closePlayer();

            if (url === undefined || url === null || url.length === 0) {
                this.playingSrc = "";
                return;
            }

            var mediaDataSource = {
                type: "flv",
                url: url,
                isLive: true,
                cors: true
            };

            this.player = flvjs.createPlayer(mediaDataSource, {
                enableWorker: false,
                enableStashBuffer: false,
                // stashInitialSize: 1024*1024*3,
                // enableStashBuffer: false,
                // stashInitialSize: 0,
                lazyLoad: false,
                lazyLoadMaxDuration: 0,
                deferLoadAfterSourceOpen: false
            });

            this.player.attachMediaElement(this.$refs.videoel);

            // "NetworkError", "HttpStatusCodeInvalid", {code: 500, msg:"Internal Server Error"}
            this.player.on(flvjs.Events.ERROR, function(
                event_type,
                error_type,
                error_object
            ) {
                console.log("ERROR", event_type, error_type, error_object);
            });

            // this happens when video stops, for example stopping the ai task
            // maybe this event appears because of nginx configuration about notify_xx ??
            this.player.on(flvjs.Events.LOADING_COMPLETE, function() {
                console.log("LOADING_COMPLETE", arguments);
            });

            // none of these 4 events seems to happen, I think we should get the
            // events from the video tag.
            this.player.on(flvjs.Events.RECOVERED_EARLY_EOF, function() {
                console.log("RECOVERED_EARLY_EOF", arguments);
            });
            this.player.on(flvjs.Events.MEDIA_INFO, function() {
                console.log("MEDIA_INFO", arguments);
            });
            this.player.on(flvjs.Events.METADATA_ARRIVED, function() {
                console.log("METADATA_ARRIVED", arguments);
            });
            this.player.on(flvjs.Events.SCRIPTDATA_ARRIVED, function() {
                console.log("SCRIPTDATA_ARRIVED", arguments);
            });

            // statistics works, maybe could use them to detect if there are problems with the video

            /* Statistics:
                currentSegmentIndex: 0
                decodedFrames: 60
                droppedFrames: 0
                hasRedirect: false
                loaderType: "fetch-stream-loader"
                playerType: "FlvPlayer"
                speed: 328.6650390625
                totalSegmentCount: 1
                url: "http://192.168.2.187:28081/video/live/cam_1_4"
            */
            // can use this event to detect video didn't start or no more frames
            // this.player.on(flvjs.Events.STATISTICS_INFO, function() {console.log("STATISTICS_INFO", arguments);});

            // console.log(this.player);

            this.player.load();

            // play() was moved to onLoadedMetadata event on the video tag
            // this.player.play()
            //     .then( function() {
            //             console.log("It began playin", url);
            //     })
            //     .catch( function(ex) {
            //             console.log("It failed", ex);
            //     });

            this.playingSrc = url;
        },
        stop() {
            if (this.playingSrc !== "") {
                this.playingSrc = "";
                this._closePlayer();
            }
        },
        onBeforeLeave() {
            this._closePlayer();
        }
    },
    watch: {
        src(newVal) {
            if (newVal !== null && newVal.length > 0) {
                this.play(newVal);
            } else {
                this.stop();
            }
        }
    }
};
</script>
<style scoped>
.cvideoplayer-single {
    position: absolute;
    display: flex;
    width: 100%;
    height: 100%;
    background-color: #1b1c20;
    color: white;
    box-sizing: border-box;
    /*border: 5px solid red;*/
}

.videoel {
    min-width: 100%;
    min-height: 100%;
}

.videoel.fill {
    object-fit: fill;
}

/* this fix chrome bug: if video controls are hidden, but we enter
     * fullscreen mode programatically, it will show the video controls again!!
     */
.videoel::-webkit-media-controls-enclosure {
    display: none !important;
}
</style>