// 此範例程式碼為【JavaScript】實作前端錄音功能
// https://blog.jeremyhuang.com/javascript-shi-zuo-qian-duan-lu-yin-gong-neng/

// 確認網站是否有支援webRTC取得麥克風音訊 成功了
if (navigator.mediaDevices) {
console.log('getUserMedia supported.');
} else {
console.log('getUserMedia not supported on your browser!');
    }
navigator.mediaDevices.getUserMedia({
        audio: true
}).then(mediaStream => {
        console.log(mediaStream);
}).catch(function (err) {
        console.log('The following gUM error occured: ' + err);
});
navigator.mediaDevices.getUserMedia({
        audio:{
        sampleRate: 16000, // 採用率
        channelCount: 2,   // 聲道數
        volume: 1.0        // 音量
    }
}).then(mediaStream => {
        console.log(mediaStream);
}).catch(function (err) {
        console.log('The following gUM error occured: ' + err);
});

// 利用audiocontext處理音訊
var audioContext = new (window.AudioContext || window.webkitAudioContext);
function createJSNode(audioContext) {
        var BUFFER_SIZE = 4096;
    var INPUT_CHANNEL_COUNT = 2;
    var OUTPUT_CHANNEL_COUNT = 2;

    var creator = audioContext.createScriptProcessor || audioContext.createJavaScriptNode;
    creator = creator.bind(audioContext);
    return creator(BUFFER_SIZE, INPUT_CHANNEL_COUNT, OUTPUT_CHANNEL_COUNT);
}

// 取的左右聲道資料
var leftChannelData = audioBuffer.getChannelData(0);
var rightChannelData = audioBuffer.getChannelData(1);
// 合併左右聲道
function interleaveLeftAndRight(left, right) {
    var totalLength = left.length + right.length;
var data = new Float32Array(totalLength);
for (let i = 0; i < left.length; i++) {
        var k = i * 2;
        data[k] = left[i];
        data[k + 1] = right[i];
    }
    return data;
}

// 建立 wav 檔案資訊
function createWavFile(audioData) {
        var WAV_HEAD_SIZE = 44;
    var buffer = new ArrayBuffer(audioData.length * 2 + WAV_HEAD_SIZE),
    // 需要用一个view来操控buffer
    view = new DataView(buffer);
    // 写入wav头部信息
    // RIFF chunk descriptor/identifier
    writeUTFBytes(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 44 + audioData.length * 2, true);
    // RIFF type
    writeUTFBytes(view, 8, 'WAVE');
    // format chunk identifier
    // FMT sub-chunk
    writeUTFBytes(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // stereo (2 channels)
    view.setUint16(22, 2, true);
    // sample rate
    view.setUint32(24, 44100, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, 44100 * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2 * 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data sub-chunk
    // data chunk identifier
    writeUTFBytes(view, 36, 'data');
    // data chunk length
    view.setUint32(40, audioData.length * 2, true);

    var length = audioData.length;
    var index = 44;
    var volume = 1;
    for (let i = 0; i < length; i++) {
        view.setInt16(index, audioData[i] * (0x7FFF * volume), true);
        index += 2;
    }
    return buffer;
}

function writeUTFBytes(view, offset, string) {
        var lng = string.length;
    for (var i = 0; i < lng; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}


// onAudioProcess 函式
function onAudioProcess(event) {
        var audioBuffer = event.inputBuffer;
    var leftChannelData = audioBuffer.getChannelData(0);
    var rightChannelData = audioBuffer.getChannelData(1);

    var allData = interleaveLeftAndRight(leftChannelData.slice(0), rightChannelData.slice(0));
    var wavBuffer = createWavFile(allData);
    var blob = new Blob([new Uint8Array(wavBuffer)]);

    var formData = new FormData();
    formData.append('data', blob);
    formData.append('AsrReferenceId', asrReferenceId);

    $.ajax({
    url: "/api/STT/SendData",
    type: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    success: function (result) {
        console.log(result);
        }
    });
}

// audioContext 設置
var mediaNode = audioContext.createMediaStreamSource(stream);
var jsNode = createJSNode(audioContext);
jsNode.connect(audioContext.destination);
jsNode.onaudioprocess = onAudioProcess;
mediaNode.connect(jsNode);

mediaStream.getAudioTracks()[0].stop();
mediaNode.disconnect();
jsNode.disconnect();






