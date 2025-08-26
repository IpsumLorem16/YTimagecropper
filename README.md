# YouTube Thumbnail Cropper
A custom internal tool for scraping YouTube video thumbnails and cropping them to exact dimensions, with adjustable image quality.

<img src="images/screenshot.jpg" width="700">

This tool was created to solve the problem of uploading full-size YouTube thumbnails, which would often cut faces in half or trim important text. Previously, each video’s thumbnail URL had to be found manually and edited in Photoshop, which was time-consuming. This tool quickly grabs thumbnails, crops them to preserve faces and text, and adjusts image quality to exact dimensions.

You can try it out on the GitHub Pages demo. It automatically loads sample thumbnails and crops images to 800×600 px. You can also add any other video thumbnail using the input on the cropper tool. The Upload button adds all saved images to the file input within WordPress and uploads them automatically.

[Try the demo here](https://ipsumlorem16.github.io/YTimagecropper/)


It is not perfect. This tool was primarily designed to be embedded in the WordPress “Add Post” page. It is responsive enough for general use but was not optimized for small screens.