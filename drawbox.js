(async function () {
    const isProd = document.body.classList.contains('wp-admin');
    const myApiData = window.myApiData || {};
    const secretApiKey = myApiData.youtubeApiKey || (await import('./config.local.js')).youtubeApiKey;
    const YOUTUBE_API_BASE = 'https://youtube.googleapis.com/youtube/v3/';
    const cropperToolEl = document.getElementById('cropperTool');
    const fileSizeTextEl = document.getElementById('readableSizeText');
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    const previewContainerEl = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    let isPreviewImageSaved = false; //prevent current preview image being 'deleted' (blob url revoked) if user has saved it.
    // let imageUrls = ['./videoThumbnails/maxresdefault(1).jpg', './videoThumbnails/maxresdefault(2).jpg', './videoThumbnails/maxresdefault(3).jpg'];
    
    
    let images = [];
    let selectedImage = new Image();
    selectedImage.crossOrigin = 'anonymous';

    const boxWidth = 800;
    const boxHeight = 600;
    let boxX = 100;
    let boxY = 0;
    let isDragging = false;

    // Store the original image dimensions
    let imgWidth, imgHeight;

    // Add selected image to canvas in cropper tool area.
    function drawImageWithOverlay() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Step 1: Draw the original image scaled to fit the canvas
        ctx.drawImage(selectedImage, 0, 0, canvas.width, canvas.height);

        // Step 2: Draw a semi-transparent overlay over the entire image
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Dark overlay with 70% opacity
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Step 3: Calculate scale ratios for correct cropping
        const xRatio = imgWidth / canvas.width;
        const yRatio = imgHeight / canvas.height;

        // Step 4: Redraw the original image ONLY in the clear box area (cropped to match the original size)
        ctx.drawImage(
            selectedImage,
            boxX * xRatio, boxY * yRatio, boxWidth * xRatio, boxHeight * yRatio, // Crop from the original image
            boxX, boxY, boxWidth, boxHeight  // Draw on the canvas at the same size
        );

        // Optional: Draw a red border around the clear box
        // ctx.strokeStyle = 'red';
        // ctx.lineWidth = 2;
        // ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    }

    /*
     *  Cropper logic
     *  Add interactivity to canvas cropper tool
     *  Allows user to drag selected area within canvas.
     */

    let offsetX = 0;  // Offset for dragging in the X direction

    // mousedown
    canvas.addEventListener('mousedown', (e) => {
        const { x: mouseX } = getMousePos(e);

        if (
            mouseX >= boxX &&
            mouseX <= boxX + boxWidth
        ) {
            isDragging = true;
            offsetX = mouseX - boxX;
            canvas.style.cursor = 'grabbing';
            // cropperToolEl.style.cursor = 'grabbing';
            cropperToolEl.classList.add('grabbing');
        }
        cropperToolEl.addEventListener('mouseleave', handleCropperToolMouseUp, { once: true });
        document.body.addEventListener('mouseup', handleCropperToolMouseUp, { once: true });
    });

    // mousemove
    canvas.addEventListener('mousemove', (e) => {
        const { x: mouseX, y: mouseY } = getMousePos(e);
        const isOverBox =
            mouseX >= boxX &&
            mouseX <= boxX + boxWidth &&
            mouseY >= boxY &&
            mouseY <= boxY + boxHeight;

        // Change cursor only when hovering over the box
        canvas.style.cursor = isOverBox ? 'grab' : 'default';



        if (isDragging) {
            let newPosition = mouseX - offsetX;
            if (newPosition < 0) { newPosition = 0 }
            if (newPosition > (canvas.width - boxWidth)) { newPosition = canvas.width - boxWidth }

            boxX = newPosition;
            canvas.style.cursor = 'grabbing'
            drawImageWithOverlay();
        }
    });

    // mouseup
    // canvas.addEventListener('mouseup', handleCropperToolMouseUp);

    function handleCropperToolMouseUp() {
        if (isDragging) {
            isDragging = false;
            captureBoxAsImage();
            // cropperToolEl.style.cursor = 'default';
            cropperToolEl.classList.remove('grabbing');
        }
    }

    // Gets relative mouse position, for a canvas resized with CSS.
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    /* 
     * Create jpg
     * From selected area and display in 'preview'
     */
    function captureBoxAsImage() {
        const xRatio = imgWidth / canvas.width;
        const yRatio = imgHeight / canvas.height;

        // Calculate the area of the original image corresponding to the box area
        const sourceX = boxX * xRatio;
        const sourceY = boxY * yRatio;
        const sourceWidth = boxWidth * xRatio;
        const sourceHeight = boxHeight * yRatio;

        // Create a temporary canvas to hold the cropped area
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = boxWidth;
        tempCanvas.height = boxHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the cropped area onto the temporary canvas
        tempCtx.drawImage(
            selectedImage,
            sourceX, sourceY, sourceWidth, sourceHeight, // Cropped area from the original image
            0, 0, boxWidth, boxHeight // Draw on the temp canvas at full size
        );

        // Convert the temporary canvas to a blob url
        tempCanvas.toBlob((blob) => {
            const imageURL = URL.createObjectURL(blob);

            if (!SavedImagesPanel.isPreviewImageSaved) {
                URL.revokeObjectURL(previewImage.src);
            }
            previewImage.src = imageURL;

            updateFileSizeText(blob.size); // Display filesize to user       
            SavedImagesPanel.isPreviewImageSaved = false;

            SavedImagesPanel.selectThumbnail(); //un-selecte saved images thumbnail, if any. 
        }, "image/jpeg", Number(qualityInput.value / 100));

    }

    /* Update filesize text */
    function updateFileSizeText(fileSize) {
        const readableSize = humanFileSize(fileSize);
        fileSizeTextEl.innerText = readableSize;
    }

    /* 
     *  Image Loader
     *  Pre-Loads images from url array, create new image object for each.
     *  Also populate thumbnails in cropper tool (via method call).
     */

    const ImageLoader = { 
        imageUrls: ['https://i.ytimg.com/vi/0GCuvcTI090/maxresdefault.jpg', 'https://i.ytimg.com/vi/-tBy2jemw4s/maxresdefault.jpg', 'https://i.ytimg.com/vi/nfpWAqK0YZE/maxresdefault.jpg'],
        hasFirstImgLoaded: false,
        
        getVideoThumbnailUrls: async function () { //Fetch video thumbnails urls for youtuber using Youtube API, add to imageURls.
            const channelId = await this.getChannelId();
            let apiURL = `${YOUTUBE_API_BASE}search?part=snippet&channelId=${channelId}&order=viewCount&maxResults=3&type=video&key=${secretApiKey}`;
            
            try {
                const response = await fetch(apiURL); //make api call for popular videos
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                //parse response, and update video urls array
                const data = await response.json();
                this.imageUrls = data.items.map(element => {
                    const videoId = element.id.videoId;
                    const thumbnailURL = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
                    return thumbnailURL;
                });
            } catch (error) {
                console.error('Fetch error:', error);
            }
        },
        loadVideoThumbnails: function() { //load video thumbnails from urls and add to cropper tool. 
            this.imageUrls.map(url => this.loadImage(url)
                .then(image => {
                    image.isFirst ? this.handleFirstImageLoaded(image) : addCropperThumbnail(image.url);
                })
            );
        },
        loadImage: function(url) { //Preload single Image and add to images array.
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = url;
                img.onload = () => {
                    images.push(img);
                    const isFirst = this.hasFirstImgLoaded ? false : true;
                    if (isFirst) this.hasFirstImgLoaded = true; // set boolean var, if this was the first image loaded
                    resolve({ url, image: img, isFirst })
                };
                img.onerror = reject;
            });
        },
        handleFirstImageLoaded: function(image) {
            selectImage(image,);
            addCropperThumbnail(image.url)
                .classList.add('selected');
        },
        getChannelId: async function(){ //Returns string, uses Youtube API if id not on page.
            const infoBox = document.querySelector('youtube_import_info-box');
            let channelId = infoBox?.getAttribute('data-channel-id');

            if (channelId?.length > 0) {
                return channelId;
            } 

            const accountName = document.querySelector('input[name="hp_account_name"]').value;
            let apiURL = `${YOUTUBE_API_BASE}channels?part=snippet%2CcontentDetails&forHandle=${accountName}&key=${secretApiKey}`

            try {
                const response = await fetch(apiURL);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                return data.items[0].id;
            } catch (error) {
                console.error('Fetch error:', error);
            }
        },
        init: async function() {
            // Load up video thumbnails. 
            if (isProd) await this.getVideoThumbnailUrls();
            this.loadVideoThumbnails();
        }
    };

    ImageLoader.init();

    // Add thumbnail (from pre-loaded image) in cropper.
    function addCropperThumbnail(imageUrl) {
        const thumbEl = document.querySelector('.cropper-tool__thumbnails img.hidden:nth-of-type(1)'); //select first hidden thumbnail image.
        thumbEl.src = imageUrl;
        thumbEl.classList.remove('hidden');

        thumbEl.addEventListener('click', (e) => {
            const target = e.target;
            selectImage(target.src, target.parentNode)
        })
        return thumbEl.parentNode;
    }

    // Add event listener for 'selected image'.
    selectedImage.onload = () => {
        imgWidth = selectedImage.width;
        imgHeight = selectedImage.height;
        drawImageWithOverlay();
        captureBoxAsImage();
    }

    // Select image, changes current image in cropper.
    function selectImage(image, thumbnailEl) {
        selectedImage.src = image.url || image || image.src;
        if (thumbnailEl) {
            thumbnailEl.parentNode.querySelector('.selected').classList.remove('selected');
            thumbnailEl.classList.add('selected');
        }
    }

    /*
     *  Quality slider.
     *  Set quality of final Cropped image.jpg (in perecentage).
     */
    const qualityInput = document.getElementById('qualityInput');
    const qualityOutput = document.getElementById('qualityOutput');
    const debouncedCaptureBoxAsImage = debounce(captureBoxAsImage, 300);
    let isMouseDown = false;

    qualityInput.addEventListener('input', (e) => {
        qualityOutput.value = `${qualityInput.value}%`
        if (!isMouseDown) { debouncedCaptureBoxAsImage(); }
    });

    qualityInput.addEventListener('mouseup', captureBoxAsImage)

    qualityInput.addEventListener('mousedown', () => {
        isMouseDown = true;
    })

    document.body.addEventListener('mouseup', () => {
        isMouseDown = false;
    })

    /*
     *  Save Image
     *  Saves the cropped image from the preview window, and diplays in saved images.
     */
    const SavedImagesPanel = {
        elements: {
            saveButtonEl: document.getElementById('saveButton'),
            savedThumbsEl: document.querySelector('.saved-images__thumbnails'),
            savedControlsEl: document.querySelector('.img-wrapper__controls'),
        },
        //State
        images: [],
        isPreviewImageSaved: false,

        //Event listener handlers
        handleSaveBtnClick(e) {
            this.addSavedImgThumbnail(previewImage);
            this.saveImage(previewImage);
            console.log(this.images);
        },
        handleDeleteBtnClick(e) {
            const buttonEl = e.target;
            const imgWrapperEl = buttonEl.parentNode.parentNode;
            const imgSrc = imgWrapperEl.querySelector('img').src;

            buttonEl.disabled = true; //stop it being pressed again.
            buttonEl.remove();

            imgWrapperEl.classList.add('fade-out-shrink'); //animate thumbnail offscreen

            // on animation end, delete it.
            imgWrapperEl.addEventListener('animationend', () => {
                imgWrapperEl.remove();
                this.deleteSavedImg(imgSrc);
                if (previewImage.src === imgSrc) {
                    captureBoxAsImage();
                }
            }, { once: true })
        },

        //Functions
        saveImage(image) {
            this.isPreviewImageSaved = true; // set flag, current displayed image is saved, and not to revoke blob-url.
            this.images.push(image.src);
        },
        deleteSavedImg(imageUrl) {
            this.images = this.images.filter(item => item !== imageUrl); //remove the matching image form array.
            // URL.revokeObjectURL(imageUrl);//bug, if user clicks save twice on same image in preview, duplicate bloblurl is added to images panel. if one is then deleted, the other is now not viewable.
        },
        addSavedImgThumbnail(image) {
            const controlEl = this.elements.savedControlsEl.cloneNode(true); //clone controls element, hidden on page (to save messy HTML in JS here.)
            const deleteBtnEl = controlEl.querySelector('.delete-btn');
            const imgWraperEl = document.createElement('span');
            const imgEl = document.createElement('img');
            const fileSizeText = fileSizeTextEl.innerText;

            imgEl.src = image.src;
            imgEl.setAttribute('data-filesize', fileSizeText);

            imgWraperEl.className = 'img-wrapper';
            imgWraperEl.appendChild(imgEl);
            imgWraperEl.appendChild(controlEl);

            // Set up event listeners
            imgEl.addEventListener('click', (e) => { this.previewSavedImg(e.target) }); //make image show in preview on click
            deleteBtnEl.addEventListener('click', this.handleDeleteBtnClick.bind(this))

            this.elements.savedThumbsEl.prepend(imgWraperEl); //add constructed element to saved-images on page

        },
        previewSavedImg(image) {
            this.selectThumbnail(image);
            fileSizeTextEl.innerText = image.getAttribute('data-filesize');
            previewImage.src = image.src;
            this.isPreviewImageSaved = true; // set flag, current displayed image is saved, and not to revoke blob-url.
        },
        selectThumbnail(image = false) {
            const imgWrapperEl = image?.parentNode;
            const selectedThumbEl = this.elements.savedThumbsEl.querySelector('.selected');

            selectedThumbEl?.classList.remove('selected');
            imgWrapperEl?.classList.add('selected');

            // Apply or remove styling to preview section
            (image == false) ? previewContainerEl.classList.remove('viewing-saved') : previewContainerEl.classList.add('viewing-saved');
            (image == false) ? qualityInput.disabled = false : qualityInput.disabled = true;
        },
        init() {
            this.elements.saveButtonEl.addEventListener('click', this.handleSaveBtnClick.bind(this));
            this.UploadButton.init();
        },
        UploadButton: {
            buttonEl: document.querySelector('.saved-images__upload-btn'),
            // inputEl: document.querySelector('.hp-field--attachment-upload input[name="hp_images"]'),
            enable() {
                this.buttonEl.disabled = false;
                this.setLoading(false);
            },
            disable() {
                this.buttonEl.disabled = true;
            },
            setLoading(isLoading){
                this.buttonEl.classList.toggle('loading', isLoading);
            },
            handleClick() {
                this.disable();
                this.setLoading(true);
                // Simulate uploading if not in production.
                console.log(isProd);
                (isProd) ? this.uploadSavedImages() : setTimeout(() => {SavedImagesPanel.UploadButton.enable()}, 1000);
            },
            async uploadSavedImages() {
                console.log('saved images uploading');

                try {
                    const inputEl = document.querySelector('.hp-field--attachment-upload input[name="hp_images"]');
                    const accountName = document.querySelector('input[name="hp_account_name"]').value;

                    const dataTransfer = new DataTransfer(); // single DataTransfer for all files

                    // Add all images to DataTransfer
                    for (let index = 0; index < SavedImagesPanel.images.length; index++) {
                        const image = SavedImagesPanel.images[index];
                        const id = crypto.randomUUID();
                        const file = await blobUrlToFile(image, `${accountName}VidThumb_${id}.jpg`);
                        dataTransfer.items.add(file);
                    }

                    // Assign all files to the input at once
                    inputEl.files = dataTransfer.files;
                    // Dispatch change event AFTER all files are added
                    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
                    console.log("All files added to input:", inputEl.files);
                } catch (error) {
                    console.log(error);
                };
            },
            init() {
                this.buttonEl.addEventListener('click', this.handleClick.bind(this));
                if (isProd){
                    const wpUploadBtnEl = document.querySelector('.hp-field--attachment-upload button');
                    // Observe changes on file input
                    new MutationObserver(() => {
                        if (wpUploadBtnEl.getAttribute("data-state") !== "loading") {
                            this.enable();
                        }
                    }).observe(wpUploadBtnEl, { attributes: true, attributeFilter: ["data-state"] });

                }
            }
        },
    }

    SavedImagesPanel.init();

    /* Upload saved images to wordpress, and save in post */
    // async function uploadSavedImages() {
    //     console.log('saved images uploading');

    //     try {
    //         const inputEl = document.querySelector('.hp-field--attachment-upload input[name="hp_images"]');
    //         const accountName = document.querySelector('input[name="hp_account_name"]').value;

    //         const dataTransfer = new DataTransfer(); // single DataTransfer for all files

    //         // Add all images to DataTransfer
    //         for (let index = 0; index < SavedImagesPanel.images.length; index++) {
    //             const image = SavedImagesPanel.images[index];
    //             const id = crypto.randomUUID();
    //             const file = await blobUrlToFile(image, `${accountName}VidThumb_${id}.jpg`);
    //             dataTransfer.items.add(file);
    //         }

    //         // Assign all files to the input at once
    //         inputEl.files = dataTransfer.files;

    //         // Dispatch change event AFTER all files are added
    //         inputEl.dispatchEvent(new Event("change", { bubbles: true }));

    //         console.log("All files added to input:", inputEl.files);

    //     } catch (error) {
    //         console.log(error);
    //     }
    // }

    // temporary add upload on saved images header click
    // const headerEl = document.querySelector('.saved-images__header h2');
    // headerEl.addEventListener('click', uploadSavedImages);

    /* 
     *  Helper functions 
     */
    // Turn blob into actual file
    async function blobUrlToFile(blobUrl, fileName) {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new File([blob], fileName, { type: blob.type });
    }

    // Debounce for input events
    // We don't want to continously create images on changing some inputs, that could be too rescource intensive
    function debounce(callback, delay = 300) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => callback.apply(this, args), delay);
        };
    }


    /**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
    function humanFileSize(bytes, si = true, dp = 1) {
        const thresh = si ? 1000 : 1024;

        if (Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }

        const units = si
            ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
            : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        let u = -1;
        const r = 10 ** dp;

        do {
            bytes /= thresh;
            ++u;
        } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


        return bytes.toFixed(dp) + ' ' + units[u];
    }
})();