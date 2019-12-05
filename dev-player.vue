<template>
    <div id="dev-player">
        <div id="topbar">
            <button type="button" @click="$refs.player.play(videosrc)">
                Play
            </button>
            <button type="button" @click="$refs.player.stop()">
                Stop
            </button>
            <input id="vidurl" type="text" v-model="videosrc"/>
            <button type="button" @click="doCap">
                Capture
            </button>
            <button type="button" @click="doCanvasCap">
                CanvasCap
            </button>
        </div>
        <video-player ref=player />
        <div id="captured-frame" v-if="viewingCapturedImage === true">
            <img ref="capturedImage" :src="capturedImage"  style="width: 100%"/>
            <button type="button" @click="viewingCapturedImage = false" style="position: absolute; right:0">X</button>
        </div>
    </div>    
</template>
<script>
import Config from '@/Config'
import VideoPlayer from './flvjsplayer.vue'
// import VideoPlayer from './videojsplayer.vue'

export default {
    components: {
        VideoPlayer
    },
    data() {
        return { 
            viewingCapturedImage: false,
            capturedImage: null,
            videosrc: `${Config.wsflv}/live/cam_3_4`
            // videosrc: "http://192.168.2.163:9111/live?port=1554&app=flvtest&stream=copy_3"
            // videosrc: "http://192.168.2.187:10080/video/171/cam_9_0"
            // videosrc: "rtmp://192.168.2.171:1554/live/cam_8_4"
        }
    },
    methods: {
        doCap() {
            const canvas = this.$refs.player.captureImage()
            if ( canvas !== null ) {
                this.capturedImage = canvas.toDataURL('image/png')
                this.viewingCapturedImage = true;
            } else {
                console.log("Not capturing...")
            }
        }
    }
}
</script>
<style>

#dev-player {
    position: absolute;
    top: 70px;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

#vidurl {
    width: 60%;
}

#captured-frame {
    position: absolute;
    top: 0;
    left: 0;
    width: 1280px;
    height: 720px;
}

</style>
