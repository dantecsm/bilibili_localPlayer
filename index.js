(function () {
  window.danmaku = [] // 实时弹幕
  window.danmakuLocal = [] // 本地弹幕
  window.danmakuClone = [] // 默认弹幕

  var isNewVersion = false // 是不是船新版本
  var lastOffsetDate = 0
  var lastOffsetVal = 0 // 弹幕时间偏移
  var danmakuMode = 1 // 弹幕合并模式
  var isFrozen = false // 冻结弹幕
  var freezeTimer = 0
  var textTimer = 0

  const KEYCODE_OFFSET_LEFT = 74 // 弹幕快进
  const KEYCODE_OFFSET_RIGHT = 75 // 弹幕快退
  const KEYCODE_FREEZE = 76 // 弹幕暂停/播放
  const KEYCODE_SHIFT = 16 // 弹幕模式切换(默认，替换 or 合并)

  const DANMAKU_DEFAULT = 0 // 默认弹幕
  const DANMAKU_REPLACE = 1 // 替换弹幕
  const DANMAKU_MERGE = 2 // 合并弹幕

  const NEW_VERSION = 0

  const PLUGIN_HTML = `  <div class="uploadMediaPlugin"><button id=mediaSwitcher class="mediaSwitcher">上传</button><div id=mediaUploaderWrapper class="mediaUploader-wrapper fold"><div class="mediaUploader"><input id=mediaInputer class="mediaInputer" type="file" multiple/><div class="cover">选择文件</div></div></div></div>`
  const PLUGIN_CSS = `.uploadMediaPlugin * {margin: 0;padding: 0;box-sizing: border-box;}.uploadMediaPlugin {display: flex;position: fixed;top: 28vh;z-index: 10;}.uploadMediaPlugin .mediaSwitcher {z-index: 11;border: none;outline: none;width: 30px;height: 40px;padding: 0 5px;background: skyblue;color: white;text-align: center;line-height: 1.2;font-size: 12px;cursor: pointer;}.uploadMediaPlugin .mediaSwitcher:hover {background: #00b4e5;}.uploadMediaPlugin .mediaUploader-wrapper {transform: translateX(0);transition: all .3s;}.uploadMediaPlugin .mediaUploader-wrapper.fold {transform: translateX(-100px);}.uploadMediaPlugin .mediaUploader {position: relative;width: 70px;height: 40px;}.uploadMediaPlugin .mediaInputer {opacity: 0;position: absolute;width: 100%;height: 100%;}.uploadMediaPlugin .cover {position: absolute;width: 100%;height: 100%;background: #eee;color: black;text-align: center;line-height: 40px;font-size: 12px;pointer-events: none;}`

  function init() {
      hookDanmaku() // 获取弹幕内存引用
      createUploadPlugin().then(bindEvents, handleException) // 创建上传按钮并绑定事件
    }

    init()

    /* ************************************************************************* */

    function hookDanmaku() {
    	try {
    		eval("var Fa=" + Fa.toString().replace('play:function', 'f,play:function')) || Fa()
    	} catch (e) {
    		return isNewVersion = true
    	}

    	let params = GrayManager.update_params(!0)
    	params.p = window.pageno || GrayManager.HashManage.get("page") || GrayManager.GetUrlValue("p") || 1,
    	params.urlparam && (params.extra_params = window.decodeURIComponent(params.urlparam))

    	player = new bilibiliPlayer(params)

    	assignDanmaku()
    }

    function assignDanmaku() {
    	if (player.f && player.f.g && player.f.g.g && player.f.g.g.xd && player.f.g.g.xd.length) {
    		danmaku = player.f.g.g.xd
    		danmakuClone = JSON.parse(JSON.stringify(danmaku))
    	} else {
    		requestAnimationFrame(assignDanmaku)
    	}
    }

    function createUploadPlugin() {
    	return new Promise(function (resolve, reject) {
    		if(isNewVersion) {
    			reject({code: NEW_VERSION, msg: `请切换到旧版 b 站再使用此脚本`})
    		} else {
    			addHTML(PLUGIN_HTML, 'body')
    			addCSS(PLUGIN_CSS)
    			resolve()
    		}
    	})
    }

    function bindEvents() {
    	bindUploadEvents()
    	bindKbdEvents()
    }

    function handleException(obj) {
    	let {code, msg} = obj
    	if(code === NEW_VERSION) {
    		if (confirm(msg)) {
    			document.querySelector('.feedback').nextElementSibling.click()
    		}
    	}
    }

    function bindUploadEvents() {
    	$(mediaSwitcher).on('click', switchState)
    	$(mediaInputer).on('click', clearMedia).on('change', setMedia)
    }

    function bindKbdEvents() {
      $(document).on('keydown', offsetDanmaku) // 弹幕时间调整
      $(document).on('keydown', freezeDanmaku) // 弹幕冻结
      $(document).on('keydown', shiftDanmakuMode) // 弹幕模式切换
    }

  // XML 弹幕解析器
  function readFile(file) {
  	var reader = new FileReader()
  	reader.onload = function () {
  		danmakuLocal = danmakuReader(this.result)
  	}
  	reader.readAsText(file)
  }

  function danmakuReader(str) {
  	let danmakuList = str.match(/<d.+?<\/d>/g)
  	let hashArr = []

  	danmakuList.map(d => {
  		let info = d.match(/p="(.+?)">(.+?)<\/d>/)
  		let parts = info[1].split(',')
  		let hash = {}

  		hash['border'] = false
  		hash['borderColor'] = 6750207
  		hash['class'] = parseInt(parts[5])
  		hash['color'] = parseInt(parts[3])
  		hash['date'] = parseInt(parts[4])
  		hash['dmid'] = parseFloat(parts[7])
  		hash['eb'] = parseInt(parts[5])
  		hash['mode'] = parseInt(parts[1])
  		hash['on'] = false
  		hash['size'] = parseInt(parts[2])
  		hash['stime'] = parseFloat(parts[0])
  		hash['text'] = info[2]
  		hash['uid'] = parts[6]

  		hashArr.push(hash)
  	}
  	)
  	return hashArr.sort((x, y) => x.stime - y.stime)
  }

  // 弹幕模式切换 (替换，合并，默认)
  function danmakuInject(mode = DANMAKU_DEFAULT, isHint = true) {
  	if (isHint && danmakuLocal && !danmakuLocal.length) {
  		return printMsg('未发现本地弹幕')
  	} else if (!isHint) {
  		return printMsg('正在导入本地弹幕...')
  	} else {
  		printMsg(['默认弹幕', '替换弹幕', '合并弹幕'][danmakuMode])
  	}

  	switch (mode) {
  		case DANMAKU_REPLACE: {
  			danmaku.length = 0
  			danmakuLocal.map(d => danmaku.push(d))
  			break
  		}
  		;
  		case DANMAKU_MERGE: {
  			danmaku.length = 0
  			danmakuLocal.concat(danmakuClone).map(d => danmaku.push(d))
  			danmaku = danmaku.sort((x, y) => x.stime - y.stime)
  			break
  		}
  		;
  		case DANMAKU_DEFAULT: {
  			danmaku.length = 0
  			danmakuClone.map(d => danmaku.push(d))
  			break
  		}
  		;
  	}
  }

  // 弹幕时间轴调整（秒为单位）
  function danmakuOffset(t) {
  	danmaku.map(s => s.stime += (t - lastOffsetVal))
  	lastOffsetVal = t
  }

  function offsetDanmaku(e) {
      if (+new Date - lastOffsetDate < 100) return // 触发频率控制
      	lastOffsetDate = +new Date

      if (e.keyCode === KEYCODE_OFFSET_LEFT) {
      	danmakuOffset(lastOffsetVal - 1)
      	printMsg(`弹幕延时: ${lastOffsetVal} s`)
      } else if (e.keyCode === KEYCODE_OFFSET_RIGHT) {
      	danmakuOffset(lastOffsetVal + 1)
      	printMsg(`弹幕延时: ${lastOffsetVal} s`)
      }
    }

    function freezeDanmaku(e) {
    	if (e.keyCode === KEYCODE_FREEZE) {
    		isFrozen = !isFrozen
    		if (isFrozen) {
    			printMsg('弹幕冻结')
    			$('.bilibili-player-video-danmaku').hide()
    			freezeTimer = setInterval(() => danmakuOffset(lastOffsetVal + 1), 1000)
    		} else {
    			printMsg(`弹幕解冻，延时 ${lastOffsetVal} s`)
    			$('.bilibili-player-video-danmaku').show().children().each(function () {
    				$(this).hide()
    			})
    			clearInterval(freezeTimer)
    		}
    	}
    }

    function shiftDanmakuMode(e) {
    	if (e.keyCode === KEYCODE_SHIFT) {
    		danmakuMode = (danmakuMode + 1) % 3
    		danmakuInject(danmakuMode)
    	}
    }

    function formatTime(time) {
    	if (null === time || '' === time || isNaN(time) || undefined === time)
    		return

    	var timeStr = (new Date(16 * 3600 * 1000 + Math.abs(time) * 1000) + '')
    	var reg = time >= 3600000 ? /\d\d:\d\d:\d\d/ : /\d\d:\d\d /

    	timeStr = timeStr.match(reg)[0]
    	if (timeStr < 0)
    		timeStr = `-${timeStr}`

    	return timeStr
    }

    function addHTML(html, selector) {
    	let div = document.createElement('div')
    	div.innerHTML = html
    	let parent = document.querySelector(selector)
    	let children = [...div.children]
    	children.map(child => parent.appendChild(child))
    }

    function addCSS(css) {
    	var style = document.createElement('style')
    	style.innerHTML = css
    	document.head.appendChild(style)
    }

    function switchState() {
    	$('#mediaUploaderWrapper').toggleClass('fold')
    }

    function clearMedia(e) {
    	switchState()
    	e.target.value = null
    }

    function setMedia(e) {
    	let files = this.files
    	if (!files.length)
    		return

    	$(mediaUploaderWrapper).addClass('fold')

    	let videoFiles = [...files].filter(f => {
    		return /^video/.test(f.type) || /[Mm][Kk][Vv]$/.test(f.name)
    	})

    	let danmakuFiles = [...files].filter(f => /[Xx][Mm][Ll]$/.test(f.name))

    	if (videoFiles.length > 0) {
    		setMediaVideo(videoFiles[0])
    		console.log(`发现视频 ${videoFiles[0].name}`)
    	}

    	if (danmakuFiles.length > 0) {
    		setMediaDanmaku(danmakuFiles[0])
    		console.log(`发现弹幕 ${danmakuFiles[0].name}`)
    	}
    }

    function setMediaVideo(file) {
    	$('video')[0].pause()
    	$('video').attr('src', window.URL.createObjectURL(file))
    	alert(`${file.name} 上传成功`)
    	fixProgress()
    	setTimeout(() => {
    		$('video').attr('src', window.URL.createObjectURL(file))
    		$('video')[0].play()
    	}, 100)
    }

    function setMediaDanmaku(file) {
      $('.bilibili-player-video-adv-danmaku').hide() // 隐藏高级弹幕

      readFile(file)
      danmakuInject(DANMAKU_REPLACE, false)
      setTimeout(() => danmakuInject(DANMAKU_REPLACE), 1000)
    }

    function fixProgress() {
    	let video = $('video')[0]

      $('.bilibili-player-video-progress').on('click', e => { // 修复鼠标事件
      	let percent = parseFloat($('.bpui-slider-handle')[0].style.left) / 100
      	video.currentTime = percent * video.duration
      })

      var durationText = formatTime(Math.floor(this.duration)) // 修改视频时长
      $('.bilibili-player-video-time-total').text(durationText)

      $('video').on('timeupdate', function () { // 修复时间事件
          var currentTimeText = formatTime(Math.floor(this.currentTime)) // 修改当前时间
          $('.bilibili-player-video-time-now').text(currentTimeText)
        })
    }

    function printMsg(msg) {
    	clearTimeout(textTimer)
    	activeInformPanel(msg)
    	textTimer = setTimeout(deactiveInformPanel, 1500)
    }

    function activeInformPanel(msg) {
    	$('.bilibili-player-video-panel').css({
    		'display': 'block',
    		'background-color': 'transparent',
    		'pointer-events': 'none'
    	})
    	$('.bilibili-player-video-panel .bilibili-player-video-panel-image').hide()
    	$('.bilibili-player-video-panel [stage]').hide()
    	$('.bilibili-player-video-panel [stage=0]').css({
    		'font-size': '18px',
    		'transform': 'translateY(-20px)'
    	}).show().text(msg)
    }

    function deactiveInformPanel() {
    	$('.bilibili-player-video-panel').css({
    		'display': 'none',
    		'background-color': 'white',
    		'pointer-events': 'inherit'
    	})
    	$('.bilibili-player-video-panel .bilibili-player-video-panel-image').show()
    	$('.bilibili-player-video-panel [stage]').show()
    	$('.bilibili-player-video-panel [stage=0]').css({
    		'font-size': '12px',
    		'transform': 'translateY(0)'
    	}).text(`播放器初始化...[完成]`)
    }
  })();