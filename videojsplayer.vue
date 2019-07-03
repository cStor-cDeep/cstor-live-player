<template>
    <div class="cvideoplayer-single">
        <video ref="video" class="video-js vjs-default-skin vjs-fill vjs-live"></video>
    </div>
</template>
<script>
import 'video.js/dist/video-js.css'
import videojs from 'video.js'
import 'videojs-flash'
import swf from 'videojs-swf/dist/video-js.swf'
// import swf from './digitalStyx-video-js-5.4.0.swf'

videojs.options.flash.swf = swf

export default {
    props: {
        src: String
    },
    data() {
        return {
            player: null,
            playingSrc: ""
        }
    },
    methods: {
        _closePlayer() {
            const p = this.player
            if ( p !== null ) {
                this.player = null
                p.dispose()
            }
        },
        play(url) {
            this._closePlayer();

            if ( url === undefined || url === null || url.length === 0) {
                this.playingSrc = "";
                return;
            }

            const options = {
				autoplay: true,
                controls: false,
                width: "200",
                heigth: "200",
                
                techOrder: ["flash"],
				sources: [
					{
                        src: url,
                        // type: "rtmp/mp4"
						type: "video/flv"
					}
				]
            }
            
            this.player = videojs(this.$refs.video, options, function onPlayerReady() {
                console.log('onPlayerReady', this);
            })

            this.playingSrc = url;
        },
        stop() {
            if ( this.playingSrc !== "" ) {
                this.playingSrc = "";
                this._closePlayer();
            }
        }
    },
    mounted() {
        if ( this.src !== undefined && this.src !== null && this.src.length > 0 ) {
            this.play(this.src);
        }
        // this.player = videojs(this.$refs.video, this.options, function onPlayerReady() {
        //     console.log('onPlayerReady', this);
        // })
    },
    beforeDestroy() {
        if ( this.player !== null ) {
            this.player.dispose()
        }
    }
}
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

    .vv {
        min-width: 100%;
        min-height: 100%;
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
