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
            <!-- <button type="button" @click="doCanvasCap">
                CanvasCap
            </button> -->
        </div>
        <video-player ref=player />
        <div id="captured-frame" v-if="viewingCapturedImage === true">
            <img ref="capturedImage" :src="capturedImage"  style="width: 100%"/>
            <div id="personrects">
                <div class="personrects-box" v-for="(r,i) in personRects" :key="i"
                    :style="{top: (100 * r.y/capturedHeight) + '%',
                             left: (100 * r.x/capturedWidth) + '%',
                             height: (100 * r.height/capturedHeight) + '%',
                             width: (100 * r.width/capturedWidth) + '%'
                             }">
                    
                </div>
            </div>
            <button type="button" @click="viewingCapturedImage = false; personRects.length = 0" style="position: absolute; right:0">X</button>
        </div>
    </div>    
</template>
<script>
import Config from '@/Config'
import VideoPlayer from './flvjsplayer.vue'
import axios from 'axios'

export default {
    components: {
        VideoPlayer
    },
    data() {
        return { 
            viewingCapturedImage: false,
            capturedImage: null,
            capturedCanvas: null,
            capturedWidth: 0,
            capturedHeight: 0,
            personRects: [],
            videosrc: `${Config.wsflv}/live/cam_1_0`
            // videosrc: "http://192.168.2.163:9111/live?port=1554&app=flvtest&stream=copy_3"
            // videosrc: "http://192.168.2.187:10080/video/171/cam_9_0"
            // videosrc: "rtmp://192.168.2.171:1554/live/cam_8_4"
        }
    },
    methods: {
        doCap() {
            const canvas = this.$refs.player.captureImage()
            if ( canvas !== null ) {
                this.capturedWidth = canvas.width
                this.capturedHeight = canvas.height
                this.capturedCanvas = canvas
                this.capturedImage = canvas.toDataURL('image/png')
                this.viewingCapturedImage = true
                this.$nextTick(function(){
                    console.log("Will ask for blob and send it")
                    canvas.toBlob(blob => {
                        console.log("got blob")
                        
                        const formdata = new FormData()
                        formdata.append('file', blob)
                        
                        console.log("prepared formdata")

                        axios.post('/api/personrects/detect_persons', formdata, {
                            headers: {
                                'Content-Type': 'multipart/form-data'
                            }
                        }).then( response => {
                            console.log("got response", response)
                            if ( response.status === 200 ) {
                                this.personRects = response.data
                            } else {
                                console.log("Got unexpected response")
                            }
                        })

                    }, 'image/png')
                })
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

#personrects {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
}

#personrects .personrects-box {
    position: absolute;
    /* display: inline-block; */
    border-radius: 6px;
    /* border: 2px solid #e71837; */

    border: 1px solid rgb(31, 160, 255);
    /* background-color: rgba(231,24,55,0.5); */
    /* background-color: rgba(9, 41, 66, 0.3) */
    background-color: rgba(31, 160, 255, 0.3);
}

#personrects .personrects-box:hover {
    border: 1px solid rgb(255,215,0);
    background-color: rgba(255,215,0,0.3);
}


</style>
