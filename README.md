This plugin is based on http://ushiroad.com/mjpeg/

Javascript MotionJPEG/AVI builder (video-builder.js) enables you to save your canvas animation into a single avi file.

At first, generate MotionJPEGBuilder and setup.

    var builder = new movbuilder.MotionJPEGBuilder();
    builder.setup(640 /* width  */ ,
                  360 /* height */ ,
                  30 /* FPS */ );

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

