<script>
import flvjs from "flv.js"
import settings from "./settings"

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

const STATE_INITIALIZING = 0
const STATE_IDLE         = 1
const STATE_LOADING      = 2
const STATE_PLAYING      = 3
const STATE_ERROR        = 4
const STATE_RECONNECTING = 5
// const STATE_DESTROYED    = 6

export default {
    props: {
        src: String,
        aspectratio: { type: String, default: "" },
        buffertime: { type: Number, default: 0.5 },
        audio: { type: Boolean, default: false }
    },
    data() {
        return {
            // errorTimer: null, // errorTimer won't be in data as I don't want it to be reactive.
            // reconnectTimer: null, // reconnectTimer won't be in data as I don't want it to be reactive.
            playingSrc: this.src || "",
            state: STATE_INITIALIZING,
            displayMessage: "",
            overplayCounter: 0,
        };
    },
    computed: {
        showingMessage() {
            return this.state === STATE_ERROR || this.state === STATE_RECONNECTING;
        },
        panelClass() {
            return {
                idle:    this.state === STATE_IDLE,
                loading: this.state === STATE_LOADING,
                error:   this.state === STATE_ERROR || this.state === STATE_RECONNECTING
            };
        }
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
    beforeDestroy() {
        this.stop()
    },
    methods: {
        onVideoDoubleClick() {
            console.log(this.playingSrc, "Will try to toggle full screen");
            toggleFullscreen(this.$refs.videoel.parentNode);
        },
        onLoadedMetadata() {
            // console.log("on metadata loaded")
            this.player
                .play()
                // WARNING: due to mediaserver gop_cache we need to detect the
                // begin_playing event on the statistics, so we can jump to
                // current time.
                // Here we will just check for other errors.
                .catch(ex => {
                    // this.state = STATE_ERROR
                    console.log(this.playingSrc, "Playing failed:", ex)
                    this.displayMessage = "播放错误！";
                    this.cancelErrorTimer()
                    this.startReconnectTimer()
                });
        },
        startErrorTimer() {
            this.cancelErrorTimer();
            const ms = settings.play_timeout
            console.log(this.playingSrc, "Starting error timer", ms);
            this.errorTimer = window.setTimeout(this.onErrorTimer, ms);
        },
        cancelErrorTimer() {
            if ( this.errorTimer !== null ) {
                console.log(this.playingSrc, "Stopping error Timer");
                window.clearTimeout(this.errorTimer);
                this.errorTimer = null;
            }
        },
        onErrorTimer() {
            // console.log("On error timer", this.state)
            this.errorTimer = null;
            if ( this.state === STATE_LOADING ) {
                    this.displayMessage = "播放视频超时！";
                // if ( this.connected === true ) {
                //     this.state = STATE_ERROR;
                // } else {
                    this._closePlayer();
                    this.startReconnectTimer();
                // }
            }
        },
        startReconnectTimer() {
            this.cancelReconnectTimer()
            const ms = settings.reconnect_delay
            console.log(this.playingSrc, "Starting reconnect timer", ms)
            this.state = STATE_RECONNECTING
            // this.displayMessage = "连接失败..."
            this.reconnectTimer = window.setTimeout(this.onReconnectTimer, ms)
        },
        cancelReconnectTimer() {
            if ( this.reconnectTimer !== null ) {
                console.log(this.playingSrc, "Stopping reconnect Timer");
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
            this.state = STATE_IDLE
            
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
                enableStashBuffer: true,
                stashInitialSize: 64 * 1024, // 224
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
                console.log(this.playingSrc, "ERROR", event_type, error_type, error_object);
                this.startReconnectTimer();
            });

            // this happens when video stops, for example stopping the ai task
            // maybe this event appears because of nginx configuration about notify_xx ??
            this.player.on(flvjs.Events.LOADING_COMPLETE, (evt) => {
                console.log(this.playingSrc, "LOADING_COMPLETE", evt);
                this.startReconnectTimer();
            });

            // none of these 4 events seems to happen, I think we should get the
            // events from the video tag.
            this.player.on(flvjs.Events.RECOVERED_EARLY_EOF, function() {
                console.log(this.playingSrc, "RECOVERED_EARLY_EOF", arguments);
            });
            this.player.on(flvjs.Events.MEDIA_INFO, function() {
                console.log(this.playingSrc, "MEDIA_INFO", arguments);
            });
            this.player.on(flvjs.Events.METADATA_ARRIVED, function() {
                console.log(this.playingSrc, "METADATA_ARRIVED", arguments);
            });
            this.player.on(flvjs.Events.SCRIPTDATA_ARRIVED, function() {
                console.log(this.playingSrc, "SCRIPTDATA_ARRIVED", arguments);
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

            // const videoel = this.$refs.videoel
            // videoel.addEventListener('play', ev => {
            //     console.log(this.playingSrc, "play", ev)
            // })

            // videoel.addEventListener('playing', ev => {
            //     console.log(this.playingSrc, "playing", ev)
            // })

            // videoel.addEventListener('waiting', ev => {
            //     console.log(this.playingSrc, "waiting", ev)
            // })
            


            this.player.load();

            // this.$refs.videoel.playbackRate = 1.02
            this.startErrorTimer();
            this.state = STATE_LOADING;

            this.playingSrc = url;
        },
        stop() {
            if (this.playingSrc !== "") {
                this.playingSrc = "";
                this._closePlayer();
            }
        },
        getVideoElement() {
            return this.$refs.videoel;
        },
        /**
         * Captures an image and returns it as 'canvas'
         */
        captureImage() {
            const vel = this.getVideoElement()
            if ( vel.videoHeight > 0 && vel.videoWidth > 0 ) {
                const canvas = document.createElement("canvas")
                canvas.width = vel.videoWidth
                canvas.height = vel.videoHeight
                canvas.getContext('2d').drawImage(vel, 0, 0)

                return canvas
            }

            return null
        },
        onBeforeLeave() {
            this._closePlayer();
        },
        _onStatisticsInfo(stats) {
            if ( this.state === STATE_LOADING ) {
                if ( stats.decodedFrames > 0 ) {
                    this.state = STATE_PLAYING
                    console.log(this.playingSrc, "began playin in statistics")
                    this.cancelErrorTimer()
                    this.cancelReconnectTimer()

                    if ( this.player.buffered.length > 0 ) {
                        const buffered = this.player.buffered
                        const buffered_end = buffered.end(0)
                        const current_time = this.player.currentTime
                        // const total_buffered = buffered_end - buffered.start(0)
                        const play_diff = buffered_end - current_time

                        if ( play_diff > settings.max_diff ) {
                            this.player.playbackRate = 1.0 + settings.speed_step
                    //         if (  total_buffered > 0.1 ) {
                    //             const new_time = buffered_end - 0.1
                    //             console.log("Adjusting --- INITIAL --- time to", new_time.toFixed(3))
                    //             this.$nextTick(() => this.player.currentTime = new_time)
                    //         } else {
                    //             console.log("COULDN'T ADJUST --- INITIAL --- TIME BECAUSE BUFFER DIDN'T HAVE ENOUGHT")
                    //         }
                        }
                    }

                }
                
            } else { // here later might implement other states checks, remove the stats off line

                // console.log(this.playingSrc, "paused=", this.$refs.videoel.paused, stats)

                // if ( this.$refs.videoel.paused ) {
                //     console.log(this.playingSrc, "CHROME browser stopped the video, trying to play")
                //     this.$refs.videoel.play()
                //         .then(r => {
                //             console.log(this.playingSrc, "UNPAUSED", r)
                //         })
                //         .catch((p1,p2,p3) => {
                //             console.log(this.playingSrc, "unpause error", p1, p2 ,p3)
                //         })
                // }

                if ( this.player.buffered.length > 0 ) {
                    const buffered = this.player.buffered
                    const buffered_end = buffered.end(0)
                    const current_time = this.player.currentTime
                    // const total_buffered = buffered_end - buffered.start(0)
                    const play_diff = buffered_end - current_time

                    // console.log(total_buffered.toFixed(3), current_time.toFixed(3), buffered_end.toFixed(3), play_diff.toFixed(3) )

                    if ( play_diff > settings.max_diff ) {
                        if ( ++this.overplayCounter >= settings.check_step ) {
                            this.overplayCounter = 0

                            const current_rate = this.$refs.videoel.playbackRate
                            if ( current_rate < settings.speed_max ) {
                                const next_val  = Math.min(settings.speed_max, current_rate + settings.speed_step)
                                console.log(this.playingSrc, "Increasing speed due to play_diff", play_diff, "next speed", next_val)
                                this.$refs.videoel.playbackRate = next_val
                            } else {
                                console.log(this.playingSrc, "Speed already at max, play_diff", play_diff)
                            }

                            // `current_time + 0.4` is bad, sometimes time will be farther than that and will never get there
                            // `buffered_end` is also bad because it might never get a buffer to play
                            // if ( total_buffered > 0.5 ) {
                            //     const new_time = buffered_end - 0.5
                            //     console.log(`Adjusting time due to drift of ${this.playingSrc} from ${current_time} to`, new_time.toFixed(3))
                            //     this.$nextTick(() => this.player.currentTime = new_time)
                            // } else {
                            //     console.log("COULDN'T ADJUST TIME BECAUSE BUFFER DIDN'T HAVE ENOUGHT")
                            // }
                        }
                    } else if ( play_diff <= settings.min_diff ) {
                        const current_rate = this.$refs.videoel.playbackRate
                        if ( current_rate > 1.0 ) {
                            console.log(this.playingSrc, "Setting speed to normal")
                            this.$refs.videoel.playbackRate = settings.speed_normal
                        }
                    } else {
                        this.overplayCounter = 0;
                    }
                }
            }
        },
        _onVideoPlay() {
            this.state = STATE_PLAYING
            console.log(this.playingSrc, "began playing in on-play")
            this.cancelErrorTimer()
            this.cancelReconnectTimer()
            if ( this.autopaused === true ) {
                this.autopaused = false
                if ( this.playingSrc !== null && this.playingSrc.length > 0 )
                    this.play(this.playingSrc)
            }
        },
        _onVideoPaused() {
            console.log(this.playingSrc, "ON-PAUSE")
            this.autopaused = true
            this.player.unload()
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
<template>
    <div class="cvideoplayer-container">
        <div class="cvideoplayer-single">
            <video
                class="videoel"
                :class="{fill: aspectratio === 'fill'}"
                ref="videoel"
                oncontextmenu="return false;"
                @dblclick.stop="onVideoDoubleClick"
                @loadedmetadata="onLoadedMetadata"
                @play="_onVideoPlay"
                @pause="_onVideoPaused"
                :muted="!audio"
            ></video>
            <div class="cvideoplayer-panel" v-bind:class="panelClass">
                <i v-if="state === 0" class="el-icon-loading"></i>
                <div v-if="showingMessage" class="centered-message">{{displayMessage}}</div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.cvideoplayer-container {
    position: relative;
    height: 100%;
}

.cvideoplayer-single {
    border-radius: inherit;
    position: absolute;
    display: flex;
    width: 100%;
    height: 100%;
    background-color: #1b1c20;
    color: white;
    box-sizing: border-box;
    /*border: 5px solid red;*/
}

.cvideoplayer-panel {
    border-radius: inherit;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    color: white;
    display: none;
}

.cvideoplayer-panel.idle {
    display: block;
    background-color: #1b1c20;
    background-image: url(~@/cvideoplayer/images/stopped-bg.png);
    background-position: center;
    background-repeat: no-repeat;
}

.cvideoplayer-panel.loading {
    display: block;
    background: black url(~@/cvideoplayer/images/loading.gif) no-repeat center;
}

.cvideoplayer-panel.error {
    display: table;
    border: 5px solid yellow;
}

.cvideoplayer-panel.error > .centered-message {
    display: table-cell;
    vertical-align: middle;
    text-align: center;
}

.videoel {
    border-radius: inherit;
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
