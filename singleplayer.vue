<template>
    <transition :css="false" @before-leave="onBeforeLeave">
        <div class="cvideoplayer-single">
            <div class="cvideoplayer-player" ref="player"></div>
            <div class="cvideoplayer-panel" v-bind:class="panelClass">
                <font-awesome-icon v-if="state === 0" icon="spinner" pulse class="initializing-icon"/>
                <div v-if="showingMessage" class="centered-message">{{displayMessage}}</div>
            </div>
        </div>
    </transition>
</template>
<script>
import swfobject from "@/util/swfobject";
import flvplayer from './JarisFLVPlayer.swf';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

const DEFAULT_ERROR_TIMEOUT = 4000;
const DEFAULT_RECONNECT_TIMEOUT = 4000;
const NOTIFY_ERROR_INTERVAL = 4000;
let   LAST_NOTIFY_ERROR_TIME = 0;

let player_id_seq = 0;

const STATE_INITIALIZING = 0;
const STATE_IDLE         = 1;
const STATE_LOADING      = 2;
const STATE_PLAYING      = 3;
const STATE_ERROR        = 4;
const STATE_RECONNECTING = 5;
const STATE_DESTROYED    = 6;

function genPlayerDomId() {
    return "cvideoplayer_uid_" + (++player_id_seq);
}

// function logEvent(event, id) {
//     var res = "EVENT: type=" + event.type;
//     // @note needs to log like this because browsers might 
//     // onlye evaluate the object if you click on it.
//     for ( var v in event )
//         if ( "type" !== v && event.hasOwnProperty(v) )
//             res += " " + v + "=" + event[v];
//     console.log("### Player event",id,res);
// }

export default {
    components: { FontAwesomeIcon },
    name: "cvideoplayer-single",
    props: {
        src: String,
        aspectratio: { type: String, default: "" },
        buffertime: { type: Number, default: 0.5 }
    },
    data() {
        const playerDomId = genPlayerDomId();
        const playerGlobalFun = playerDomId + "_fun";
        
        return {
            playerDomId,
            playerGlobalFun,
            player: null,
            playingSrc: this.src || "",
            connected: false,
            state: STATE_INITIALIZING,
            displayMessage: ""
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
    watch: {
        src(newVal) {
            if ( newVal !== null && newVal.length > 0 )
            {
                this.play(newVal);
            }
            else
            {
                this.stop();
            }
        }
    },
    methods: {
        play(url) {
            this.playingSrc = url;
            
            if ( this.state === STATE_INITIALIZING )
            {
                console.log("initializing, will play after it finishes");
                return;
            }
            
            let server = "";
            let source = url;
            let streamType = "http";
            
            if ( url.match("^rtmp://") )
            {
                // sample: rtmp://192.168.2.53:1554/hls/hls
                const parts = (new RegExp("(rtmp://.*/)(.*)")).exec(url);
                server = parts[1];
                source = parts[2];
                streamType = "rtmp";
            }

            this.player.api_loadVideo(source, "video", streamType, server);
            this.startErrorTimer();
            this.state = STATE_LOADING;
        },
        stop() {
            if ( this.state !== STATE_INITIALIZING )
            {
                this.cancelErrorTimer();
                this.cancelReconnectTimer();
                
                if ( this.player !== null )
                {
                    this.player.api_close();
                    // const playerToRemove = this.player;
                    // window.setTimeout(() => swfobject.removeSWF(playerToRemove), 100);
                    // this.player = null;
                }

                this.state = STATE_IDLE;
            }
        },
        startErrorTimer( ms = DEFAULT_ERROR_TIMEOUT ) {
            this.cancelErrorTimer();
            console.log("Starting error timer", ms);
            this.errorTimer = window.setTimeout(this.onErrorTimer, ms);
        },
        cancelErrorTimer() {
            if ( this.errorTimer !== null )
            {
                console.log("Stopping error Timer");
                window.clearTimeout(this.errorTimer);
                this.errorTimer = null;
            }
        },
        onErrorTimer() {
            this.errorTimer = null;
            if ( this.state === STATE_LOADING )
            {
                if ( this.connected === true )
                {
                    this.displayMessage = "视频流超时！";
                    this.state = STATE_ERROR;
                }
                else
                {
                    this.player.api_close();
                    this.startReconnectTimer();
                }
            }
        },
        startReconnectTimer( ms = DEFAULT_RECONNECT_TIMEOUT ) {
            this.cancelReconnectTimer();
            console.log("Starting reconnect timer", ms);
            this.state = STATE_RECONNECTING;
            this.displayMessage = "连接失败...";
            this.reconnectTimer = window.setTimeout(this.onReconnectTimer, ms);
        },
        cancelReconnectTimer() {
            if ( this.reconnectTimer !== null )
            {
                console.log("Stopping reconnect Timer");
                window.clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
        },
        onReconnectTimer() {
            this.reconnectTimer = null;
            if ( this.state === STATE_RECONNECTING )
            {
                this.state = STATE_IDLE;
            
                if ( this.playingSrc.length > 0 )
                {
                    this.play(this.playingSrc);
                }
            }
        },
        /**
         *  event = {
         *      success: true | false,
         *      id: "element_id",
         *      ref: HTMLElement // if success === true
         *  };
         *  
         * @param {event} result the swfobject load result as described
         */
        onSwfobjectResult(result) {
            if ( result.success === true )
            {
                console.log(this.playerDomId, "swfobject success");
                this.player = result.ref;
            }
            else
            {
                console.log(this.playerDomId, "swfobject failed");
                const now = Date.now();
                if ( now - LAST_NOTIFY_ERROR_TIME >= NOTIFY_ERROR_INTERVAL )
                {
                    alert("无法启动Flash");
                    LAST_NOTIFY_ERROR_TIME = now;
                }
            }
        },
        onPlayerEvent(event) {
            // logEvent(event, this.playerDomId);
            switch ( event.type )
            {
                /**
                 * This event happens after our JarisPlayer has been loaded.
                 * This event always happens after onSwfobjectResult.
                 */
                case "onPlayerInitialized":
                {
                    const player = this.player;

                    window.addEventListener('beforeunload', this.onBeforeLeave);
                    
                    console.log(this.playerDomId, "Jarisplayer initialized: ", player.api_get("version"));
                    
                    player.api_addlistener( "on*", this.playerGlobalFun);
                    
                    if ( this.aspectratio.length > 0 )
                        player.api_setaspectratio(this.aspectratio);
                    
                    this.state = STATE_IDLE;
                    
                    if ( this.playingSrc.length > 0 )
                    {
                        this.play(this.playingSrc);
                    }

                    break;
                }

                case "onDataInitialized":
                {
                    if ( this.state === STATE_LOADING || (this.connected === true && this.state === STATE_ERROR) )
                    {
                        this.cancelErrorTimer();
                        this.state = STATE_PLAYING;
                    }
                    
                    if ( this.aspectratio.length > 0 )
                        this.player.api_setaspectratio(this.aspectratio);
                    
                    break;
                }
                
                case "NetConnection.Connect.Success":
                {
                    this.connected = true;
                    break;
                }
                
                case "NetConnection.Connect.Failed":
                {
                    if ( this.state !== STATE_RECONNECTING )
                    {
                        this.state = STATE_RECONNECTING;
                        console.log(this.playerDomId, "Connection failed, Restarting in a while");
                        this.connected = false;
                        this.startReconnectTimer();
                    }
                    
                    break;
                }
                
                case "NetConnection.Connect.Closed":
                {
                    if ( this.connected === true )
                    {
                        this.connected = false;
                        this.state = STATE_RECONNECTING;
                        this.displayMessage = "正在连接";
                        console.log(this.playerDomId, "Connection lost, Restarting in a while");
                        this.startReconnectTimer();
                    }
                    break;
                }

            }
            
        },
        onBeforeLeave() {
            console.log("Player leaving", this.playerDomId);
            window.removeEventListener('beforeunload', this.onBeforeLeave);

            if ( this.player != null
              && this.state != STATE_INITIALIZING
              && typeof this.player.api_onBrowserUnload === "function" )
            {
                this.player.api_onBrowserUnload();
            }

            if ( this.player !== null )
            {
                const playerToRemove = this.player;
                window.setTimeout(() => swfobject.removeSWF(playerToRemove), 100);
                this.player = null;
            }

            this.cancelErrorTimer();
            this.cancelReconnectTimer();
            this.state = STATE_DESTROYED;
            console.log("Player left", this.playerDomId);
        }
    },
    mounted() {
        this.errorTimer = null;
        this.reconnectTimer = null;
        
        window[this.playerGlobalFun] = this.onPlayerEvent;
        
        this.$nextTick( () => {
            var flashvarsVideo = {
                // source: "cam_1_0",
                // type: "video",
                // streamtype: "rtmp",
                // server: "rtmp://192.168.2.173:1554/live/",

                autostart: "false",
                hardwarescaling: "true",
                buffertime: this.buffertime,
                menu: "false", // this removes jarisplayer own menu options
                loop: "true",
                jsapi: "true",
                controls: "false",
                onloaded: this.playerGlobalFun,
                aspectratio: this.aspectratio
            };

            var params = {
                menu: "false", // this remove some flash default menu options
                scale: "noscale",
                allowFullScreen: "true",
                allowScriptAccess: "always",
                allowNetworking: "all",
                bgcolor: "#1b1c20",
//                quality: "high",
                wmode: "opaque" // opaque window direct
            };
            
            var attributes = {
                id: this.playerDomId,
                "class": "cvideoplayer-player"
            };

            const SWF_PATH = flvplayer;
            swfobject.embedSWF( SWF_PATH, this.$refs.player, "100%", "100%",
                                "11", null, //"jarisplayer/expressInstall.swf",
                                flashvarsVideo, params, attributes,
                                this.onSwfobjectResult);
                                
        });
    },
    destroyed() {
        delete window[this.playerGlobalFun];
    }
}
</script>
<style>
    .cvideoplayer-player {
        background-color: black;
        position: absolute;
    }
</style>
<style scoped>
    .cvideoplayer-single {
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: #1b1c20;
        color: white;
        box-sizing: border-box;
        /*border: 5px solid red;*/
    }

    .cvideoplayer-single .initializing-icon {
        position: absolute;
    }

    .cvideoplayer-single > .cvideoplayer-player {
        xbackground-color: #1b1c20;
    }
    
    .cvideoplayer-single > .idle {
        /*box-sizing: border-box;*/
        height: 100%;
        width: 100%;
        position: absolute;
        top: 0;
        color: white;
        
        background-color: #1b1c20;
        background-image: url(~@/cvideoplayer/images/stopped-bg.png);
        background-position: center;
        background-repeat: no-repeat;
        /*background-size: 50%;*/
    }
    
    .cvideoplayer-single > .loading {
        height: 100%;
        width: 100%;
        position: absolute;
        top: 0;
        color: white;
         
        background: black url(~@/cvideoplayer/images/loading.gif) no-repeat center;
    }
    
    .cvideoplayer-single > .error {
        height: 100%;
        width: 100%;
        position: absolute;
        top: 0;
        color: white;
        display: table;
        
        box-sizing: border-box;
        border: 5px solid yellow;
    }
    
    .cvideoplayer-single > .error > .centered-message {
        display: table-cell;
        vertical-align: middle;
        text-align: center;
    }
    
</style>
