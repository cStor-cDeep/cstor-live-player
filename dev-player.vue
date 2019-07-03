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
        </div>
        <video-player ref=player />
    </div>    
</template>
<script>
import Config from '@/Config'
import VideoPlayer from './flvjsplayer.vue'
// import VideoPlayer from './singleplayer.vue'
// import VideoPlayer from './videojsplayer.vue'

export default {
    components: {
        VideoPlayer
    },
    data() {
        return { 
            videosrc: `${Config.wsflv}/171/cam_9_0`
            // videosrc: "http://192.168.2.187:10080/video/171/cam_9_0"
            // videosrc: "rtmp://192.168.2.171:1554/live/cam_8_4"
        }
    }
}
</script>
<style>

#dev-player {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

#vidurl {
    width: 60%;
}
</style>
