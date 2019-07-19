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

const MAX_PLAY_DIFF = 0.5
const MAX_PLAY_COUNTER = 30
// const DEFAULT_REOPEN_AFTER_TIMEOUT = 30000

const DEFAULT_ERROR_TIMEOUT = 10000
const DEFAULT_RECONNECT_TIMEOUT = 4000

const STATE_INITIALIZING = 0
const STATE_IDLE         = 1
const STATE_LOADING      = 2
const STATE_PLAYING      = 3
// const STATE_ERROR        = 4
const STATE_RECONNECTING = 5
// const STATE_DESTROYED    = 6


export default {
    props: {
        src: String,
        aspectratio: { type: String, default: "" },
        buffertime: { type: Number, default: 0.5 }
    },
    data() {
        return {
            // errorTimer: null, // errorTimer won't be in data as I don't want it to be reactive.
            // reconnectTimer: null, // reconnectTimer won't be in data as I don't want it to be reactive.
            playingSrc: this.src || "",
            state: STATE_INITIALIZING,
            overplayCounter: 0
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
        } else {
            this.state = STATE_IDLE
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
                    this.state = STATE_PLAYING
                    console.log("It began playin in THEN", this.playingSrc)
                    this.cancelErrorTimer()
                    this.cancelReconnectTimer()
                })
                .catch(ex => {
                    // this.state = STATE_ERROR
                    console.log("It failed", ex)
                    this.cancelErrorTimer()
                    this.startReconnectTimer()
                });
        },
        startErrorTimer( ms = DEFAULT_ERROR_TIMEOUT ) {
            this.cancelErrorTimer();
            console.log("Starting error timer", ms);
            this.errorTimer = window.setTimeout(this.onErrorTimer, ms);
        },
        cancelErrorTimer() {
            if ( this.errorTimer !== null ) {
                console.log("Stopping error Timer");
                window.clearTimeout(this.errorTimer);
                this.errorTimer = null;
            }
        },
        onErrorTimer() {
            // console.log("On error timer", this.state)
            this.errorTimer = null;
            if ( this.state === STATE_LOADING ) {
                // this.displayMessage = "视频流超时！";
                // if ( this.connected === true ) {
                //     this.state = STATE_ERROR;
                // } else {
                    this._closePlayer();
                    this.startReconnectTimer();
                // }
            }
        },
        startReconnectTimer( ms = DEFAULT_RECONNECT_TIMEOUT ) {
            this.cancelReconnectTimer()
            console.log("Starting reconnect timer", ms)
            this.state = STATE_RECONNECTING
            // this.displayMessage = "连接失败..."
            this.reconnectTimer = window.setTimeout(this.onReconnectTimer, ms)
        },
        cancelReconnectTimer() {
            if ( this.reconnectTimer !== null ) {
                console.log("Stopping reconnect Timer");
                window.clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
        },
        onReconnectTimer() {
            // console.log("On reconnect timer", this.state)
            this.reconnectTimer = null;
            if ( this.state === STATE_RECONNECTING ) {
                this.state = STATE_IDLE;
            
                if ( this.playingSrc.length > 0 ) {
                    this.play(this.playingSrc);
                }
            }
        },
        _closePlayer() {
            if (this.player != null) {
                this.player.unload();
                this.player.detachMediaElement();
                this.player.destroy();
                this.player = null;
            }

            this.cancelReconnectTimer();
            this.cancelErrorTimer();
        },
        play(url) {
            this._closePlayer();

            if (url === undefined || url === null || url.length === 0) {
                this.playingSrc = "";
                this.state = STATE_IDLE;
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
                deferLoadAfterSourceOpen: false,


                statisticsInfoReportInterval: 1000,
                autoCleanupSourceBuffer: true,
                autoCleanupMaxBackwardDuration: 3,
                autoCleanupMinBackwardDuration: 2
            });

            this.player.attachMediaElement(this.$refs.videoel);

            // "NetworkError", "HttpStatusCodeInvalid", {code: 500, msg:"Internal Server Error"}
            this.player.on(flvjs.Events.ERROR, (event_type,error_type,error_object) => {
                console.log("ERROR", event_type, error_type, error_object);
                this.startReconnectTimer();
            });

            // this happens when video stops, for example stopping the ai task
            // maybe this event appears because of nginx configuration about notify_xx ??
            this.player.on(flvjs.Events.LOADING_COMPLETE, (evt) => {
                console.log("LOADING_COMPLETE", evt);
                this.startReconnectTimer();
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
                decodedFrames: 60 // could use this, if decodeFrames stays the same don't reset the timer
                droppedFrames: 0
                hasRedirect: false
                loaderType: "fetch-stream-loader"
                playerType: "FlvPlayer"
                speed: 328.6650390625
                totalSegmentCount: 1
                url: "http://192.168.2.187:28081/video/live/cam_1_4"
            */
            // can use this event to detect video didn't start or no more frames
            // this.player.on(flvjs.Events.STATISTICS_INFO, function(stats) {console.log("STATISTICS_INFO", stats);});
            this.player.on(flvjs.Events.STATISTICS_INFO, this._onStatisticsInfo);

            // console.log(this.player);

            this.player.load();
            this.startErrorTimer();
            this.state = STATE_LOADING;

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
        },
        _onStatisticsInfo(stats) {
            if ( this.state === STATE_LOADING ) {
                if ( stats.decodedFrames > 0 ) {
                    this.state = STATE_PLAYING
                    console.log("It began playin in STATISTICS", this.playingSrc)
                    this.cancelErrorTimer()
                    this.cancelReconnectTimer()
                    // console.log("Removing stats event because we are playing");
                    // this.player.off(flvjs.Events.STATISTICS_INFO, this._onStatisticsInfo);
                    // console.log("Status:", this.state, "Stats:", stats);
                }
                
            } else { // here later might implement other states checks, remove the stats off line
                if ( this.player.buffered.length > 0 ) {
                    const buffered = this.player.buffered
                    const buffered_end = buffered.end(0)
                    const current_time = this.player.currentTime
                    const total_buffered = buffered_end - buffered.start(0)
                    const play_diff = buffered_end - current_time

                    // console.log(total_buffered.toFixed(3), current_time.toFixed(3), buffered_end.toFixed(3), play_diff.toFixed(3) )

                    if ( play_diff > MAX_PLAY_DIFF ) {
                        if ( ++this.overplayCounter >= MAX_PLAY_COUNTER ) {
                            this.overplayCounter = 0
                            // `current_time + 0.4` is bad, sometimes time will be farther than that and will never get there
                            // `buffered_end` is also bad because it might never get a buffer to play
                            if (  total_buffered > 0.1 ) {
                                const new_time = buffered_end - 0.1
                                console.log("Adjusting time due to drift to", new_time.toFixed(3))
                                this.$nextTick(() => this.player.currentTime = new_time)
                            } else {
                                console.log("COULDN'T ADJUST TIME BECAUSE BUFFER DIDN'T HAVE ENOUGHT")
                            }
                        }
                    } else {
                        this.overplayCounter = 0;
                    }
                }

                // console.log("Removing stats event (within the event itself) because we are not loading anymore");
                // this.player.off(flvjs.Events.STATISTICS_INFO, this._onStatisticsInfo);
            }
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