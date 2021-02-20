[English](README.md) | 简体中文

# cstor-live-player

cstor-live-player是一个基于Vue的组件，目的是使用flv.js播放低延迟的实时视频流。

可以播放h264中包含的http-flv或websocket流。

cstor-live-player会一直重连直到可以播放视频为止。cstor-live-player将尝试跟上最新时间，如果视频以某种方式延迟，它将尝试平稳地提高播放速度。

## 安装

    yarn add cstor-live-player
    # - or -
    npm install cstor-live-player

## Using

该组件不会自动注册为Vue组件，您必须导入样式表并提供该组件的大小。

最简单的demo  `App.vue`:

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

播放器不包含任何按钮。您可以创建自己的按钮并使用简单的API。

默认情况下，音频是禁用的，这是必须的，因为浏览器不会自动播放未静音的视频，如果需要打开音频通道，请添加`audio`属性。

播放器组件将增长以填充可放大组件的大小。它将尝试保持长宽比，如果您要放弃长宽比，则可以尝试添加`fill`属性，但某些浏览器可能会忽略您并保持长宽比。

## api

组件属性

    src: String = stream url (reactive), http[s]://.../ or ws[s]://.../
    fill: Boolean = Fill the whole area instead of keeping aspect ratio
    audio: Boolean = enable audio channel, defaults to no audio

js api:

    play(url: String) = Play a new stream
    stop() = stops the player

    captureImage() -> <canvas/> = Makes a screenshoot of the video.

    getVideoElement() -> <video/> = Returns the VideoElement in case you want to do something with it

## 有关HTTP视频流的注释

大多数浏览器都会限制到同一浏览器的连接数量`host:port`，如果您要播放多个视频，建议使用websocket协议。

另外，使用网络套接字可以减少实时视频的延迟。

## 待完成

- 添加一个用于个性化的播放器样式.
- 做一些关于日志记录的：添加配置或禁用它
- 有些提示消息只有中文
