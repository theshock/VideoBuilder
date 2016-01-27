/*
 Javascript VideoBuilder
-- MIT License
Copyright (c) 2012 Satoshi Ueyama
Copyright (c) 2016 Ponomarenko Pavlo
*/

(function(global) {
	"use strict";
	var AVIF_HASINDEX = 0x00000010;
	var AVIIF_KEYFRAME = 0x00000010;
	var RateBase = 1000000;

	function VideoBuilder(config) {
		this.movieDesc = {
			w: 0, h:0, fps: 0,
			videoStreamSize: 0,
			maxJPEGSize: 0
		};

		this.frameList  = [];

		if (config != null) {
			this.setup(config);
		}
	}


	var BlobBuilder = function() {
		this.parts = [];
	};

	BlobBuilder.prototype.append = function(part) {
		this.parts.push(part);
		this.blob = undefined; // Invalidate the blob
	};

	BlobBuilder.prototype.getBlob = function(type) {
		if (!this.blob) {
			this.blob = new Blob(this.parts, { type: type });
		}
		return this.blob;
	};
	
	VideoBuilder.prototype = {
		setup: function(config) {
			this.movieDesc.w = config.width;
			this.movieDesc.h = config.height;
			this.movieDesc.fps = config.fps;
		},
	
		addCanvasFrame: function(canvas) {
			var u = canvas.toDataURL('image/jpeg');
			var dataStart = u.indexOf(',') + 1;
			
			var bytes = base64.decode(u.substring(dataStart));
			if (bytes.length % 2) { // padding
				bytes.push(0);
			}
			
			var abuf = new ArrayBuffer(bytes.length);
			var u8a  = new Uint8Array(abuf);
			for (var i = 0; i < bytes.length; i++) {
				u8a[i] = bytes[i];
			}
			var bb = new BlobBuilder();
			bb.append(abuf);
			var blob = bb.getBlob('image/jpeg');

			var bsize = blob.size;
			this.movieDesc.videoStreamSize += bsize;
			this.frameList.push(blob);
			
			if (this.movieDesc.maxJPEGSize < bsize) {
				this.movieDesc.maxJPEGSize = bsize;
			}
		},
		
		addVideoStreamData: function(list, frameBuffer) {
			var stream = VideoBuilder.createMoviStream();
			stream.dwSize = frameBuffer.size;
			stream.handler = function(bb) {
				bb.append(frameBuffer);
			};
		
			list.push(stream);
			return stream.dwSize + 8;
		},
		
		finish: function(onFinish) {
			var avi = VideoBuilder.createAVIStruct();
			var headerLIST = VideoBuilder.createHeaderLIST();
			var moviLIST   = VideoBuilder.createMoviLIST();

			var streamSize = 0;
			moviLIST.aStreams = [];
			var frameCount = this.frameList.length;
			var frameIndices = [];
			var frOffset = 4; // 'movi' +0
			var IndexEntryOrder = ['chId', 'dwFlags', 'dwOffset', 'dwLength'];
			for (var i = 0; i < frameCount; i++) {
				var frsize = this.addVideoStreamData(moviLIST.aStreams, this.frameList[i]);
				frameIndices.push({
					chId: '00dc',
					dwFlags: AVIIF_KEYFRAME,
					dwOffset: frOffset,
					dwLength: frsize - 8,
					_order: IndexEntryOrder
				});
				
				frOffset += frsize;
				streamSize += frsize;
			}
			
			moviLIST.dwSize = streamSize + 4; // + 'movi'
						
			// stream header
			
			var frameDu = Math.floor(RateBase / this.movieDesc.fps);
			var strh = VideoBuilder.createStreamHeader();
			strh.wRight  = this.movieDesc.w;
			strh.wBottom = this.movieDesc.h;
			strh.dwLength = this.frameList.length;
			strh.dwScale  = frameDu;

			var bi = VideoBuilder.createBitmapHeader();
			bi.dwWidth  = this.movieDesc.w;
			bi.dwHeight = this.movieDesc.h;
			bi.dwSizeImage = 3 * bi.dwWidth * bi.dwHeight;

			var strf = VideoBuilder.createStreamFormat();
			strf.dwSize = bi.dwSize;
			strf.sContent = bi;
			
			var strl = VideoBuilder.createStreamHeaderLIST();
			strl.dwSize = 4 + (strh.dwSize + 8) + (strf.dwSize + 8);
			strl.aList = [strh, strf];
			
			// AVI Header
			var avih = VideoBuilder.createAVIMainHeader();
			avih.dwMicroSecPerFrame = frameDu;
			avih.dwMaxBytesPerSec = this.movieDesc.maxJPEGSize * this.movieDesc.fps;
			avih.dwTotalFrames = this.frameList.length;
			avih.dwWidth  = this.movieDesc.w;
			avih.dwHeight = this.movieDesc.h;
			avih.dwSuggestedBufferSize = 0;
			
			var hdrlSize = 4;
			hdrlSize += avih.dwSize + 8;
			hdrlSize += strl.dwSize + 8;
			headerLIST.dwSize = hdrlSize;
			headerLIST.aData = [avih, strl];

			var indexChunk = {
				chFourCC: 'idx1',
				dwSize: frameIndices.length * 16,
				aData: frameIndices,
				_order: ['chFourCC', 'dwSize', 'aData']
			};
			
			// AVI Container
			var aviSize = 0;
			aviSize += 8 + headerLIST.dwSize;
			aviSize += 8 + moviLIST.dwSize;
			aviSize += 8 + indexChunk.dwSize;
						
			avi.dwSize = aviSize + 4;
			avi.aData = [headerLIST, moviLIST, indexChunk];

			this.build(avi, onFinish);
		},
		
		build: function(avi, onFinish) {
			var builder = new BlobBuilder();
			VideoBuilder.appendStruct(builder, avi);
			var blob = builder.getBlob('video/avi');
			
			var U = window.URL || window.webkitURL;
			if (U) {
				var burl = U.createObjectURL(blob);
				if (burl) {
					onFinish(burl);
					return;
				}
			}
			
			var fr = new FileReader();
			fr.onload = function(){ onFinish(fr.result); };
			fr.readAsDataURL(blob);
		}
	};
	
	VideoBuilder.appendStruct = function(bb, s) {
		if (!s._order) {
			throw "Structured data must have '_order'";
		}
		
		var od = s._order;
		var len = od.length;
		for (var i = 0; i < len; i++) {
			var fieldName = od[i];
			var val = s[fieldName];
			var char = fieldName.charAt(0);
			switch(char) {
			case 'b': // BYTE
				var _abtempBYTE = new ArrayBuffer(1);
				var _u8tempBYTE = new Uint8Array(_abtempBYTE);
				_u8tempBYTE[0] = val;
				bb.append(_abtempBYTE);
				break;
			case 'c': // chars
				bb.append(val);
				break;
			case 'd': // DWORD
				var abtempDWORD = new ArrayBuffer(4);
				var u8tempDWORD = new Uint8Array(abtempDWORD);
				u8tempDWORD[0] =  val        & 0xff;
				u8tempDWORD[1] = (val >> 8)  & 0xff;
				u8tempDWORD[2] = (val >> 16) & 0xff;
				u8tempDWORD[3] = (val >> 24) & 0xff;
				bb.append(abtempDWORD);
				break;
			case 'w': // WORD
			case 'W': // WORD(BE)
				var abtempWORD = new ArrayBuffer(2);
				var u8tempWORD = new Uint8Array(abtempWORD);
				if (char === 'w') {
					u8tempWORD[0] =  val       & 0xff;
					u8tempWORD[1] = (val >> 8) & 0xff;
				} else {
					u8tempWORD[0] = (val >> 8) & 0xff;
					u8tempWORD[1] =  val       & 0xff;
				}
				bb.append(abtempWORD);
				break;
			case 'a': // Array of structured data
				var dlen = val.length;
				for (var j = 0; j < dlen; j++) {
					VideoBuilder.appendStruct(bb, val[j]);
				}
				break;
			case 'r': // Raw(ArrayBuffer)
				bb.append(val);
				break;
			case 's': // Structured data
				VideoBuilder.appendStruct(bb, val);
				break;
			case 'h': // Handler function
				val(bb);
				break;
			default:
				throw new TypeError("Unknown data type: "+fieldName);
				break;
			}
		}
	};
	
	VideoBuilder.createAVIStruct = function() {
		return {
			chRIFF: 'RIFF',
			chFourCC: 'AVI ',
			dwSize: 0,
			aData: null,
			_order: ['chRIFF', 'dwSize', 'chFourCC', 'aData']
		};
	};

	VideoBuilder.createAVIMainHeader = function() {
		return {
			chFourCC: 'avih',
			dwSize: 56,
			// -----
			dwMicroSecPerFrame: 66666,
			dwMaxBytesPerSec: 1000,
			dwPaddingGranularity: 0,
			dwFlags: AVIF_HASINDEX,
			// +16
			
			dwTotalFrames: 1,
			dwInitialFrames: 0,
			dwStreams: 1,
			dwSuggestedBufferSize: 0,
			// +32

			dwWidth: 10,
			dwHeight: 20,
			dwReserved1: 0,
			dwReserved2: 0,
			dwReserved3: 0,
			dwReserved4: 0,
			// +56
			
			_order: [
				'chFourCC', 'dwSize',
				'dwMicroSecPerFrame', 'dwMaxBytesPerSec', 'dwPaddingGranularity', 'dwFlags',
				'dwTotalFrames', 'dwInitialFrames', 'dwStreams', 'dwSuggestedBufferSize',
				'dwWidth', 'dwHeight', 'dwReserved1', 'dwReserved2', 'dwReserved3', 'dwReserved4'
			]
		};
	};

	VideoBuilder.createHeaderLIST = function() {
		return {
			chLIST: 'LIST',
			dwSize: 0,
			chFourCC: 'hdrl',
			aData: null,
			_order: ['chLIST', 'dwSize', 'chFourCC', 'aData']
		};
	};
	
	VideoBuilder.createMoviLIST = function() {
		return {
			chLIST: 'LIST',
			dwSize: 0,
			chFourCC: 'movi',
			aStreams: null,
			_order: ['chLIST', 'dwSize', 'chFourCC', 'aStreams']
		};
	};
	
	VideoBuilder.createMoviStream = function() {
		return {
			chType: '00dc',
			dwSize: 0,
			handler: null,
			_order: ['chType', 'dwSize', 'handler']
		}
	};

	VideoBuilder.createStreamHeaderLIST = function() {
		return {
			chLIST: 'LIST',
			dwSize: 0,
			chFourCC: 'strl',
			aList: null,
			_order: ['chLIST', 'dwSize', 'chFourCC', 'aList']
		};
	};

	VideoBuilder.createStreamFormat = function() {
		return {
			chFourCC: 'strf',
			dwSize: 0,
			sContent: null,
			_order: ['chFourCC', 'dwSize', 'sContent']
		};
	};
	
	VideoBuilder.createStreamHeader = function() {
		return {
			chFourCC: 'strh',
			dwSize: 56,
			chTypeFourCC: 'vids',
			chHandlerFourCC: 'mjpg',
			// +16
			
			dwFlags: 0,
			wPriority: 0,
			wLanguage: 0,
			dwInitialFrames: 0,
			dwScale: 66666,
			
			// +32
			dwRate: RateBase,
			dwStart: 0,
			dwLength: 0,
			dwSuggestedBufferSize: 0,
			// +48
			
			dwQuality: 10000,
			dwSampleSize: 0,
			wLeft: 0,
			wTop: 0,
			wRight: 0,
			wBottom: 0,
			// +64
			
			_order:[
				 'chFourCC', 'dwSize', 'chTypeFourCC', 'chHandlerFourCC',
				 'dwFlags', 'wPriority', 'wLanguage', 'dwInitialFrames', 'dwScale',
				 'dwRate', 'dwStart', 'dwLength', 'dwSuggestedBufferSize',
				 'dwQuality', 'dwSampleSize', 'wLeft', 'wTop', 'wRight', 'wBottom'
				]
		};
	};
	
	VideoBuilder.createBitmapHeader = function() {
		return {
			dwSize:    40,
			dwWidth:   10,
			dwHeight:  20,
			wPlanes:   1,
			wBitcount: 24,
			chCompression: 'MJPG',
			dwSizeImage: 600,
			dwXPelsPerMeter: 0,
			dwYPelsPerMeter: 0,
			dwClrUsed: 0,
			dwClrImportant: 0,
			_order: [
				'dwSize', 'dwWidth', 'dwHeight', 'wPlanes', 'wBitcount', 'chCompression', 
				'dwSizeImage', 'dwXPelsPerMeter', 'dwYPelsPerMeter', 'dwClrUsed', 'dwClrImportant'
			]
		}
	};


	VideoBuilder.createMJPEG = function() {
		return {
			W_SOI: 0xffd8,
			aSegments: null,
			W_EOI: 0xffd9,
			_order: ['dwSOI', 'aSegments', 'dwEOI']
		};
	};
	
	VideoBuilder.KnownMarkers = {
		0xC0: 'SOF0',
		0xC4: 'DHT',
		0xDA: 'SOS',
		0xDB: 'DQT',
		0xDD: 'DRI',
		0xE0: 'APP0'
	};

	// export
	global.VideoBuilder = VideoBuilder;
})(window);
