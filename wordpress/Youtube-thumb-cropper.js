(function () {

    const CropperLoader = {
        htmlUrl: 'https://ylisted.com/wp-content/themes/listinghive-child/html/Youtube-thumb-cropper.html',
        isHTMLLoaded: false,
        appHTML: null,
        imagesContainerEl: document.getElementById('hp_listing_images'),

        init() {
            this.getAppHTML();
            this.deleteCropperBtns();
            this.addOpenCropperBtn();
        },

        addOpenCropperBtn() {
            const buttonEl = document.createElement('button');
            buttonEl.classList.add('yt-cropper-loader-btn');
            buttonEl.setAttribute('type', 'button');
            buttonEl.innerText = 'open image scraper & cropper tool';
            this.imagesContainerEl.appendChild(buttonEl);

            buttonEl.addEventListener('click', () => {
                this.addAppHTML();
                import('http://127.0.0.1:5500/drawbox.js');
            });
        },

        deleteCropperBtns() {
            const btns = this.imagesContainerEl.querySelectorAll('.yt-cropper-loader-btn');
            btns.forEach(el => el.remove());
        },

        removeAppHTML() {
            const appEl = document.getElementById('youtube_thumb_cropper');
            if (appEl) appEl.remove();
        },

        async getAppHTML() {
            try {
                const response = await fetch(this.htmlUrl);
                if (!response.ok) throw new Error(`Response status: ${response.status}`);
                this.appHTML = await response.text();
                this.isHTMLLoaded = true;
            } catch (error) {
                console.error('Failed to load cropper HTML:', error.message);
            }
        },

        addAppHTML() {
            if (!this.isHTMLLoaded || !this.appHTML) {
                console.warn('Cropper HTML is not yet loaded.');
                return;
            }

            this.removeAppHTML();

            const appEl = document.createElement('div');
            appEl.id = 'youtube_thumb_cropper';
            appEl.innerHTML = this.appHTML;

            const previewImg = appEl.querySelector('.preview-image');
            if (previewImg) previewImg.src = this.createBlankPreviewImg();

            this.imagesContainerEl.appendChild(appEl);
        },

        createBlankPreviewImg(width = 800, height = 600) {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="white"/></svg>`;
            return 'data:image/svg+xml;base64,' + btoa(svg);
        }
    };

    // Initialize
    CropperLoader.init();



})(); //end of IIFE

