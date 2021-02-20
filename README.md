English | [简体中文](README-cn.md)

# cstor-live-player

Vue component for low delay video playing using flv.js.

Can play http-flv or websocket streams enconded in h264.

The player is relentless, it will always retry until video can be played. The
player will try to keep up with time, if the video is somehow delayed, it will
try to smoothly increase the playing speed.

## Installing

    yarn add cstor-live-player
    # - or -
    npm install cstor-live-player

## Using

The component doesn't autoregister as a Vue component, you must import the
stylesheet and provide a size for the component..

Absoulte minimal `App.vue`:

```html
<template>
    <div id="app">
        <cstor-live-player style="height: 720px;" src="http://host:port/path/to/stream"/>
    </div>
</template>
<script>
import CstorLivePlayer from 'cstor-live-player'
import 'cstor-live-player/dist/cstor-live-player.css'

export default {
  components: {CstorLivePlayer}
}
</script>
```

The player doesn't contain any buttons. You can create your own buttons and use
the simple api.

Audio is disabled by default, this is needed because autoplay feature is desired
and unmuted video won't autoplay in current browsers, if you want to listen the
audio channel, add the `audio` attribute.

The player component will grow to fill the size of the encompasing component. It
will try to keep the aspect ratio, if you want to forfeit the aspect ratio, you
can try to add the `fill` attribute, take into account that some browsers might
ignore you and keep the aspect ratio regardless.

## api

Component attributes

    src: String = stream url (reactive), http[s]://.../ or ws[s]://.../
    fill: Boolean = Fill the whole area instead of keeping aspect ratio
    audio: Boolean = enable audio channel, defaults to no audio

js api:

    play(url: String) = Play a new stream
    stop() = stops the player

    captureImage() -> <canvas/> = Makes a screenshoot of the video.

    getVideoElement() -> <video/> = Returns the VideoElement in case you want to do something with it

## Notes regarding http streams

Most browsers impose a limit on the number of connections to the same `host:port`,
if you are going to play multiple videos, websocket protocol is recommended.

Also, take into account that using websockets could decrease delay from realtime
video.

## To be done

- Make the images configurable.
- (maybe) Add a slot for personalization.
- (maybe) Do something about logging: add configuration or disable it.
- Some messages are only in Chinese.
- Add Chinese documentation.
