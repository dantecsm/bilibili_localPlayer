## 介绍

这是一个浏览器脚本，允许你上传本地视频和弹幕到B站观看（相当于添加一个B站视频/弹幕自定义功能）

原理是获取视频播放地址，指向本地文件; 获取弹幕内存的引用，然后替换。细节见[这里](http://www.simenchan.xyz/index.php/archives/228/)

用途：下架番剧观看，有修番剧替换，高清视频源替换，投稿预览等



## 安装

将以下链接保存为书签，每次需要时点击书签即可

```javascript
javascript:var s=document.createElement('script');s.src='https://dantecsm.github.io/bilibili-localplayer/index.js';document.body.append(s)
```



## 使用

#### 基本用法

可以上传视频

![01.gif](http://qn.simenchan.xyz/bili_demo1.gif)

可以上传弹幕 (xml 格式)

![02.png](http://qn.simenchan.xyz/bili_demo1.png)

![03.png](http://qn.simenchan.xyz/bili_demo2.png)

注：视频和弹幕**可以同时上传，也可以分开上传**



#### 快捷键

为了让画面与弹幕同步，可用以下方式控制弹幕

- `J`：所有弹幕快退 1s
- `K`：所有弹幕快进 1s
- `L`：暂停/播放弹幕流
- `shift`：切换弹幕模式(默认弹幕/替换弹幕/合并弹幕)



## 兼容

- 此脚本只支持**旧版** b 站
- 上传的视频必须是 **h5 播放器支持**的编码，也即 [H264](https://www.bilibili.com/video/av37424012) 编码的视频



## FAQ

- 从哪获取弹幕资源 ？

  [这里](https://danmubox.github.io/)

- 为什么我的视频没有声音/没有画面？

  请参考兼容第二条，你上传的视频是 [H264](https://www.bilibili.com/video/av37424012) 编码的吗？简单地讲，只有**浏览器能播放**的视频才能观看

