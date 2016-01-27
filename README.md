This plugin is based on http://ushiroad.com/mjpeg/

Javascript MotionJPEG/AVI builder (video-builder.js) enables you to save your canvas animation into a single avi file.

At first, generate VideoBuilder and setup.

    var builder = new VideoBuilder({
        width  : 640,
        height : 360,
        fps    : 30
    });

Next, add frames.

    draw();
    builder.addCanvasFrame(canvas);
    
    draw();
    builder.addCanvasFrame(canvas);
    
    draw();
    builder.addCanvasFrame(canvas);
    
     :
     :
     :

And then, finish to get URL for generated content.

    builder.finish(function(generatedURL) {
        open(generatedURL);
    });
