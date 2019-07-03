<template>
    <div class="container">
        <div class="player-container">
            <div class="container-container">
                <cvideoplayer-single class="player" ref="player" :src="src" aspectratio="fill" v-bind:buffertime="0.5"/>
            </div>
        </div>
    </div>
</template>
<script>
import SinglePlayer from "@/cvideoplayer/singleplayer.vue"
// import SinglePlayer from "@/cvideoplayer/flvjsplayer.vue"

export default {
    components: {
        "cvideoplayer-single": SinglePlayer
    },
    props: ["src"],
    name: "cvideoplayer-singleplayerdemo",
    data() {
        return {
            
        };
    }
};
</script>
<style scoped>
    .container {
        background-color: white;
        display: table;
        table-layout: fixed;
        width: 100%;
        height: 100%;
        
        box-sizing: border-box;
            
    }
    
    .headers-container, .player-container {
        display: table-row;
        box-sizing: border-box;
        border: 5px solid orange;
    }
    
    .player-container {
        height: 100%;
        box-sizing: border-box;
        border: 5px solid yellow;
    }
    
    .player-container > .container-container {
        float: left;
        position: relative;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
    }
</style>