(function() {
	var BOX_SIZE_BASE = 28;
	var jQuery = Zepto;

	function BoxStack(targetCanvas) {
		this.width  = 640;
		this.height = 360;
		this.ptns = [];
		targetCanvas.setAttribute('width', this.width);
		targetCanvas.setAttribute('height', this.height);
		this.targetCanvas = targetCanvas;
		this.g = targetCanvas.getContext('2d');
	
		this.worldAABB = new b2AABB();
		this.worldAABB.minVertex.Set(-1000, -1000);
		this.worldAABB.maxVertex.Set(1000, 1000);
		this.newWorld();

		this.boxDef = new b2BoxDef();
		this.boxBody = new b2BodyDef();
		this.boxBody.AddShape(this.boxDef);
		this.boxDef.density = 1.5;
		this.boxDef.friction = 0.3;
		this.boxDef.restitution = 0.9;
		this.offsetY = 0;
	}
	
	BoxStack.prototype = {
		newWorld: function() {
			this.gravity = new b2Vec2(0, 300);
			var doSleep = true;
			this.world = new b2World(this.worldAABB, this.gravity, doSleep);
			this.createGround();
		},
	
		putBox: function(cx, cy, sz, clrRow) {
			this.boxDef.extents.Set(sz, sz);
			this.boxBody.position.Set(cx, cy);
			var vF = new b2Vec2((this.width/2 - cx) * 400.0, -(this.height/1.1 - cy + Math.random()*sz*3) * 1300.0);
			var b = this.world.CreateBody(this.boxBody);
			b.myData = {
				additionalForce: vF,
				color: (clrRow || 0) % 4
			};
		},
		
		addFillPattern: function(tex) {
			this.ptns.push( this.g.createPattern(tex, '') );
		},
		
		setGlyphSprite: function(img, chipW, chipH) {
			var cv = document.createElement('canvas');
			cv.setAttribute('width', img.width);
			cv.setAttribute('height', img.height);
			var g = cv.getContext('2d');
			g.drawImage(img, 0, 0);
			var imgdat = g.getImageData(0, 0, img.width, img.height);
			this.GlyphSprite = {
				imageWidth: img.width, 
				pixels: imgdat.data,
				chipWidth: chipW,
				chipHeight: chipH
			};
		},
		
		putGlyphBoxes: function(index, sx, sy, boxSize, clrIndex) {
			var p = this.GlyphSprite.pixels;
			var w = this.GlyphSprite.chipWidth;
			var h = this.GlyphSprite.chipHeight;
			var pitch = this.GlyphSprite.imageWidth;
			var baseX = this.GlyphSprite.chipWidth * index;
			for (var y = 0;y < h;y++) {
				for (var x = 0;x < w;x++) {
					var k = p[((x+baseX + y*pitch)<<2) + 1];
					if (k > 100) {
						this.putBox(sx + x*boxSize, sy + y*boxSize, (boxSize>>1)-1, clrIndex);
					}
				}
			}
		},
	
		createGround: function(world) {
			var groundSd = new b2BoxDef();
			groundSd.extents.Set(this.width/2.2, 4);
			groundSd.restitution = 1.6;
			var groundBd = new b2BodyDef();
			groundBd.AddShape(groundSd);
			groundBd.position.Set(this.width/2, 350);
			return this.world.CreateBody(groundBd)
		},
		
		clear: function() {
			this.newWorld();
		},
		
		tick: function() {
			var w = this.world;
			for (var b = w.m_bodyList; b; b = b.m_next) {
				if (b.myData) {
					b.myData.additionalForce.x *= 0.9;
					b.myData.additionalForce.y *= 0.9;
					b.ApplyForce(b.myData.additionalForce, b.m_position);
				}
			}

			this.world.Step(0.04, 3);
			this.render();
		},
		
		render: function() {
			this.g.fillStyle = this.ptns[0];
			this.g.fillRect(0, 0, this.width, this.height);
		
			var w = this.world;
			for (var b = w.m_bodyList; b; b = b.m_next) {
				var clr = 0;
				if (b.myData) {
					clr = b.myData.color;
				}
				for (var s = b.GetShapeList(); s != null; s = s.GetNext()) {
					this.drawShape(s, clr);
				}
			}
		},
		
		drawShape: function(sh, clrIndex) {
			if (sh.m_type != b2Shape.e_polyShape) {
				throw "bad shape!";
			}
			
			var g = this.g;
			g.save();
			g.translate(0, this.offsetY);
			g.fillStyle = this.ptns[1+clrIndex];
			g.globalAlpha = 0.3;
			var v0, i, k;
			for (k = 0;k < 6;k++) {
				g.save();
				g.translate((k%3)-1, (k/2)-1);
				g.beginPath();
				for (i = 0;i < 4;i++) {
					var v = b2Math.AddVV(sh.m_position, b2Math.b2MulMV(sh.m_R, sh.m_vertices[i]));
					if (i == 0) {
						v0 = v;
						g.moveTo(v.x, v.y);
					} else {
						g.lineTo(v.x, v.y);
					}
				}
				g.clip();
				g.closePath();
				g.fillRect(0, 0, this.width, this.height);
				g.restore();
			}
			
			g.restore();
		}
	};

	var bxs;
	var mBuilder;
	var renderCanvas;
	var TextureList = [];
	var running = false;
	var restFrames = 0;
	var allFrames, drawnFrames;
	var currentText = null;

	function preload(ls, onFinish) {
		var nLoaded = 0;
		var count = ls.length;
		for (var i = 0;i < count;i++) {
			(function(url) {
				var img = new Image();
				TextureList.push(img);
				img.onload = function() {
					if (++nLoaded >= count) {
						onFinish();
					}
				};
				
				img.src = url;
			})(ls[i]);
		}
	}

	function setupMain() {
		var enter_text = function(){updateText(true);} ;
	
		jQuery('#board-text').keydown(function(e){
			if (e.keyCode == 13) { enter_text(); }
		});
		jQuery('#btn-preview').click(enter_text);
		jQuery('#btn-generate').click(function() {
			if (running) { return; }
			
			updateLink();
			updateText();
			running = true;
			allFrames = restFrames = 80;
			drawnFrames = 0;
			
			mBuilder = new VideoBuilder();
			mBuilder.setup({ width: bxs.width, height: bxs.height, fps: 30 });
			for (var i = 0;i < 30;i++) {
				mBuilder.addCanvasFrame(bxs.targetCanvas);
			}
			generateFrame();
		});
		
		updateText();
	}
	
	var AVAIL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?";
	function updateText(force_change) {
		if (running) {
			return;
		}

		var str = jQuery('#board-text').val().toUpperCase();
		if (currentText == str && !force_change) {return;}

		bxs.clear();
		currentText = str;
		var len = str.length;
		
		var spacing = 17 - len*2;
		var bsize = BOX_SIZE_BASE - len*2;
		var chrW = bsize*6;
		var chrH = bsize*8;
		var wholeW = (len-1)*spacing + chrW * len;
		var baseX = bxs.width/2 - wholeW/2;
		for (var i = 0;i < len;i++) {
			var index = AVAIL_CHARS.indexOf(str.charAt(i));
			if (index >= 0) {
				bxs.putGlyphBoxes(index, baseX + (chrW + spacing)*i, 258-chrH, bsize, Math.floor(Math.random()*3.9));
			}
		}
	
		bxs.offsetY = (len>0) ? (-bsize/2*(len-1)) : 0;
		bxs.render();
	}
	
	function generateFrame() {
		bxs.tick();
		mBuilder.addCanvasFrame(bxs.targetCanvas);
		if (restFrames > 0) {
			renderProgress(bxs.g, 'Rendering... '+ drawnFrames+'/'+allFrames);
			++drawnFrames;
			--restFrames;
			setTimeout(generateFrame, 1);
		} else {
			finishFrames();
		}
	}
	
	function finishFrames() {
		renderProgress(bxs.g, 'Ready for download!');
		mBuilder.finish(function(generatedURL) {
			updateLink(generatedURL);
		});
		running = false;
		currentText = null;
	}

	function renderProgress(g, msg) {
	
		g.font = "bold 24px Arial";
		g.textAlign = "left";
		g.textBaseline = "bottom";

		g.fillStyle = "#000";
		g.fillText(msg, 3, 31);
		
		g.fillStyle = "#fff";
		g.fillText(msg, 3, 30);
	}
		
	function updateLink(url) {
		jQuery('#gen-download')
			.attr('href', url || null)
			.css('opacity', url ? '1' : '');
	}

	window.launch = function() {
		preload(["images/grphs.png", "images/tex-bboard.png", 
		         "images/ch_w.png", "images/ch_y.png", "images/ch_r.png", "images/ch_b.png"], function(){
			renderCanvas = document.getElementById('cv1');
			bxs = new BoxStack(renderCanvas);
			bxs.setGlyphSprite(TextureList[0], 8, 12);
			bxs.addFillPattern(TextureList[1]);
			bxs.addFillPattern(TextureList[2]);
			bxs.addFillPattern(TextureList[3]);
			bxs.addFillPattern(TextureList[4]);
			bxs.addFillPattern(TextureList[5]);
			bxs.render();
			setupMain();
/*			
			bxs.putGlyphBoxes(1, 20, 50, 16);
			bxs.putGlyphBoxes(9, 130, 50, 16);
			bxs.putGlyphBoxes(22, 240, 50, 16);
			bxs.putGlyphBoxes(24, 350, 50, 16);
			
			var count = 120;
			function advance(){
				bxs.tick();g
				if (--count > 0) {
					setTimeout(advance, 10);
				}
			}
		
			advance();
*/
		});

/*
		var cv = document.createElement('canvas');
		var g = cv.getContext('2d');
		cv.width  = 320;
		cv.height = 240;
		document.body.appendChild(cv);
		
		for (var i = 0;i < 60;i++) {
			g.fillStyle = "#ff"+(i%10);
			g.fillRect(0, 0, 320, 240);
			
			g.fillStyle = "#000";
			g.fillRect(i+4, 20, 32, 32);
			
			jb.addCanvasFrame(cv);
		}

		jb.finish();
		jb.build(function(generatedURL) {
			console.log(generatedURL)
		});
		*/
	};
})();
